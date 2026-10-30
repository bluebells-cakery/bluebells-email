import { sql } from "@/lib/db";
import { kget } from "./klaviyo-templates";

const METRIC_TYPES: Record<string, string> = { WfmaTK: "open", Thwsvq: "click", Y8qiKC: "checkout_started", Y3M4qe: "sent" };

/** Imports Klaviyo events for a metric since a date into our events table (keyed by contact email → contact_id). */
export async function importKlaviyoEvents(metricId: string, sinceIso: string, opts: { log?: (s: string) => void } = {}) {
  const type = METRIC_TYPES[metricId]; if (!type) throw new Error("unknown metric " + metricId);
  let url: string | null = `https://a.klaviyo.com/api/events?filter=equals(metric_id,"${metricId}"),greater-than(datetime,${sinceIso})&sort=datetime&page[size]=200&include=profile&fields[profile]=email&fields[event]=datetime,uuid,event_properties`;
  let n = 0;
  while (url) {
    const page = await kget(url) as { data: { id: string; attributes: { datetime: string; uuid: string; event_properties?: Record<string, unknown> }; relationships: { profile: { data: { id: string } } } }[]; included?: { id: string; attributes: { email: string } }[]; links?: { next?: string } };
    const emails = new Map((page.included ?? []).map(p => [p.id, p.attributes.email?.toLowerCase()]));
    const rows = page.data.map(e => ({ source_id: `klaviyo:${e.id}`, email: emails.get(e.relationships.profile.data.id) ?? null, type, occurred_at: e.attributes.datetime,
      meta: JSON.stringify({ campaign: e.attributes.event_properties?.["Campaign Name"] ?? e.attributes.event_properties?.["$message"] ?? null, url: e.attributes.event_properties?.URL ?? null }) })).filter(r => r.email);
    if (rows.length) await sql`
      insert into events (contact_id, type, occurred_at, meta, source, source_id)
      select c.id, r.type, r.occurred_at::timestamptz, r.meta::jsonb, 'klaviyo', r.source_id
      from json_to_recordset(${JSON.stringify(rows)}::json) as r(source_id text, email text, type text, occurred_at text, meta text)
      join contacts c on c.email = r.email
      on conflict (source_id) do nothing`;
    n += rows.length;
    url = page.links?.next ?? null;
    if (n % 2000 < 200) opts.log?.(`${type} ${n}\n`);
  }
  // roll up last_open/last_click
  if (type === "open") await sql`update contacts c set last_open_at = m.t from (select contact_id, max(occurred_at) t from events where type='open' group by 1) m where m.contact_id = c.id and (c.last_open_at is null or c.last_open_at < m.t)`;
  if (type === "click") await sql`update contacts c set last_click_at = m.t from (select contact_id, max(occurred_at) t from events where type='click' group by 1) m where m.contact_id = c.id and (c.last_click_at is null or c.last_click_at < m.t)`;
  return n;
}
