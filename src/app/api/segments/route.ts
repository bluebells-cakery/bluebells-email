import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { translate } from "@/lib/rules";

/** List segments, or create one: { name, definition } (Klaviyo-style condition_groups; see lib/rules.ts). */
export async function GET() {
  const rows = await sql`select id, name, definition, created_at from segments order by name`;
  return NextResponse.json({ items: rows.map(r => ({ ...r, words: translate(r.definition).words })) });
}
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.name || !b.definition) return NextResponse.json({ error: "name and definition required" }, { status: 400 });
  const t = translate(b.definition);
  if (!t.supported) return NextResponse.json({ error: "unsupported condition", unsupported: t.unsupported }, { status: 400 });
  const [row] = await sql`insert into segments (name, definition) values (${b.name}, ${JSON.stringify(b.definition)}::jsonb) returning id`;
  const n = Number((await sql.query(`select count(*)::int n from contacts c where c.status = 'subscribed' and (${t.sql})`))[0].n);
  return NextResponse.json({ id: row.id, words: t.words, subscribed_matches: n });
}
