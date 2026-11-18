import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { startCampaignEmail } from "@/lib/campaign-start";

/** For a draft with no email yet: {start:"last"|"scratch"} → its own template, returns the editor URL. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const b = await req.json().catch(() => ({}));
  const [c] = await sql`select status, template_id from campaigns where id = ${id}`;
  if (!c || c.status !== "draft") return NextResponse.json({ error: "Only drafts can be edited." }, { status: 400 });
  const tid = c.template_id ? Number(c.template_id) : await startCampaignEmail(id, b.start === "scratch" ? "scratch" : "last");
  return NextResponse.json({ templateId: tid, url: `/templates/${tid}?campaign=${id}` });
}
