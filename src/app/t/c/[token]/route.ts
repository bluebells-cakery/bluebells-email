import { SITE_URL } from "@/lib/site";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const u = req.nextUrl.searchParams.get("u") ?? SITE_URL;
  let dest: URL; try { dest = new URL(u); if (!/^https?:$/.test(dest.protocol)) throw 0; } catch { dest = new URL(SITE_URL); }
  const ua = req.headers.get("user-agent") ?? "";
  try {
    const [q] = await sql`select id, contact_id, flow_id, campaign_id from send_queue where token = ${token}`;
    if (q && !/bot|crawler|preview|scanner/i.test(ua)) { await sql`insert into events (contact_id, send_id, flow_id, campaign_id, type, url, source) values (${q.contact_id}, ${q.id}, ${q.flow_id}, ${q.campaign_id}, 'click', ${dest.toString()}, 'app')`; await sql`update contacts set last_click_at = now() where id = ${q.contact_id}`; }
    if (q && /bluebellscakery\.(com|co\.nz)$/.test(dest.hostname)) { dest.searchParams.set("utm_source", "edm"); dest.searchParams.set("utm_medium", "email"); if (q.flow_id) dest.searchParams.set("utm_campaign", `flow-${q.flow_id}`); if (q.campaign_id) dest.searchParams.set("utm_campaign", `campaign-${q.campaign_id}`); }
  } catch { /* ignore */ }
  return NextResponse.redirect(dest, 302);
}
