import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const [row] = await sql`insert into campaigns (name, from_name, from_email, status) values (${b.name ?? "Untitled campaign"}, 'Bluebells Cakery', ${process.env.SES_FROM_EMAIL ?? null}, 'draft') returning id`;
  return NextResponse.json({ id: row.id });
}
