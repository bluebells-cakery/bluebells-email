import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { renderTemplate, instrument, textVersion } from "@/lib/render";
import { sendEmail } from "@/lib/ses";
import { getSetting, setSetting } from "@/lib/settings";

export const maxDuration = 60;

// POST { to: string[], saveAddresses?: string } → sends the campaign (as currently saved) to each address with [TEST] prefix.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json() as { to?: string[]; saveAddresses?: string; provider?: "resend" | "ses" };
  if (typeof b.saveAddresses === "string") await setSetting("test_emails", b.saveAddresses.split(/[,\s]+/).filter(Boolean).join(","));
  const to = [...new Set((b.to ?? []).map(s => s.trim().toLowerCase()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)))];
  if (!to.length) return NextResponse.json({ error: "no valid addresses" }, { status: 400 });
  const [c] = await sql`select html, subject, from_name, from_email, name, provider from campaigns where id = ${id}`;
  if (!c?.html) return NextResponse.json({ error: "choose a template first" }, { status: 400 });
  const results: { to: string; id?: string; error?: string }[] = [];
  for (const addr of to) {
    const token = "test-" + randomBytes(6).toString("hex");
    const html = instrument(renderTemplate(c.html, { first_name: "Ryan", email: addr, token, unsubscribe_url: "https://edm.bluebellscakery.co.nz/u/test", coupons: { WELCOME10: "TEST10" }, products: [] }), token);
    try {
      const mid = await sendEmail({ to: addr, subject: `[TEST] ${c.subject ?? c.name}`, html, text: textVersion(html), fromName: c.from_name ?? "Bluebells Cakery", fromEmail: c.from_email ?? undefined, replyTo: "orders@bluebellscakery.co.nz", provider: b.provider ?? c.provider ?? undefined });
      results.push({ to: addr, id: mid });
    } catch (e) { results.push({ to: addr, error: (e as Error).message }); }
  }
  return NextResponse.json({ ok: results.every(r => !r.error), results, saved: (await getSetting("test_emails")) ?? "" });
}

export async function GET() {
  return NextResponse.json({ saved: ((await getSetting("test_emails")) ?? "ryan@bluebellscakery.co.nz").split(/[,\s]+/).filter(Boolean) });
}
