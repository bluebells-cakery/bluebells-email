import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { action, first_name, last_name } = await req.json();
  const [c] = await sql`select email from contacts where id = ${id}`; if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (action === "unsubscribe") { await sql`update contacts set status='unsubscribed', unsubscribed_at=now(), updated_at=now() where id=${id} and status<>'suppressed'`; await sql`update flow_runs set status='cancelled', finished_at=now() where contact_id=${id} and status='active'`; }
  if (action === "suppress") { await sql`update contacts set status='suppressed', suppressed_reason='manual', updated_at=now() where id=${id}`; await sql`insert into suppressions(email, reason, source) values (${c.email}, 'manual', 'app') on conflict (email) do update set reason='manual'`; await sql`update flow_runs set status='cancelled', finished_at=now() where contact_id=${id} and status='active'`; }
  if (action === "resubscribe") { await sql`delete from suppressions where email=${c.email} and reason in ('manual','unsubscribe','user_suppressed')`; await sql`update contacts set status='subscribed', consent_source='manual', consent_at=now(), suppressed_reason=null, updated_at=now() where id=${id}`; }
  if (first_name !== undefined || last_name !== undefined) await sql`update contacts set first_name = coalesce(${first_name ?? null}, first_name), last_name = coalesce(${last_name ?? null}, last_name), updated_at=now() where id=${id}`;
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await sql`select email from contacts where id = ${id}`; if (!c) return NextResponse.json({ ok: true });
  // keep the address suppressed so a re-sync can't resurrect it
  await sql`insert into suppressions(email, reason, source) values (${c.email}, 'deleted', 'app') on conflict (email) do nothing`;
  await sql`delete from events where contact_id=${id}`; await sql`delete from send_queue where contact_id=${id}`; await sql`delete from flow_runs where contact_id=${id}`;
  await sql`update orders set contact_id=null where contact_id=${id}`; await sql`update checkouts set contact_id=null where contact_id=${id}`; await sql`update coupons set contact_id=null where contact_id=${id}`;
  await sql`delete from contacts where id=${id}`;
  return NextResponse.json({ ok: true });
}
