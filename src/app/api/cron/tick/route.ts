import { NextRequest, NextResponse } from "next/server";
import { tickFlows, processQueue } from "@/lib/engine";
import { pollOrders, pollCheckouts, pollSubscribers } from "@/lib/triggers";
import { tickCampaigns } from "@/lib/campaigns";
import { sql } from "@/lib/db";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""; const key = req.nextUrl.searchParams.get("key");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const log: string[] = []; const L = (s: string) => log.push(s);
  const out: Record<string, unknown> = {};
  for (const [name, fn] of [["subscribers", () => pollSubscribers(L)], ["orders", () => pollOrders(L)], ["checkouts", () => pollCheckouts(L)], ["flows", () => tickFlows()], ["campaigns", () => tickCampaigns()], ["queue", () => processQueue(300)]] as const) {
    try { out[name] = await fn(); } catch (e) { out[name] = `ERR ${(e as Error).message}`; }
  }
  await sql`insert into sync_state(key, value) values ('last_tick', ${JSON.stringify({ at: new Date().toISOString(), out, log })}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
  return NextResponse.json({ ok: true, out, log });
}
