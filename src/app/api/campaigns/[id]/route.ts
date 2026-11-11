import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { audienceCount, type Audience } from "@/lib/campaigns";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await sql`select * from campaigns where id = ${id}`;
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [stats] = await sql`select count(*) filter (where status='sent')::int sent, count(*) filter (where status='queued')::int queued, count(*) filter (where status='skipped')::int skipped, count(*) filter (where status='failed')::int failed from send_queue where campaign_id = ${id}`;
  return NextResponse.json({ ...c, stats });
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const b = await req.json();
  const [c] = await sql`select status from campaigns where id = ${id}`;
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (b.action === "schedule" || b.action === "send") {
    if (!["draft", "scheduled"].includes(c.status)) return NextResponse.json({ error: "already sent" }, { status: 400 });
    const [full] = await sql`select html, subject, audience from campaigns where id = ${id}`;
    if (!full.html || !full.subject) return NextResponse.json({ error: "needs a subject and a template" }, { status: 400 });
    const n = await audienceCount(full.audience as Audience);
    await sql`update campaigns set status = 'scheduled', scheduled_at = ${b.action === "send" ? null : b.scheduled_at ?? null}, recipient_count = ${n}, updated_at = now() where id = ${id}`;
    return NextResponse.json({ ok: true, recipients: n });
  }
  if (b.action === "cancel") { await sql`update campaigns set status = 'draft', scheduled_at = null, updated_at = now() where id = ${id} and status = 'scheduled'`; return NextResponse.json({ ok: true }); }
  if (c.status !== "draft" && c.status !== "scheduled") return NextResponse.json({ error: "locked" }, { status: 400 });
  if (b.template_id !== undefined) {
    const [t] = await sql`select html, design from templates where id = ${b.template_id}`;
    await sql`update campaigns set template_id = ${b.template_id}, html = ${t?.html ?? null}, design = ${t?.design ? JSON.stringify(t.design) : null}::jsonb where id = ${id}`;
  }
  if (b.provider !== undefined) await sql`update campaigns set provider = ${["resend", "ses"].includes(b.provider) ? b.provider : null} where id = ${id}`;
  await sql`update campaigns set
    name = coalesce(${b.name ?? null}, name), subject = coalesce(${b.subject ?? null}, subject), preview_text = coalesce(${b.preview_text ?? null}, preview_text),
    from_name = coalesce(${b.from_name ?? null}, from_name), smart_sending = coalesce(${typeof b.smart_sending === 'boolean' ? b.smart_sending : null}, smart_sending), audience = coalesce(${b.audience ? JSON.stringify(b.audience) : null}::jsonb, audience), updated_at = now() where id = ${id}`;
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; await sql`delete from campaigns where id = ${id} and status = 'draft'`; return NextResponse.json({ ok: true });
}
