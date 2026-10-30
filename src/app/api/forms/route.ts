import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { defaultConfig } from "@/lib/forms";
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const [row] = await sql`insert into forms (name, kind, config) values (${b.name ?? "Welcome popup"}, ${b.kind ?? "popup"}, ${JSON.stringify(defaultConfig)}::jsonb) returning id`;
  return NextResponse.json({ id: row.id });
}
