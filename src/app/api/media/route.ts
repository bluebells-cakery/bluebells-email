import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { uploadToShopifyFiles } from "@/lib/shopify-files";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const folder = req.nextUrl.searchParams.get("folder");
  const items = await sql`
    select id, url, filename, mime, width, height, bytes, folder, tags, alt, created_at from media
    where (${folder}::text is null or folder = ${folder})
      and (${q} = '' or filename ilike ${"%" + q + "%"} or alt ilike ${"%" + q + "%"} or folder ilike ${"%" + q + "%"} or ${q} = any(tags))
    order by created_at desc limit 500`;
  const folders = await sql`select folder, count(*)::int as n from media group by folder order by folder desc`;
  return NextResponse.json({ items, folders });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const folder = String(form.get("folder") ?? "uploads");
  const out = [];
  for (const f of form.getAll("files")) {
    if (!(f instanceof File)) continue;
    const buf = Buffer.from(await f.arrayBuffer());
    const mime = f.type || "application/octet-stream";
    const up = await uploadToShopifyFiles(buf, f.name, mime, "");
    const [row] = await sql`insert into media (shopify_file_id, url, filename, mime, width, height, bytes, folder, tags, source)
      values (${up.id}, ${up.url}, ${f.name}, ${mime}, ${up.width ?? null}, ${up.height ?? null}, ${buf.length}, ${folder}, '{}', 'upload') returning id, url, filename, width, height, folder`;
    out.push(row);
  }
  return NextResponse.json({ items: out });
}
