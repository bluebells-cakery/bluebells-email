import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ items: [] });
  const like = "%" + q + "%";
  const items = await sql`select id, email, first_name, last_name, status, city, order_count, total_spent, last_order_at, last_open_at, created_at
    from contacts where email ilike ${like} or first_name ilike ${like} or last_name ilike ${like} or (first_name || ' ' || last_name) ilike ${like} order by (email ilike ${q + "%"}) desc, last_order_at desc nulls last limit 50`;
  return NextResponse.json({ items });
}
