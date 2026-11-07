import { NextRequest, NextResponse } from "next/server";
import { reviewCtx } from "@/lib/reviews";
import { uploadToShopifyFiles } from "@/lib/shopify-files";

export const maxDuration = 60;
// Customer review photo (resized in the browser to ≤1600px JPEG) → Shopify Files.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await reviewCtx(token);
  if (!ctx) return NextResponse.json({ error: "expired" }, { status: 404 });
  const f = (await req.formData()).get("file");
  if (!(f instanceof File) || !f.type.startsWith("image/") || f.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Please upload a photo under 4 MB." }, { status: 400 });
  const buf = Buffer.from(await f.arrayBuffer());
  const up = await uploadToShopifyFiles(buf, `review-${(ctx.orderName || "order").replace(/\W/g, "")}-${Date.now()}.jpg`, "image/jpeg", "Customer review photo");
  return NextResponse.json({ url: up.url });
}
