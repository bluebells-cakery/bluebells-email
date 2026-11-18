import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { BLANK_DESIGN } from "@/lib/blank-design";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = body.name ?? "Untitled template";
  const design = body.design ?? BLANK_DESIGN;
  const [row] = await sql`insert into templates(name, design) values (${name}, ${JSON.stringify(design)}::jsonb) returning id`;
  return NextResponse.json({ id: row.id });
}
