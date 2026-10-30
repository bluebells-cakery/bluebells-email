import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const b = await req.json();
  await sql`update forms set name = coalesce(${b.name ?? null}, name), status = coalesce(${b.status ?? null}, status), config = coalesce(${b.config ? JSON.stringify(b.config) : null}::jsonb, config), updated_at = now() where id = ${id}`;
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; await sql`delete from form_events where form_id = ${id}`; await sql`delete from forms where id = ${id}`; return NextResponse.json({ ok: true }); }
