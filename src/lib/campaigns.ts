import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { translate } from "@/lib/rules";
import { renderTemplate, instrument, couponPools, type RenderCtx } from "@/lib/render";
import { getCoupon } from "@/lib/coupons";

const APP = () => process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz";
export type Audience = { include: "subscribed" | "segments"; segment_ids: number[]; exclude_segment_ids: number[] };

/** SQL predicate for an audience over contacts c. */
export async function audienceWhere(a: Audience): Promise<string> {
  const parts = ["c.status = 'subscribed'", "not exists (select 1 from suppressions s where s.email = c.email)"];
  const segSql = async (ids: number[]) => { const out: string[] = []; for (const id of ids) { const [s] = await sql`select definition from segments where id = ${id}`; const t = translate(s?.definition); if (t.sql) out.push(`(${t.sql})`); } return out; };
  if (a.include === "segments" && a.segment_ids.length) { const inc = await segSql(a.segment_ids); if (inc.length) parts.push(`(${inc.join(" OR ")})`); }
  if (a.exclude_segment_ids.length) { const exc = await segSql(a.exclude_segment_ids); if (exc.length) parts.push(`not (${exc.join(" OR ")})`); }
  return parts.join(" AND ");
}

export async function audienceCount(a: Audience) {
  const where = await audienceWhere(a);
  return Number((await sql.query(`select count(*)::int n from contacts c where ${where}`))[0].n);
}

/** Renders + queues the campaign for every recipient. Runs in batches so it fits in a serverless call; call repeatedly until done. */
export async function queueCampaign(campaignId: number, batch = 500, opts: { softLaunch?: boolean } = {}): Promise<{ queued: number; done: boolean }> {
  const [c] = await sql`select * from campaigns where id = ${campaignId}`;
  // softLaunch: queue `batch` random recipients from a draft without changing its status; a later full send skips them (not-exists below).
  if (!c || !(opts.softLaunch ? c.status === "draft" : ["scheduled", "sending"].includes(c.status))) return { queued: 0, done: true };
  if (!c.html) throw new Error("campaign has no HTML");
  const where = await audienceWhere(c.audience as Audience);
  const rows = await sql.query(`select c.id, c.email, c.first_name, c.unsubscribe_token from contacts c where ${where}
    and not exists (select 1 from send_queue q where q.campaign_id = $1 and q.contact_id = c.id) order by ${opts.softLaunch ? "random()" : "c.id"} limit $2`, [campaignId, batch]);
  if (c.status === "scheduled") await sql`update campaigns set status = 'sending', queued_at = now() where id = ${campaignId}`;
  const pools = couponPools(c.html);
  const values = [];
  for (const r of rows) {
    const token = randomBytes(10).toString("hex");
    const coupons: Record<string, string> = {};
    for (const p of pools) { try { coupons[p] = await getCoupon(p, r.id); } catch { /* skip */ } }
    const ctx: RenderCtx = { first_name: r.first_name, email: r.email, token, unsubscribe_url: `${APP()}/u/${r.unsubscribe_token}`, coupons };
    values.push({ contact_id: r.id, campaign_id: campaignId, template_id: c.template_id, token, subject: renderTemplate(c.subject ?? "", ctx), preview_text: c.preview_text, html: instrument(renderTemplate(c.html, ctx), token), from_name: c.from_name ?? "Bluebells Cakery", from_email: c.from_email ?? process.env.SES_FROM_EMAIL ?? null, send_after: c.scheduled_at ?? new Date().toISOString() });
  }
  if (values.length) await sql`insert into send_queue (contact_id, campaign_id, template_id, token, subject, preview_text, html, from_name, from_email, send_after, status)
    select contact_id, campaign_id, template_id, token, subject, preview_text, html, from_name, from_email, send_after::timestamptz, 'queued'
    from json_populate_recordset(null::send_queue, ${JSON.stringify(values)}::json)`;
  const done = rows.length < batch;
  if (done && !opts.softLaunch) await sql`update campaigns set recipient_count = (select count(*) from send_queue where campaign_id = ${campaignId}) where id = ${campaignId}`;
  return { queued: values.length, done };
}

/** Called by the cron tick: queue any scheduled campaigns whose time has come, and mark sending→sent when the queue drains. */
export async function tickCampaigns() {
  const due = await sql`select id from campaigns where (status = 'scheduled' and (scheduled_at is null or scheduled_at <= now())) or status = 'sending' order by id`;
  let total = 0;
  for (const c of due) {
    const r = await queueCampaign(c.id, 400); total += r.queued;
    if (r.done) { const [left] = await sql`select count(*)::int n from send_queue where campaign_id = ${c.id} and status = 'queued'`; if (left.n === 0) await sql`update campaigns set status = 'sent', sent_at = coalesce(sent_at, now()) where id = ${c.id}`; }
    if (total >= 800) break;
  }
  return total;
}
