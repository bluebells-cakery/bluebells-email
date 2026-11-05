import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await sql`insert into campaigns (name, subject, preview_text, from_name, from_email, template_id, html, design, audience, smart_sending, status)
    select name || ' (copy)', subject, preview_text, from_name, from_email, template_id, html, design, audience, smart_sending, 'draft' from campaigns where id = ${id} returning id`;
  return NextResponse.json({ id: row?.id });
}
