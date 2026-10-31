import { sql } from "../src/lib/db";
import { kget } from "../src/lib/sync/klaviyo-templates";
const H = { Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`, revision: "2025-10-15", accept: "application/vnd.api+json", "content-type": "application/vnd.api+json" };
const body = { data: { type: "campaign-values-report", attributes: { statistics: ["recipients", "delivered", "opens_unique", "clicks_unique", "open_rate", "click_rate", "conversion_value", "conversions", "unsubscribes", "spam_complaints"], timeframe: { key: "last_12_months" }, conversion_metric_id: "QWGLHG", filter: "equals(send_channel,'email')" } } };
const rep = await (await fetch("https://a.klaviyo.com/api/campaign-values-reports", { method: "POST", headers: H, body: JSON.stringify(body) })).json();
const stats = new Map<string, Record<string, number>>(rep.data.attributes.results.map((r: any) => [r.groupings.campaign_id, r.statistics]));
let url: string | null = "https://a.klaviyo.com/api/campaigns?filter=equals(messages.channel,'email'),equals(status,'Sent')&sort=-scheduled_at&include=campaign-messages";
let n = 0;
while (url) {
  const page = await kget(url) as any;
  for (const c of page.data) {
    const st = stats.get(c.id); if (!st) continue;
    const ids = c.relationships?.["campaign-messages"]?.data?.map((d: any) => d.id) ?? [];
    const m = (page.included ?? []).find((i: any) => i.type === "campaign-message" && ids.includes(i.id));
    const subject = m?.attributes?.definition?.content?.subject ?? null; const tplK = m?.relationships?.template?.data?.id ?? null;
    const tpl = tplK ? (await sql`select id from templates where source_ref = ${tplK}`)[0] : null;
    await sql`insert into campaigns (name, subject, status, sent_at, recipient_count, source, source_ref, klaviyo_stats, template_id, from_name)
      values (${c.attributes.name.trim()}, ${subject}, 'sent', ${c.attributes.send_time}, ${st.recipients}, 'klaviyo', ${c.id}, ${JSON.stringify(st)}::jsonb, ${tpl?.id ?? null}, 'Bluebells Cakery')
      on conflict (source_ref) do update set klaviyo_stats = excluded.klaviyo_stats, recipient_count = excluded.recipient_count, sent_at = excluded.sent_at, subject = excluded.subject, template_id = coalesce(campaigns.template_id, excluded.template_id)`;
    n++;
  }
  url = page.links?.next ?? null;
}
console.log("imported", n, "Klaviyo campaigns with stats");
