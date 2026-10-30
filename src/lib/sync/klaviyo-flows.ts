import { sql } from "@/lib/db";
import { kget, importKlaviyoTemplate } from "./klaviyo-templates";

export const METRICS: Record<string, string> = {
  QWGLHG: "Placed Order", RTHDqC: "Form submitted", Y8qiKC: "Checkout Started", XyZ4Wc: "Added to Cart", V5WjZT: "Viewed Product",
  WfmaTK: "Opened Email", Thwsvq: "Clicked Email", Y3M4qe: "Received Email", UFh4eM: "Subscribed to Email Marketing", R6rhdP: "Subscribed to List",
  Rv6yYV: "Active on Site", TYQMYN: "Active on Site", WWZtRL: "Ordered Product", SK8Eeb: "Cancelled Order", WjYrf9: "Refunded Order", UxyxJE: "Fulfilled Order",
  SWQFq3: "Unsubscribed from Email Marketing", QYuwQL: "Marked Email as Spam", SLUqmf: "Bounced Email", XC8P9q: "Form completed", UccZqC: "Subscribed to Newsletter",
};

type KMessage = { name: string; subject_line: string; preview_text?: string; template_id: string; from_email?: string; from_label?: string; reply_to_email?: string };
type KAction = { id: string; type: string; links: Record<string, string | null>; data: Record<string, unknown> };
type KDef = { triggers: { type: string; id?: string; trigger_filter?: unknown }[]; profile_filter?: unknown; actions: KAction[]; entry_action_id: string };

export async function importKlaviyoFlows(opts: { log?: (s: string) => void; onlyLive?: boolean } = {}) {
  const list = await kget("https://a.klaviyo.com/api/flows") as { data: { id: string; attributes: { name: string; status: string; trigger_type: string; archived: boolean } }[] };
  const out = [];
  for (const f of list.data) {
    if (f.attributes.archived) continue;
    if (opts.onlyLive && f.attributes.status !== "live") continue;
    const full = await kget(`https://a.klaviyo.com/api/flows/${f.id}?additional-fields[flow]=definition`) as { data: { attributes: { definition: KDef } } };
    const def = full.data.attributes.definition;
    opts.log?.(`\n${f.attributes.name} (${f.attributes.status}) — ${def.actions.length} actions`);
    const folder = `klaviyo/flows/${f.attributes.name}`.replace(/[^\w\-/ .&()]/g, "");
    // steps: normalise the graph, import every email's template
    const steps: Record<string, unknown>[] = [];
    const importMsg = async (m: KMessage, status: string) => {
      const tid = await importKlaviyoTemplate(m.template_id, { name: `${f.attributes.name} · ${m.name}`, subject: m.subject_line, previewText: m.preview_text, fromName: m.from_label, fromEmail: m.from_email, replyTo: m.reply_to_email, folder, log: opts.log });
      return { name: m.name, subject: m.subject_line, previewText: m.preview_text ?? null, klaviyoTemplateId: m.template_id, templateId: tid, status };
    };
    for (const a of def.actions) {
      const s: Record<string, unknown> = { id: a.id, type: a.type, links: a.links };
      if (a.type === "send-email") { const d = a.data as { message: KMessage; status: string }; s.email = await importMsg(d.message, d.status); }
      else if (a.type === "time-delay") s.delay = a.data;
      else if (a.type === "conditional-split" || a.type === "trigger-split") s.condition = a.data;
      else if (a.type === "ab-test") {
        const d = a.data as { status: string; main_action?: { data: { message: KMessage; status: string } }; variation_actions?: { data: { message: KMessage; status: string } }[]; experiment_status?: string };
        s.abStatus = d.status; s.experimentStatus = d.experiment_status;
        if (d.main_action) s.email = await importMsg(d.main_action.data.message, d.main_action.data.status);
        s.variants = []; for (const v of d.variation_actions ?? []) (s.variants as unknown[]).push(await importMsg(v.data.message, v.data.status));
      } else s.data = a.data;
      steps.push(s);
    }
    const trig = def.triggers?.[0];
    const trigger = trig?.type === "metric" ? `metric:${METRICS[trig.id ?? ""] ?? trig.id}` : trig?.type ?? f.attributes.trigger_type;
    const definition = { entry: def.entry_action_id, triggers: def.triggers, profileFilter: def.profile_filter ?? null, steps };
    const [row] = await sql`insert into flows (name, trigger, definition, status, source, source_ref, klaviyo_status)
      values (${f.attributes.name}, ${trigger}, ${JSON.stringify(definition)}::jsonb, 'draft', 'klaviyo', ${f.id}, ${f.attributes.status})
      on conflict (source_ref) do update set name = excluded.name, trigger = excluded.trigger, definition = excluded.definition, klaviyo_status = excluded.klaviyo_status, updated_at = now()
      returning id`;
    out.push({ id: row.id, name: f.attributes.name, steps: steps.length });
  }
  return out;
}

export async function importKlaviyoSegments(opts: { log?: (s: string) => void } = {}) {
  const list = await kget("https://a.klaviyo.com/api/segments") as { data: { id: string; attributes: { name: string; definition: unknown; is_active: boolean } }[] };
  const out = [];
  for (const s of list.data) {
    let count: number | null = null;
    try { const c = await kget(`https://a.klaviyo.com/api/segments/${s.id}?additional-fields[segment]=profile_count`) as { data: { attributes: { profile_count?: number } } }; count = c.data.attributes.profile_count ?? null; } catch { /* fine */ }
    await sql`insert into segments (name, definition, source, source_ref, is_active, klaviyo_count)
      values (${s.attributes.name}, ${JSON.stringify(s.attributes.definition ?? {})}::jsonb, 'klaviyo', ${s.id}, ${s.attributes.is_active}, ${count})
      on conflict (source_ref) do update set name = excluded.name, definition = excluded.definition, is_active = excluded.is_active, klaviyo_count = excluded.klaviyo_count, updated_at = now()`;
    out.push({ name: s.attributes.name, count }); opts.log?.(`segment ${s.attributes.name} (${count})\n`);
  }
  return out;
}
