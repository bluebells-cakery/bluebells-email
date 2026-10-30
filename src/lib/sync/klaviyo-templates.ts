import { sql } from "@/lib/db";
import { uploadToShopifyFiles } from "@/lib/shopify-files";
import { basename, extname } from "node:path";

export const KH = () => ({ Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`, revision: "2025-10-15", accept: "application/vnd.api+json" });
export async function kget(url: string): Promise<Record<string, unknown> & { data?: unknown; included?: unknown[]; links?: { next?: string } }> {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: KH() });
    if (r.status === 429 && i < 10) { await new Promise(res => setTimeout(res, Number(r.headers.get("retry-after") ?? 2) * 1000 + 500)); continue; }
    const j = await r.json(); if (!r.ok) throw new Error(`Klaviyo ${r.status}: ${JSON.stringify(j).slice(0, 300)}`); return j;
  }
}

/** Imports a Klaviyo template (html + images → Shopify Files) as an 'html' template row. Returns template id. */
export async function importKlaviyoTemplate(tplId: string, opts: { name: string; subject?: string | null; previewText?: string | null; fromName?: string | null; fromEmail?: string | null; replyTo?: string | null; folder: string; log?: (s: string) => void }) {
  const t = await kget(`https://a.klaviyo.com/api/templates/${tplId}`) as { data: { attributes: { html?: string; name?: string } } };
  let html: string = t.data?.attributes?.html ?? "";
  if (!html) return null;
  const urls = [...new Set([...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map(x => x[1]).filter(u => /klaviyomail|cloudfront/.test(u)))];
  for (const u of urls) {
    const existing = (await sql`select url from media where source_url = ${u}`)[0];
    if (existing) { html = html.split(u).join(existing.url); continue; }
    try {
      const res = await fetch(u); if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type")?.split(";")[0] ?? "image/png";
      const isSocial = u.includes("/assets/email/");
      const fname = (isSocial ? `klaviyo-${basename(u)}` : `${opts.name.replace(/[^\w-]+/g, "-").toLowerCase()}-${basename(u)}`).slice(0, 120);
      const f = await uploadToShopifyFiles(buf, fname, mime, isSocial ? "" : opts.name);
      await sql`insert into media (shopify_file_id, url, filename, mime, width, height, bytes, folder, tags, source, source_url, alt)
                values (${f.id}, ${f.url}, ${fname}, ${mime}, ${f.width ?? null}, ${f.height ?? null}, ${buf.length}, ${isSocial ? "klaviyo/social icons" : opts.folder},
                        ${isSocial ? ["social"] : ["flow", extname(u).slice(1).toLowerCase()]}, 'klaviyo', ${u}, ${isSocial ? "" : opts.name})
                on conflict (source_url) do nothing`;
      html = html.split(u).join(f.url);
      opts.log?.(".");
    } catch (e) { opts.log?.(`\n  image failed ${u}: ${(e as Error).message}\n`); }
  }
  const [row] = await sql`insert into templates (name, design, html, kind, source, source_ref, subject, preview_text, from_name, from_email, reply_to)
    values (${opts.name}, '{}'::jsonb, ${html}, 'html', 'klaviyo', ${tplId}, ${opts.subject ?? null}, ${opts.previewText ?? null}, ${opts.fromName ?? null}, ${opts.fromEmail ?? null}, ${opts.replyTo ?? null})
    on conflict (source_ref) do update set html = excluded.html, name = excluded.name, subject = excluded.subject, preview_text = excluded.preview_text, from_name = excluded.from_name, from_email = excluded.from_email, reply_to = excluded.reply_to, updated_at = now()
    returning id`;
  return row.id as number;
}
