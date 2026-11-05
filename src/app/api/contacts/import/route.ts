import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/** Import contacts: { contacts: [{ email, first_name?, last_name?, company?, attributes? }], tag?, consent_source?, status? }.
 *  Existing contacts are left as-is (status untouched) apart from gaining the tag and any missing name/attributes. */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const list: { email: string; first_name?: string; last_name?: string; company?: string; attributes?: Record<string, unknown> }[] = Array.isArray(b.contacts) ? b.contacts : [];
  const tag = String(b.tag || "").trim();
  const consent = String(b.consent_source || "manual");
  const status = ["subscribed", "never_subscribed"].includes(b.status) ? b.status : "subscribed";
  const rows = list.map((c) => ({ email: String(c.email || "").trim().toLowerCase(), first: c.first_name?.trim() || null, last: c.last_name?.trim() || null,
    attrs: { ...(c.attributes || {}), ...(c.company ? { company: c.company } : {}) } })).filter((c) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email));
  if (!rows.length) return NextResponse.json({ error: "contacts required" }, { status: 400 });
  let created = 0, updated = 0;
  for (const r of rows) {
    const [x] = await sql`insert into contacts (email, first_name, last_name, status, consent_source, consent_at, unsubscribe_token, tags, attributes)
      values (${r.email}, ${r.first}, ${r.last}, ${status}, ${consent}, now(), encode(gen_random_bytes(12),'hex'), ${tag ? [tag] : []}, ${JSON.stringify(r.attrs)}::jsonb)
      on conflict (email) do update set
        first_name = coalesce(contacts.first_name, excluded.first_name), last_name = coalesce(contacts.last_name, excluded.last_name),
        tags = case when ${tag} = '' then contacts.tags else array_append(array_remove(contacts.tags, ${tag}), ${tag}) end,
        attributes = contacts.attributes || excluded.attributes, updated_at = now()
      returning (xmax = 0) as inserted`;
    if (x?.inserted) created++; else updated++;
  }
  return NextResponse.json({ ok: true, created, updated });
}
