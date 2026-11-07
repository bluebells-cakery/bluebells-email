import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
// POST { runId } — skip one customer's pending review request.
export async function POST(req: NextRequest) {
  const { runId } = await req.json();
  const r = await sql`update flow_runs set status = 'cancelled', finished_at = now() where id = ${runId} and status = 'active' and step_id = 'rr-email' returning id`;
  return NextResponse.json({ ok: r.length > 0 });
}
