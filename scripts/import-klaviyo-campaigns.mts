import { sql } from "../src/lib/db";
import { uploadToShopifyFiles } from "../src/lib/shopify-files";
import { basename, extname } from "node:path";

const H = { Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`, revision: "2025-10-15", accept: "application/vnd.api+json" };
const LIMIT = Number(process.argv[2] ?? 12);

const r = await fetch(`https://a.klaviyo.com/api/campaigns?filter=equals(messages.channel,'email'),equals(status,'Sent')&sort=-scheduled_at&page[size]=${LIMIT}&include=campaign-messages`, { headers: H });
const j = await r.json();
const seenTpl = new Set<string>();
for (const c of j.data) {
  const name: string = c.attributes.name.trim();
  const sent: string = (c.attributes.send_time ?? "").slice(0, 10);
  const ids = c.relationships?.["campaign-messages"]?.data?.map((d: { id: string }) => d.id) ?? [];
  const msgs = (j.included ?? []).filter((i: { type: string; id: string }) => i.type === "campaign-message" && ids.includes(i.id));
  for (const m of msgs) {
    const tplId: string | undefined = m.relationships?.template?.data?.id;
    if (!tplId || seenTpl.has(tplId)) continue;
    seenTpl.add(tplId);
    const subject: string | null = m.attributes?.definition?.content?.subject ?? null;
    const t = await (await fetch(`https://a.klaviyo.com/api/templates/${tplId}`, { headers: H })).json();
    let html: string = t.data?.attributes?.html ?? "";
    if (!html) { console.log("no html for", name); continue; }

    const folder = `klaviyo/${sent} ${name}`.replace(/[^\w\-/ .&()]/g, "");
    const urls = [...new Set([...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map(x => x[1]).filter(u => /klaviyomail|cloudfront/.test(u)))];
    console.log(`${sent} ${name} — ${urls.length} images`);
    for (const u of urls) {
      const existing = (await sql`select url from media where source_url = ${u}`)[0];
      if (existing) { html = html.split(u).join(existing.url); continue; }
      try {
        const res = await fetch(u); if (!res.ok) throw new Error(String(res.status));
        const buf = Buffer.from(await res.arrayBuffer());
        const mime = res.headers.get("content-type")?.split(";")[0] ?? "image/png";
        const isSocial = u.includes("/assets/email/");
        const fname = isSocial ? `klaviyo-${basename(u)}` : `${name.replace(/[^\w-]+/g, "-").toLowerCase()}-${basename(u)}`.slice(0, 120);
        const f = await uploadToShopifyFiles(buf, fname, mime, isSocial ? "" : name);
        await sql`insert into media (shopify_file_id, url, filename, mime, width, height, bytes, folder, tags, source, source_url, alt)
                  values (${f.id}, ${f.url}, ${fname}, ${mime}, ${f.width ?? null}, ${f.height ?? null}, ${buf.length}, ${isSocial ? "klaviyo/social icons" : folder},
                          ${isSocial ? ["social"] : ["campaign", extname(u).slice(1).toLowerCase()]}, 'klaviyo', ${u}, ${isSocial ? "" : name})`;
        html = html.split(u).join(f.url);
        process.stdout.write(".");
      } catch (e) { console.log("\n  failed", u, (e as Error).message); }
    }
    await sql`insert into templates (name, design, html, kind, source, source_ref, subject)
              values (${`${sent} · ${name}`}, '{}'::jsonb, ${html}, 'html', 'klaviyo', ${tplId}, ${subject})
              on conflict (source_ref) do update set html = excluded.html, subject = excluded.subject, updated_at = now()`;
    console.log(" saved");
  }
}
console.log("media:", (await sql`select count(*) from media`)[0].count, "html templates:", (await sql`select count(*) from templates where kind='html'`)[0].count);
