import { SITE_URL } from "@/lib/site";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ products: [] });
  const u = `${SITE_URL}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10&resources[options][unavailable_products]=hide`;
  const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 BluebellsEDM" } });
  const j = await r.json();
  const products = (j.resources?.results?.products ?? []).map((p: Record<string, unknown>) => ({
    id: p.id, title: p.title, handle: p.handle, url: `${SITE_URL}${p.url}`.split("?")[0],
    image: typeof p.image === "string" ? p.image.replace(/(\.[a-z]+)(\?.*)?$/i, "_600x600$1") : null,
    price: p.price, compareAt: p.compare_at_price_max && p.compare_at_price_max !== "0.00" ? p.compare_at_price_max : null,
  }));
  return NextResponse.json({ products });
}
