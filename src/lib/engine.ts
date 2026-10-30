import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { translate } from "@/lib/rules";
import { renderTemplate, instrument, textVersion, couponPools, type RenderCtx } from "@/lib/render";
import { getCoupon } from "@/lib/coupons";
import { sendEmail } from "@/lib/ses";
import { getSetting } from "@/lib/settings";

const APP = () => process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz";
type Email = { name: string; subject: string; previewText: string | null; templateId: number | null; status: string; ourTemplateId?: number | null; enabled?: boolean };
type Step = { id: string; type: string; links: Record<string, string | null>; email?: Email; variants?: Email[]; delay?: { unit: string; value: number; delay_until_time?: string; timezone?: string }; condition?: { profile_filter?: { condition_groups?: [] } } };
type Def = { entry: string; profileFilter?: { condition_groups?: [] } | null; steps: Step[] };

const unitMs: Record<string, number> = { minutes: 60e3, hours: 3600e3, days: 86400e3, weeks: 7 * 86400e3 };

/** Evaluate a Klaviyo-style profile filter for one contact; `since` resolves "flow-start" timeframes. */
async function evalFilter(filter: { condition_groups?: [] } | null | undefined, contactId: number, since: Date | null): Promise<boolean> {
  if (!filter?.condition_groups?.length) return true;
  const t = translate(filter);
  if (!t.sql) return true; // unsupported → don't block
  let where = t.sql;
  if (since) where = where.replace(/\(select count\(\*\) from orders o where o\.contact_id = c\.id \)/g, `(select count(*) from orders o where o.contact_id = c.id and o.placed_at >= '${since.toISOString()}')`);
  const r = await sql.query(`select 1 from contacts c where c.id = $1 and (${where}) limit 1`, [contactId]);
  return r.length > 0;
}

export async function startFlow(flowId: number, contactId: number, triggerRef: string | null, context: Record<string, unknown> = {}) {
  const [f] = await sql`select id, status, definition, name from flows where id = ${flowId}`;
  if (!f || f.status !== "live") return null;
  const def = f.definition as Def;
  const [c] = await sql`select status from contacts where id = ${contactId}`;
  if (!c || c.status !== "subscribed") return null;
  if (!(await evalFilter(def.profileFilter, contactId, null))) return null;
  try {
    const [run] = await sql`insert into flow_runs (flow_id, contact_id, step_id, trigger_ref, next_at, status, context)
      values (${flowId}, ${contactId}, ${def.entry}, ${triggerRef}, now(), 'active', ${JSON.stringify(context)}::jsonb)
      on conflict do nothing returning id`;
    return run?.id ?? null;
  } catch { return null; }
}

async function sendStep(run: { id: number; flow_id: number; contact_id: number; created_at: Date; context: Record<string, unknown> }, step: Step, email: Email) {
  const tplId = email.ourTemplateId ?? email.templateId;
  if (!tplId) return;
  const [t] = await sql`select html, subject, preview_text, from_name, from_email, reply_to from templates where id = ${tplId}`;
  const [c] = await sql`select id, email, first_name, status, unsubscribe_token from contacts where id = ${run.contact_id}`;
  if (!t?.html || !c || c.status !== "subscribed") return;
  const token = randomBytes(10).toString("hex");
  const ctx: RenderCtx = {
    first_name: c.first_name, email: c.email, token, unsubscribe_url: `${APP()}/u/${c.unsubscribe_token}`,
    checkout: (run.context.checkout as RenderCtx["checkout"]) ?? null, order: (run.context.order as RenderCtx["order"]) ?? null, products: (run.context.products as RenderCtx["products"]) ?? [],
  };
  const coupons: Record<string, string> = {};
  for (const pool of couponPools(t.html)) { try { coupons[pool] = await getCoupon(pool, c.id); } catch (e) { console.error("coupon", pool, (e as Error).message); } }
  ctx.coupons = coupons;
  const html = instrument(renderTemplate(t.html, ctx), token);
  await sql`insert into send_queue (contact_id, flow_id, flow_run_id, template_id, step_id, token, subject, preview_text, html, from_name, from_email, status)
    values (${c.id}, ${run.flow_id}, ${run.id}, ${tplId}, ${step.id}, ${token}, ${renderTemplate(email.subject ?? t.subject ?? "", ctx)}, ${email.previewText ?? t.preview_text ?? null}, ${html}, ${t.from_name ?? "Bluebells Cakery"}, ${process.env.SES_FROM_EMAIL ?? t.from_email}, 'queued')`;
}

/** Advance all due flow runs. */
export async function tickFlows(limit = 200) {
  const runs = await sql`select r.id, r.flow_id, r.contact_id, r.step_id, r.created_at, r.context, f.definition from flow_runs r join flows f on f.id = r.flow_id
    where r.status = 'active' and r.next_at <= now() and f.status = 'live' order by r.next_at limit ${limit}`;
  let n = 0;
  for (const run of runs) {
    const def = run.definition as Def; const byId = new Map(def.steps.map(s => [s.id, s]));
    let stepId: string | null = run.step_id; let guard = 0;
    while (stepId && guard++ < 50) {
      const s = byId.get(stepId); if (!s) { stepId = null; break; }
      if (s.type === "time-delay" && s.delay) {
        const ms = (unitMs[s.delay.unit] ?? 86400e3) * Number(s.delay.value);
        let next = new Date(Date.now() + ms);
        if (s.delay.delay_until_time) { // snap to NZ local time-of-day
          const [hh, mm] = s.delay.delay_until_time.split(":").map(Number);
          const nz = new Date(next.toLocaleString("en-US", { timeZone: "Pacific/Auckland" })); const diffMs = next.getTime() - nz.getTime();
          nz.setHours(hh, mm ?? 0, 0, 0); next = new Date(nz.getTime() + diffMs); if (next.getTime() < Date.now()) next = new Date(next.getTime() + 86400e3);
        }
        await sql`update flow_runs set step_id = ${s.links.next ?? null}, next_at = ${next.toISOString()} where id = ${run.id}`;
        if (!s.links.next) await sql`update flow_runs set status = 'done', finished_at = now() where id = ${run.id}`;
        stepId = null; break; // wait
      }
      if (s.type === "send-email" || s.type === "ab-test") {
        const email = s.email;
        if (email && (email.enabled ?? email.status === "live")) await sendStep(run as never, s, email);
        stepId = s.links.next ?? null; continue;
      }
      if (s.type === "conditional-split" || s.type === "trigger-split") {
        const ok = await evalFilter(s.condition?.profile_filter, run.contact_id, new Date(run.created_at));
        stepId = (ok ? s.links.next_if_true : s.links.next_if_false) ?? null; continue;
      }
      stepId = s.links.next ?? null;
    }
    if (stepId === null) {
      const [cur] = await sql`select step_id, next_at from flow_runs where id = ${run.id}`;
      if (cur.next_at <= new Date()) await sql`update flow_runs set status = 'done', step_id = null, finished_at = now() where id = ${run.id}`;
    }
    n++;
  }
  return n;
}

/** Send queued emails via SES, honouring engine mode: shadow (skip), test (allowlist only), live. */
export async function processQueue(limit = 50) {
  const mode = (await getSetting("engine_mode")) ?? "shadow";
  const allow = ((await getSetting("test_emails")) ?? "ryan@bluebellscakery.co.nz").split(/[,\s]+/).filter(Boolean).map(s => s.toLowerCase());
  const rows = await sql`select q.id, q.contact_id, q.subject, q.html, q.from_name, q.from_email, q.flow_id, q.campaign_id, c.email, c.status, c.unsubscribe_token
    from send_queue q join contacts c on c.id = q.contact_id where q.status = 'queued' and q.send_after <= now() order by q.id limit ${limit}`;
  let sent = 0, skipped = 0;
  const work = async (r: (typeof rows)[number]) => {
    const suppressed = (await sql`select 1 from suppressions where email = ${r.email}`).length > 0;
    if (r.status !== "subscribed" || suppressed) { await sql`update send_queue set status = 'skipped', error = 'not subscribed / suppressed' where id = ${r.id}`; skipped++; return; }
    if (mode === "shadow" || (mode === "test" && !allow.includes(String(r.email).toLowerCase()))) { await sql`update send_queue set status = 'skipped', error = ${"engine mode " + mode} where id = ${r.id}`; skipped++; return; }
    try {
      const id = await sendEmail({ to: r.email, subject: r.subject, html: r.html, text: textVersion(r.html), fromName: r.from_name ?? undefined, fromEmail: r.from_email ?? undefined, replyTo: "orders@bluebellscakery.co.nz", unsubscribeUrl: `${APP()}/u/${r.unsubscribe_token}`, tags: { flow: String(r.flow_id ?? ""), campaign: String(r.campaign_id ?? "") } });
      await sql`update send_queue set status = 'sent', sent_at = now(), ses_message_id = ${id}, attempts = attempts + 1 where id = ${r.id}`;
      await sql`insert into events (contact_id, send_id, flow_id, campaign_id, type, source) values (${r.contact_id}, ${r.id}, ${r.flow_id}, ${r.campaign_id}, 'sent', 'app')`;
      sent++;
    } catch (e) {
      await sql`update send_queue set attempts = attempts + 1, error = ${(e as Error).message}, status = case when attempts >= 2 then 'failed' else 'queued' end, send_after = now() + interval '10 minutes' where id = ${r.id}`;
    }
  };
  for (let i = 0; i < rows.length; i += 8) await Promise.all(rows.slice(i, i + 8).map(work));
  return { mode, sent, skipped };
}
