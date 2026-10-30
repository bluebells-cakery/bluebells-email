import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t] = await sql`select id, name, design, html, updated_at from templates where id = ${id}`;
  return t ? NextResponse.json(t) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, design, html } = await req.json();
  await sql`update templates set
    name = coalesce(${name ?? null}, name),
    design = coalesce(${design ? JSON.stringify(design) : null}::jsonb, design),
    html = coalesce(${html ?? null}, html),
    updated_at = now() where id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`delete from templates where id = ${id}`;
  return NextResponse.json({ ok: true });
}
