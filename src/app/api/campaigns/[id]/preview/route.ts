import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { renderTemplate } from "@/lib/render";
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [c] = await sql`select html from campaigns where id = ${id}`;
  if (!c?.html) return new NextResponse("No template chosen", { status: 404 });
  return new NextResponse(renderTemplate(c.html, { first_name: "Ryan", email: "preview@example.com", token: "preview", unsubscribe_url: "#", coupons: { WELCOME10: "PREVIEW10" } }), { headers: { "content-type": "text/html" } });
}
