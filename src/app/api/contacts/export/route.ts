import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const PERSONAL = ["gmail.com","googlemail.com","hotmail.com","hotmail.co.nz","outlook.com","outlook.co.nz","live.com","live.co.nz","yahoo.com","yahoo.co.nz","icloud.com","me.com","mac.com","xtra.co.nz","windowslive.com","msn.com","protonmail.com","proton.me","aol.com","slingshot.co.nz","orcon.net.nz","vodafone.co.nz","inspire.net.nz","clear.net.nz","paradise.net.nz","ihug.co.nz","kinect.co.nz","spark.co.nz","2degrees.nz","mail.com","yahoo.com.au","hotmail.com.au","outlook.com.au"];

/**
 * CSV export of contacts. Query params: min_orders (default 1), since (ISO date, default none), business=1 (exclude personal email domains),
 * status (default subscribed). Needs the team session or x-edm-key header (see proxy).
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const minOrders = Number(sp.get("min_orders") || 1), since = sp.get("since"), business = sp.get("business") === "1";
  const status = sp.get("status") || "subscribed";
  const rows = await sql`
    select c.id, c.email, c.first_name, c.last_name, c.status, c.order_count, c.total_spent, c.last_order_at, c.created_at, c.tags,
      (select count(*) from orders o where o.contact_id = c.id and (${since}::timestamptz is null or o.placed_at >= ${since}::timestamptz)) as orders_in_period,
      (select coalesce(sum(o.total),0) from orders o where o.contact_id = c.id and (${since}::timestamptz is null or o.placed_at >= ${since}::timestamptz)) as spent_in_period
    from contacts c
    where (${status} = 'any' or c.status = ${status})
      and c.order_count >= ${minOrders}
      and not exists (select 1 from suppressions s where s.email = c.email)
    order by c.total_spent desc` as Array<Record<string, unknown>>;
  const out = rows.filter((r) => {
    if (since && Number(r.orders_in_period) < minOrders) return false;
    if (business) { const d = String(r.email).split("@")[1]?.toLowerCase() || ""; if (PERSONAL.includes(d)) return false; }
    return true;
  });
  const cols = ["id","email","first_name","last_name","status","order_count","total_spent","orders_in_period","spent_in_period","last_order_at","created_at","tags"];
  const esc = (v: unknown) => { const s = v == null ? "" : Array.isArray(v) ? v.join("|") : v instanceof Date ? v.toISOString() : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cols.join(","), ...out.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="contacts-export.csv"`, "x-row-count": String(out.length) } });
}
