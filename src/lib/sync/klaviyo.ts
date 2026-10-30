import { sql } from "@/lib/db";

const REV = "2025-10-15";
const H = () => ({ Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`, revision: REV, accept: "application/vnd.api+json" });

type Profile = {
  id: string;
  attributes: {
    email: string | null; first_name: string | null; last_name: string | null; phone_number: string | null; created: string; updated: string;
    subscriptions?: { email?: { marketing?: { consent: string; timestamp: string | null; method?: string | null; consent_timestamp?: string | null; last_updated?: string | null; suppression?: { reason: string; timestamp: string }[]; list_suppressions?: unknown[] } } };
  };
};

async function get(url: string): Promise<{ data: Profile[]; links: { next: string | null } }> {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { headers: H() });
    if (r.status === 429 && attempt < 8) { await new Promise(res => setTimeout(res, Number(r.headers.get("retry-after") ?? 5) * 1000)); continue; }
    if (!r.ok) throw new Error(`Klaviyo ${r.status}: ${await r.text()}`);
    return r.json();
  }
}

/** Imports every Klaviyo profile: subscribed → contact (if not already subscribed via Shopify), suppressed/unsubscribed → suppressions table. */
export async function syncKlaviyoProfiles(opts: { log?: (s: string) => void } = {}) {
  let url: string | null = `https://a.klaviyo.com/api/profiles?page[size]=100&additional-fields[profile]=subscriptions`;
  let n = 0, subs = 0, sup = 0;
  while (url) {
    const page = await get(url);
    const contacts: Record<string, unknown>[] = [], suppressions: { email: string; reason: string }[] = [];
    for (const p of page.data) {
      const a = p.attributes;
      if (!a.email) continue;
      const email = a.email.trim().toLowerCase();
      const m = a.subscriptions?.email?.marketing;
      const consent = m?.consent ?? "NEVER_SUBSCRIBED";
      const suppressed = (m?.suppression?.length ?? 0) > 0;
      let status = consent === "SUBSCRIBED" ? "subscribed" : consent === "UNSUBSCRIBED" ? "unsubscribed" : "never_subscribed";
      if (suppressed) { status = "suppressed"; suppressions.push({ email, reason: m!.suppression![0].reason.toLowerCase() }); sup++; }
      if (status === "subscribed") subs++;
      contacts.push({
        email, first_name: a.first_name, last_name: a.last_name, phone: a.phone_number, klaviyo_profile_id: p.id, status,
        consent_source: status === "subscribed" ? (m?.method ? `klaviyo:${m.method.toLowerCase()}` : "klaviyo") : null,
        consent_at: status === "subscribed" ? (m?.consent_timestamp ?? m?.timestamp ?? null) : null,
        unsubscribed_at: status === "unsubscribed" ? (m?.last_updated ?? m?.timestamp ?? null) : null,
        suppressed_reason: suppressed ? m!.suppression![0].reason.toLowerCase() : null,
        created_at: a.created,
      });
    }
    const seen = new Set<string>(); const uniq = contacts.filter(r => !seen.has(r.email as string) && seen.add(r.email as string));
    if (uniq.length) await sql`
      insert into contacts (email, first_name, last_name, phone, klaviyo_profile_id, status, consent_source, consent_at, unsubscribed_at, suppressed_reason, created_at)
      select email, first_name, last_name, phone, klaviyo_profile_id, status, consent_source, consent_at::timestamptz, unsubscribed_at::timestamptz, suppressed_reason, created_at::timestamptz
      from json_populate_recordset(null::contacts, ${JSON.stringify(uniq)}::json)
      on conflict (email) do update set
        first_name = coalesce(contacts.first_name, excluded.first_name),
        last_name  = coalesce(contacts.last_name, excluded.last_name),
        phone      = coalesce(contacts.phone, excluded.phone),
        klaviyo_profile_id = excluded.klaviyo_profile_id,
        -- precedence: suppressed > unsubscribed (either source) > subscribed > never
        status = case
          when contacts.status = 'suppressed' or excluded.status = 'suppressed' then 'suppressed'
          when contacts.status = 'unsubscribed' or excluded.status = 'unsubscribed' then 'unsubscribed'
          when contacts.status = 'subscribed' or excluded.status = 'subscribed' then 'subscribed'
          else 'never_subscribed' end,
        consent_source = coalesce(contacts.consent_source, excluded.consent_source),
        consent_at = coalesce(contacts.consent_at, excluded.consent_at),
        unsubscribed_at = coalesce(contacts.unsubscribed_at, excluded.unsubscribed_at),
        suppressed_reason = coalesce(excluded.suppressed_reason, contacts.suppressed_reason),
        created_at = least(contacts.created_at, excluded.created_at),
        updated_at = now()`;
    if (suppressions.length) await sql`
      insert into suppressions (email, reason, source)
      select email, reason, 'klaviyo' from json_populate_recordset(null::suppressions, ${JSON.stringify(suppressions)}::json)
      on conflict (email) do nothing`;
    n += uniq.length;
    url = page.links?.next ?? null;
    if (n % 2000 < 100) opts.log?.(`klaviyo profiles ${n} (subscribed ${subs}, suppressed ${sup})`);
  }
  return { profiles: n, subscribed: subs, suppressed: sup };
}
