import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { renderTemplate, instrument, textVersion } from "@/lib/render";
import { sendEmail } from "@/lib/ses";

export const maxDuration = 30;
// Sends a rendered flow email to a test address with sample data.
export async function POST(req: NextRequest) {
  const { templateId, to, subject } = await req.json();
  const [t] = await sql`select html, subject, from_name from templates where id = ${templateId}`;
  if (!t?.html) return NextResponse.json({ error: "no template html" }, { status: 400 });
  const token = "test-" + randomBytes(6).toString("hex");
  const html = instrument(renderTemplate(t.html, { first_name: "Ryan", email: to, token, unsubscribe_url: "https://edm.bluebellscakery.co.nz/u/test",
    checkout: { url: "https://bluebellscakery.com/cart", line_items: [{ title: "20CM Classic Cake - Chocolate & Salted Caramel", quantity: 1, line_price: "89.00", image: "https://bluebellscakery.com/cdn/shop/files/cake_image_2.png", handle: "classic-cake" }] },
    order: { name: "#TEST" }, products: [] }), token);
  try {
    const id = await sendEmail({ to, subject: `[TEST] ${subject ?? t.subject ?? "Bluebells"}`, html, text: textVersion(html), fromName: t.from_name ?? "Bluebells Cakery", replyTo: "orders@bluebellscakery.co.nz" });
    return NextResponse.json({ ok: true, id });
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }
}
