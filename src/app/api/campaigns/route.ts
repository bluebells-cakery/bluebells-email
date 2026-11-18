import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { BLANK_DESIGN } from "@/lib/blank-design";

/** New campaign. {start:"last"} copies the design of the most recent campaign; {start:"scratch"} starts a blank branded email.
 *  Either way the campaign gets its own template, so editing it never changes another campaign. */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const [row] = await sql`insert into campaigns (name, from_name, from_email, status) values (${b.name ?? "Untitled campaign"}, 'Bluebells Cakery', ${process.env.SES_FROM_EMAIL ?? null}, 'draft') returning id`;
  const id = row.id;
  let tpl: Record<string, any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (b.start === "last") {
    const [src] = await sql`select t.* from campaigns c join templates t on t.id = c.template_id
      where c.id <> ${id} and coalesce(c.source, '') <> 'klaviyo' and t.design is not null order by c.updated_at desc limit 1`;
    if (src) [tpl] = await sql`insert into templates (name, kind, design, html, subject, preview_text, from_name, from_email, reply_to)
      values (${`Campaign ${id} email`}, 'unlayer', ${JSON.stringify(src.design)}::jsonb, ${src.html}, ${src.subject}, ${src.preview_text}, ${src.from_name}, ${src.from_email}, ${src.reply_to}) returning id`;
  }
  if (!tpl && (b.start === "last" || b.start === "scratch"))
    [tpl] = await sql`insert into templates (name, kind, design) values (${`Campaign ${id} email`}, 'unlayer', ${JSON.stringify(BLANK_DESIGN)}::jsonb) returning id`;
  if (tpl) await sql`update campaigns set template_id = ${tpl.id}, html = (select html from templates where id = ${tpl.id}), design = (select design from templates where id = ${tpl.id}) where id = ${id}`;
  return NextResponse.json({ id, templateId: tpl?.id ?? null });
}
