import { sql } from "@/lib/db";
import { BLANK_DESIGN } from "@/lib/blank-design";

/** Gives a campaign its own email: a copy of the most recent campaign's design ("last") or a blank branded one ("scratch"). */
export async function startCampaignEmail(id: number | string, start: "last" | "scratch") {
  let tpl: Record<string, any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (start === "last") {
    const [src] = await sql`select t.* from campaigns c join templates t on t.id = c.template_id
      where c.id <> ${id} and coalesce(c.source, '') <> 'klaviyo' and t.design is not null order by c.updated_at desc limit 1`;
    if (src) [tpl] = await sql`insert into templates (name, kind, design, html, subject, preview_text, from_name, from_email, reply_to)
      values (${`Campaign ${id} email`}, 'unlayer', ${JSON.stringify(src.design)}::jsonb, ${src.html}, ${src.subject}, ${src.preview_text}, ${src.from_name}, ${src.from_email}, ${src.reply_to}) returning id`;
  }
  if (!tpl) [tpl] = await sql`insert into templates (name, kind, design) values (${`Campaign ${id} email`}, 'unlayer', ${JSON.stringify(BLANK_DESIGN)}::jsonb) returning id`;
  await sql`update campaigns set template_id = ${tpl.id}, html = (select html from templates where id = ${tpl.id}), design = (select design from templates where id = ${tpl.id}), updated_at = now() where id = ${id} and status = 'draft'`;
  return Number(tpl.id);
}
