import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { startCampaignEmail } from "@/lib/campaign-start";

/** New campaign. {start:"last"|"scratch"} also gives it its own email (copy of the last design, or blank branded). */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const [row] = await sql`insert into campaigns (name, from_name, from_email, status) values (${b.name ?? "Untitled campaign"}, 'Bluebells Cakery', ${process.env.SES_FROM_EMAIL ?? null}, 'draft') returning id`;
  const templateId = b.start === "last" || b.start === "scratch" ? await startCampaignEmail(row.id, b.start) : null;
  return NextResponse.json({ id: row.id, templateId });
}
