import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/** Add (or remove) a tag on many contacts: { tag, emails: string[], remove?: boolean }. */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const tag = String(b.tag || "").trim(); const emails: string[] = Array.isArray(b.emails) ? b.emails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean) : [];
  if (!tag || !emails.length) return NextResponse.json({ error: "tag and emails required" }, { status: 400 });
  const rows = b.remove
    ? await sql`update contacts set tags = array_remove(tags, ${tag}), updated_at = now() where lower(email::text) = any(${emails}) returning id`
    : await sql`update contacts set tags = array_append(array_remove(tags, ${tag}), ${tag}), updated_at = now() where lower(email::text) = any(${emails}) returning id`;
  return NextResponse.json({ ok: true, updated: rows.length });
}
