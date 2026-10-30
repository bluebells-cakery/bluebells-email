import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/settings";
import { sql } from "@/lib/db";

export async function GET() {
  const [q] = await sql`select count(*) filter (where status='queued')::int queued, count(*) filter (where status='sent' and sent_at > now() - interval '24 hours')::int sent24, count(*) filter (where status='skipped' and created_at > now() - interval '24 hours')::int skipped24, count(*) filter (where status='failed')::int failed from send_queue`;
  const [r] = await sql`select count(*) filter (where status='active')::int active, count(*) filter (where status='done')::int done from flow_runs`;
  const last = await sql`select value, updated_at from sync_state where key='last_tick'`;
  return NextResponse.json({ smartHours: Number((await getSetting("smart_send_hours")) ?? 16), mode: (await getSetting("engine_mode")) ?? "shadow", testEmails: (await getSetting("test_emails")) ?? "ryan@bluebellscakery.co.nz", queue: q, runs: r, lastTick: last[0] ? { at: last[0].updated_at, ...JSON.parse(last[0].value) } : null });
}
export async function POST(req: NextRequest) {
  const b = await req.json();
  if (b.mode && ["shadow", "test", "live"].includes(b.mode)) await setSetting("engine_mode", b.mode);
  if (typeof b.testEmails === "string") await setSetting("test_emails", b.testEmails);
  if (b.smartHours !== undefined) await setSetting("smart_send_hours", String(Math.max(0, Number(b.smartHours) || 0)));
  return GET();
}
