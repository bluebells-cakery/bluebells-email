import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { reviewCtx, pushToJudgeme } from "@/lib/reviews";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await reviewCtx(token);
  if (!ctx) return NextResponse.json({ error: "This review link has expired." }, { status: 404 });
  const b = await req.json() as { handle: string; rating: number; title?: string; body?: string; name?: string; photos?: string[] };
  const item = ctx.items.find(i => i.handle === b.handle);
  const rating = Math.round(Number(b.rating));
  if (!item || !(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "Please choose a star rating." }, { status: 400 });
  const photos = (b.photos ?? []).filter(u => /^https:\/\/cdn\.shopify\.com\//.test(u)).slice(0, 4);
  const name = (b.name ?? "").trim().slice(0, 60) || `${ctx.firstName} ${ctx.lastName.slice(0, 1)}`.trim() || "Bluebells customer";
  if (ctx.preview) return NextResponse.json({ ok: true, preview: true });
  const [row] = await sql`insert into reviews (send_id, contact_id, order_name, product_handle, product_title, product_image, rating, title, body, name, email, photos)
    values (${ctx.sendId}, ${ctx.contactId}, ${ctx.orderName}, ${item.handle}, ${item.title}, ${item.image}, ${rating}, ${(b.title ?? "").trim().slice(0, 100) || null}, ${(b.body ?? "").trim().slice(0, 5000) || null}, ${name}, ${ctx.email}, ${JSON.stringify(photos)}::jsonb)
    on conflict (send_id, product_handle) do nothing returning id`;
  if (!row) return NextResponse.json({ ok: true, duplicate: true });
  await pushToJudgeme(Number(row.id));
  return NextResponse.json({ ok: true });
}
