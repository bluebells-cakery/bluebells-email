import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const b = await req.json();
  if (b.status && ["draft", "live", "paused"].includes(b.status)) await sql`update flows set status = ${b.status}, updated_at = now() where id = ${id}`;
  if (b.stepId && typeof b.enabled === "boolean") {
    const [f] = await sql`select definition from flows where id = ${id}`;
    const def = f.definition; const s = def.steps.find((x: { id: string }) => x.id === b.stepId);
    if (s?.email) s.email.enabled = b.enabled;
    if (s && b.variant != null && s.variants?.[b.variant]) s.variants[b.variant].enabled = b.enabled;
    await sql`update flows set definition = ${JSON.stringify(def)}::jsonb, updated_at = now() where id = ${id}`;
  }
  if (b.stepId && b.ourTemplateId !== undefined) {
    const [f] = await sql`select definition from flows where id = ${id}`;
    const def = f.definition; const s = def.steps.find((x: { id: string }) => x.id === b.stepId);
    if (s?.email) s.email.ourTemplateId = b.ourTemplateId;
    await sql`update flows set definition = ${JSON.stringify(def)}::jsonb, updated_at = now() where id = ${id}`;
  }
  return NextResponse.json({ ok: true });
}
