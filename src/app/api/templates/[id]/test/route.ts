import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { renderTemplate, instrument, textVersion, withPreheader } from "@/lib/render";
import { sendEmail, fixedProvider } from "@/lib/ses";
import { getSetting } from "@/lib/settings";

export const maxDuration = 60;

/** Test send straight from the email editor. POST { to: string[], campaignId? } — sends the saved template (campaign subject if given) with a [TEST] prefix. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json() as { to?: string[]; campaignId?: string | number | null };
  const to = [...new Set((b.to ?? []).map(s => s.trim().toLowerCase()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)))].slice(0, 10);
  if (!to.length) return NextResponse.json({ error: "Tick or type at least one valid address." }, { status: 400 });
  const [t] = await sql`select html, subject, preview_text, name, from_name from templates where id = ${id}`;
  if (!t?.html) return NextResponse.json({ error: "Nothing saved to send yet." }, { status: 400 });
  const [c] = b.campaignId ? await sql`select subject, preview_text, name, from_name, from_email, provider from campaigns where id = ${b.campaignId}` : [];
  const subject = c?.subject || t.subject || c?.name || t.name;
  const results: { to: string; error?: string }[] = [];
  for (const addr of to) {
    const token = "test-" + randomBytes(6).toString("hex");
    const html = instrument(withPreheader(renderTemplate(t.html, { first_name: "Ryan", email: addr, token, unsubscribe_url: "https://edm.bluebellscakery.co.nz/u/test", coupons: { WELCOME10: "TEST10" }, products: [] }), c?.preview_text || t.preview_text), token);
    try { await sendEmail({ to: addr, subject: `[TEST] ${subject}`, html, text: textVersion(html), fromName: c?.from_name ?? t.from_name ?? "Bluebells Cakery", fromEmail: c?.from_email ?? undefined, replyTo: "orders@bluebellscakery.co.nz", provider: fixedProvider(c?.provider) }); results.push({ to: addr }); }
    catch (e) { results.push({ to: addr, error: (e as Error).message }); }
  }
  return NextResponse.json({ ok: results.every(r => !r.error), results });
}

export async function GET() {
  return NextResponse.json({ saved: ((await getSetting("test_emails")) ?? "ryan@bluebellscakery.co.nz").split(/[,\s]+/).filter(Boolean) });
}
