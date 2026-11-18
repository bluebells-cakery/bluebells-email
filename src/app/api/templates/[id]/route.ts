import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { fluidDesign, fluidHtml } from "@/lib/fluid-images";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t] = await sql`select id, name, design, html, updated_at from templates where id = ${id}`;
  return t ? NextResponse.json(t) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const name = body.name, design = body.design ? fluidDesign(body.design) : body.design, html = typeof body.html === "string" ? fluidHtml(body.html) : body.html;
  await sql`update templates set
    name = coalesce(${name ?? null}, name),
    design = coalesce(${design ? JSON.stringify(design) : null}::jsonb, design),
    html = coalesce(${html ?? null}, html),
    updated_at = now() where id = ${id}`;
  // Keep unsent campaigns built on this template in sync with its latest HTML.
  let synced = 0;
  if (html) synced = (await sql`update campaigns set html = ${html}, design = ${design ? JSON.stringify(design) : null}::jsonb, updated_at = now() where template_id = ${id} and status = 'draft' returning id`).length;
  return NextResponse.json({ ok: true, synced });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`delete from templates where id = ${id}`;
  return NextResponse.json({ ok: true });
}
