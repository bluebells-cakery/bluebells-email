import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const t = token.replace(/\.gif$/, "");
  const ua = req.headers.get("user-agent") ?? "";
  const bot = /GoogleImageProxy|bot|crawler|preview/i.test(ua) && !/GoogleImageProxy/.test(ua); // Gmail proxy opens count; Apple MPP can't be told apart here
  try {
    const [q] = await sql`select id, contact_id, flow_id, campaign_id from send_queue where token = ${t}`;
    if (q && !bot) { await sql`insert into events (contact_id, send_id, flow_id, campaign_id, type, source, meta) values (${q.contact_id}, ${q.id}, ${q.flow_id}, ${q.campaign_id}, 'open', 'app', ${JSON.stringify({ ua })}::jsonb)`; await sql`update contacts set last_open_at = now() where id = ${q.contact_id}`; }
  } catch { /* never block the pixel */ }
  return new NextResponse(GIF, { headers: { "content-type": "image/gif", "cache-control": "no-store, no-cache, must-revalidate, private" } });
}
