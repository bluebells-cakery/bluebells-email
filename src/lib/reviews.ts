import { sql } from "@/lib/db";
import { shopifyGraphql } from "@/lib/shopify";
import { hiddenHandles, parentsOnly } from "@/lib/hidden-products";

export type ReviewItem = { title: string; handle: string; image: string | null };
export type ReviewCtx = { sendId: number | null; contactId: number | null; firstName: string; lastName: string; email: string; orderName: string; items: ReviewItem[]; preview: boolean; done: Record<string, number> };

/** Resolve a review link token (the email's send token) to the customer + parent products in their order. "preview" = sample data for staff. */
export async function reviewCtx(token: string): Promise<ReviewCtx | null> {
  const hidden = await hiddenHandles();
  if (token === "preview") {
    const [r] = await sql`select context from flow_runs where step_id = 'rr-email' and status = 'active' and jsonb_array_length(coalesce(context->'order'->'line_items','[]'::jsonb)) >= 3 order by next_at limit 1`;
    const items = parentsOnly<ReviewItem>(r?.context?.order?.line_items ?? [], hidden).filter(i => i.handle);
    return { sendId: null, contactId: null, firstName: "Ryan", lastName: "Sharma", email: "ryan@bluebellscakery.co.nz", orderName: r?.context?.order?.name ?? "#PREVIEW", items, preview: true, done: {} };
  }
  if (!/^[a-f0-9]{16,40}$/.test(token)) return null;
  const [q] = await sql`select q.id, q.contact_id, r.context, c.first_name, c.last_name, c.email from send_queue q join flow_runs r on r.id = q.flow_run_id join contacts c on c.id = q.contact_id where q.token = ${token}`;
  if (!q) return null;
  const items = parentsOnly<ReviewItem>(q.context?.order?.line_items ?? [], hidden).filter(i => i.handle);
  const done = Object.fromEntries((await sql`select product_handle, rating from reviews where send_id = ${q.id}`).map(r => [r.product_handle, r.rating]));
  return { sendId: Number(q.id), contactId: Number(q.contact_id), firstName: q.first_name ?? "", lastName: q.last_name ?? "", email: q.email, orderName: q.context?.order?.name ?? "", items, preview: false, done };
}

async function productId(handle: string): Promise<number | null> {
  const d = await shopifyGraphql<{ productByHandle: { id: string } | null }>(`query($h: String!) { productByHandle(handle: $h) { id } }`, { h: handle });
  const id = d.productByHandle?.id?.split("/").pop(); return id ? Number(id) : null;
}

/** Create the review in Judge.me (verified when the email matches a Shopify order). */
export async function pushToJudgeme(reviewId: number) {
  const [r] = await sql`select * from reviews where id = ${reviewId}`;
  if (!r || !process.env.JUDGEME_API_TOKEN) return;
  try {
    const pid = r.shopify_product_id ?? await productId(r.product_handle);
    const pics = Object.fromEntries((r.photos as string[]).map((u, i) => [String(i), u]));
    const body = { shop_domain: process.env.JUDGEME_SHOP_DOMAIN, platform: "shopify", api_token: process.env.JUDGEME_API_TOKEN,
      id: pid, handle: r.product_handle, product_title: r.product_title, name: r.name, email: r.email, rating: r.rating,
      title: (r.title ?? "").slice(0, 100), body: r.body || " ", picture_urls: pics };
    const res = await fetch("https://judge.me/api/v1/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const txt = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${txt.slice(0, 200)}`);
    await sql`update reviews set status = 'sent', shopify_product_id = ${pid}, pushed_at = now(), judgeme_error = null where id = ${reviewId}`;
  } catch (e) {
    await sql`update reviews set status = 'error', judgeme_error = ${(e as Error).message.slice(0, 500)} where id = ${reviewId}`;
  }
}
