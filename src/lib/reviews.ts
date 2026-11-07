import { sql } from "@/lib/db";
import { shopifyGraphql } from "@/lib/shopify";
import { hiddenHandles, parentsOnly } from "@/lib/hidden-products";
import { sendEmail } from "@/lib/ses";

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

const esc = (t: string) => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Email the team about a new review (addresses from settings 'review_notify', default ryan@). */
export async function notifyNewReview(reviewId: number) {
  try {
    const [r] = await sql`select * from reviews where id = ${reviewId}`;
    if (!r) return;
    const [s] = await sql`select value from settings where key = 'review_notify'`;
    const [m] = await sql`select value from settings where key = 'review_notify_mode'`;
    if (String(m?.value ?? "all") === "low" && r.rating > 3) return; // only 3 stars and below
    const to = String(s?.value ?? "ryan@bluebellscakery.co.nz").split(/[,\s]+/).filter(x => x.includes("@"));
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
    const photos = (r.photos as string[]).map(u => `<img src="${u}" width="120" style="border-radius:8px;margin:4px 4px 0 0">`).join("");
    const html = `<div style="font-family:Arial,sans-serif;color:#262967;max-width:560px">
      <p style="font-size:13px;margin:0 0 6px;opacity:.7">New review via Bluebells EDM</p>
      <div style="font-size:26px;letter-spacing:2px">${stars}</div>
      <h2 style="margin:8px 0 4px;font-size:18px">${esc(r.product_title ?? r.product_handle)}</h2>
      ${r.title ? `<p style="font-weight:bold;margin:8px 0 0">${esc(r.title)}</p>` : ""}
      <p style="margin:6px 0 10px;white-space:pre-wrap">${esc(r.body ?? "(no comment)")}</p>${photos}
      <p style="font-size:13px;margin:14px 0 0">${esc(r.name ?? "")} · ${esc(r.email ?? "")} · order ${esc(r.order_name ?? "")}</p>
      <p style="font-size:13px;margin:4px 0 0">Judge.me: ${r.status === "sent" ? "posted" : r.status === "error" ? "FAILED – " + esc(r.judgeme_error ?? "") : "pending"}</p>
      <p style="margin:16px 0 0"><a href="https://admin.shopify.com/store/bluebells-cakery/apps/judgeme" style="background:#e4c5e0;color:#262967;text-decoration:none;padding:9px 18px;border-radius:30px;font-weight:bold;font-size:14px">Moderate in Judge.me</a>
      &nbsp; <a href="${process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz"}/reviews" style="color:#262967;font-size:14px">All reviews</a></p></div>`;
    for (const addr of to) await sendEmail({ to: addr, subject: `${stars} ${r.rating}-star review: ${r.product_title ?? r.product_handle}`, html, text: `${r.rating}-star review for ${r.product_title}: ${r.body ?? ""} — ${r.name} (${r.email})`, fromName: "Bluebells EDM", replyTo: r.email ?? undefined, tags: { type: "review_notify" } });
  } catch (e) { console.error("review notify failed", e); }
}
