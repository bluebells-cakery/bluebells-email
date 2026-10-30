import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { shopifyGraphql } from "@/lib/shopify";

const POOLS: Record<string, { percentage: number; days: number }> = { WELCOME10: { percentage: 0.1, days: 31 } };
const code = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const b = randomBytes(8); return [...b].map(x => a[x % a.length]).join(""); };

/** Creates a Shopify discount batch (mirrors Klaviyo's monthly "WELCOME10 (date)" batches) with N single-use codes. */
async function createBatch(pool: string, n = 100) {
  const cfg = POOLS[pool]; if (!cfg) throw new Error("unknown coupon pool " + pool);
  const codes = Array.from({ length: n }, code);
  const startsAt = new Date(), endsAt = new Date(Date.now() + cfg.days * 86400e3);
  const title = `${pool} (EDM ${startsAt.toISOString().slice(0, 16).replace("T", " ")})`;
  const r = await shopifyGraphql<{ discountCodeBasicCreate: { codeDiscountNode: { id: string } | null; userErrors: { message: string; field?: string[] }[] } }>(`
    mutation($d: DiscountCodeBasicInput!) { discountCodeBasicCreate(basicCodeDiscount: $d) { codeDiscountNode { id } userErrors { field message } } }`, {
    d: { title, code: codes[0], startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), usageLimit: 1, appliesOncePerCustomer: true,
         combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false },
         customerSelection: { all: true }, customerGets: { value: { percentage: cfg.percentage }, items: { all: true } } } });
  if (r.discountCodeBasicCreate.userErrors.length) throw new Error(r.discountCodeBasicCreate.userErrors.map(e => e.message).join("; "));
  const id = r.discountCodeBasicCreate.codeDiscountNode!.id;
  if (codes.length > 1) {
    const b = await shopifyGraphql<{ discountRedeemCodeBulkAdd: { bulkCreationId?: string; userErrors: { message: string }[] } }>(`
      mutation($id: ID!, $codes: [DiscountRedeemCodeInput!]!) { discountRedeemCodeBulkAdd(discountId: $id, codes: $codes) { bulkCreation { id } userErrors { message } } }`,
      { id, codes: codes.slice(1).map(c => ({ code: c })) });
    if (b.discountRedeemCodeBulkAdd.userErrors.length) throw new Error(b.discountRedeemCodeBulkAdd.userErrors.map(e => e.message).join("; "));
  }
  await sql`insert into coupons (code, pool, discount_id, expires_at) select c, ${pool}, ${id}, ${endsAt.toISOString()} from unnest(${codes}::text[]) c on conflict do nothing`;
  return codes.length;
}

/** Returns the contact's code for this pool (assigning a fresh one if needed; tops up the pool when low). */
export async function getCoupon(pool: string, contactId: number): Promise<string> {
  const have = await sql`select code from coupons where pool = ${pool} and contact_id = ${contactId} and expires_at > now() limit 1`;
  if (have[0]) return have[0].code;
  const free = (await sql`select count(*)::int n from coupons where pool = ${pool} and contact_id is null and expires_at > now() + interval '7 days'`)[0].n;
  if (free < 20) await createBatch(pool, 100);
  const [c] = await sql`update coupons set contact_id = ${contactId}, assigned_at = now() where code = (
      select code from coupons where pool = ${pool} and contact_id is null and expires_at > now() + interval '7 days' order by created_at limit 1 for update skip locked)
    returning code`;
  if (!c) throw new Error("no coupon available");
  return c.code;
}
