import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { sql } from "@/lib/db";
import { uploadToShopifyFiles } from "@/lib/shopify-files";

// Rasterises an SVG (passed as text) to PNG at the requested width and stores it in the media library.
export async function POST(req: NextRequest) {
  const { svg, filename, width = 1200 } = await req.json();
  if (typeof svg !== "string" || !svg.startsWith("<svg")) return NextResponse.json({ error: "svg required" }, { status: 400 });
  const png = await sharp(Buffer.from(svg), { density: 300 }).resize({ width: Math.min(Number(width) || 1200, 3000) }).png().toBuffer();
  const meta = await sharp(png).metadata();
  const fname = `${String(filename ?? "element").replace(/[^\w-]+/g, "-")}.png`;
  const up = await uploadToShopifyFiles(png, fname, "image/png", "");
  const [row] = await sql`insert into media (shopify_file_id, url, filename, mime, width, height, bytes, folder, tags, source)
    values (${up.id}, ${up.url}, ${fname}, 'image/png', ${meta.width ?? null}, ${meta.height ?? null}, ${png.length}, 'brand elements', '{brand}', 'brand') returning id, url`;
  return NextResponse.json(row);
}
