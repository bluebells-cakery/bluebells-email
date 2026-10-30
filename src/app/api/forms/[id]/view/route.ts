import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
const cors = { "access-control-allow-origin": "*" };
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const b = await req.json().catch(() => ({}));
  await sql`insert into form_events (form_id, type, meta) values (${id}, ${b.type === "close" ? "close" : "view"}, ${JSON.stringify({ page: b.page ?? null })}::jsonb)`;
  return NextResponse.json({ ok: true }, { headers: cors });
}
export async function OPTIONS() { return new NextResponse(null, { headers: { ...cors, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } }); }
