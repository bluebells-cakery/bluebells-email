import { NextRequest, NextResponse } from "next/server";
import { tickFlows, processQueue } from "@/lib/engine";
import { pollOrders, pollCheckouts, pollSubscribers } from "@/lib/triggers";
import { tickCampaigns } from "@/lib/campaigns";
import { sql } from "@/lib/db";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""; const key = req.nextUrl.searchParams.get("key");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  // Overlap guard: ticks can run >1 min, and overlapping ticks double-process runs.
  const lock = await sql`insert into sync_state(key, value) values ('tick_lock', ${new Date().toISOString()})
    on conflict (key) do update set value = excluded.value, updated_at = now() where sync_state.updated_at < now() - interval '4 minutes' returning key`;
  if (!lock.length) return NextResponse.json({ ok: true, skipped: "tick in progress" });
  const log: string[] = []; const L = (s: string) => log.push(s);
  const out: Record<string, unknown> = {};
  for (const [name, fn] of [["subscribers", () => pollSubscribers(L)], ["orders", () => pollOrders(L)], ["checkouts", () => pollCheckouts(L)], ["queue", () => processQueue(300)], ["flows", () => tickFlows(60)], ["campaigns", () => tickCampaigns()]] as const) {
    try { out[name] = await fn(); } catch (e) { out[name] = `ERR ${(e as Error).message}`; }
  }
  await sql`update sync_state set updated_at = now() - interval '1 hour' where key = 'tick_lock'`; // release
  await sql`insert into sync_state(key, value) values ('last_tick', ${JSON.stringify({ at: new Date().toISOString(), out, log })}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  return NextResponse.json({ ok: true, out, log });
}
