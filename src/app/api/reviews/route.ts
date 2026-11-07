import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// PATCH { enabled?: boolean, days?: number, time?: "HH:MM" } — edits the review-request steps of the Post Purchase flow.
export async function PATCH(req: NextRequest) {
  const b = await req.json() as { enabled?: boolean; days?: number; time?: string };
  const [f] = await sql`select id, definition from flows where name = 'Post Purchase'`;
  if (!f) return NextResponse.json({ error: "Post Purchase flow not found" }, { status: 404 });
  const def = f.definition as { steps: { id: string; waitUntil?: { days: number; time: string; from: string }; email?: { enabled?: boolean } }[] };
  const wait = def.steps.find(s => s.id === "rr-wait"), email = def.steps.find(s => s.id === "rr-email");
  if (!wait?.waitUntil || !email?.email) return NextResponse.json({ error: "review steps missing" }, { status: 400 });
  if (typeof b.days === "number" && b.days >= 0 && b.days <= 60) wait.waitUntil.days = Math.round(b.days);
  if (typeof b.time === "string" && /^\d{2}:\d{2}$/.test(b.time)) wait.waitUntil.time = b.time;
  if (typeof b.enabled === "boolean") email.email.enabled = b.enabled;
  await sql`update flows set definition = ${JSON.stringify(def)}::jsonb, updated_at = now() where id = ${f.id}`;
  return NextResponse.json({ ok: true, waitUntil: wait.waitUntil, enabled: email.email.enabled });
}
