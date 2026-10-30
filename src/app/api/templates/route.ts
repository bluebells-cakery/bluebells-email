import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { name = "Untitled template", design = {} } = await req.json().catch(() => ({}));
  const [row] = await sql`insert into templates(name, design) values (${name}, ${JSON.stringify(design)}::jsonb) returning id`;
  return NextResponse.json({ id: row.id });
}
