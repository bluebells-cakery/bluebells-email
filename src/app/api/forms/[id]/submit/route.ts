import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { startFlow } from "@/lib/engine";
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };
export async function OPTIONS() { return new NextResponse(null, { headers: cors }); }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email" }, { status: 400, headers: cors });
  if (b.website) return NextResponse.json({ ok: true }, { headers: cors }); // honeypot
  const [f] = await sql`select id, status from forms where id = ${id}`; if (!f) return NextResponse.json({ error: "form not found" }, { status: 404, headers: cors });
  const first = b.first_name ? String(b.first_name).trim().slice(0, 80) : null;
  const suppressed = (await sql`select reason from suppressions where email = ${email}`)[0];
  const [c] = await sql`insert into contacts (email, first_name, status, consent_source, consent_at, unsubscribe_token)
    values (${email}, ${first}, ${suppressed && ["bounce", "hard_bounce", "complaint", "spam_complaint"].includes(suppressed.reason) ? "suppressed" : "subscribed"}, ${"form:" + id}, now(), encode(gen_random_bytes(12),'hex'))
    on conflict (email) do update set first_name = coalesce(contacts.first_name, excluded.first_name),
      status = case when contacts.status = 'suppressed' and contacts.suppressed_reason in ('bounce','hard_bounce','complaint','spam_complaint') then 'suppressed' else 'subscribed' end,
      consent_source = case when contacts.status <> 'subscribed' then ${"form:" + id} else contacts.consent_source end,
      consent_at = case when contacts.status <> 'subscribed' then now() else contacts.consent_at end, unsubscribed_at = null, updated_at = now()
    returning id, status, (xmax = 0) as created`;
  if (c.status === "subscribed") await sql`delete from suppressions where email = ${email} and reason in ('unsubscribe','user_suppressed','manual','deleted')`;
  await sql`insert into form_events (form_id, type, email, meta) values (${id}, 'submit', ${email}, ${JSON.stringify({ page: b.page ?? null, created: c.created })}::jsonb)`;
  const wf = (await sql`select id from flows where name = 'New Welcome Flow' limit 1`)[0];
  if (wf && c.status === "subscribed") await startFlow(wf.id, c.id, `signup:${email}`);
  return NextResponse.json({ ok: true }, { headers: cors });
}
