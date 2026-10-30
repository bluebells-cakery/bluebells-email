import { SITE_URL } from "@/lib/site";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

async function unsub(token: string) {
  const [c] = await sql`update contacts set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now() where unsubscribe_token = ${token} and status <> 'suppressed' returning id, email`;
  if (c) { await sql`insert into suppressions (email, reason, source) values (${c.email}, 'unsubscribe', 'app') on conflict (email) do nothing`; await sql`insert into events (contact_id, type, source) values (${c.id}, 'unsubscribe', 'app')`; await sql`update flow_runs set status = 'cancelled', finished_at = now() where contact_id = ${c.id} and status = 'active'`; }
  return c;
}
const page = (msg: string) => new NextResponse(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Bluebells Cakery</title></head><body style="font-family:Arial,sans-serif;background:#fffdf8;color:#262967;text-align:center;padding:60px 20px"><h1 style="font-weight:400">Bluebells Cakery</h1><p style="font-size:18px">${msg}</p><p><a href="${SITE_URL}" style="color:#00bfb3">${SITE_URL.replace("https://", "")}</a></p></body></html>`, { headers: { "content-type": "text/html" } });

export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const c = await unsub(token);
  return page(c ? "You've been unsubscribed. Sorry to see you go — you can always re-subscribe on our website." : "That link isn't valid any more.");
}
// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post)
export async function POST(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; await unsub(token); return new NextResponse("ok");
}
