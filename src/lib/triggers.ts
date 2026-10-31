import { SITE_URL } from "@/lib/site";
import { sql } from "@/lib/db";
import { shopifyGraphql } from "@/lib/shopify";
import { startFlow } from "@/lib/engine";
import { kget } from "@/lib/sync/klaviyo-templates";
import { getSetting } from "@/lib/settings";

const gid = (g: string) => Number(g.split("/").pop());
const imgCache = new Map<string, { image: string | null; handle: string | null }>();
async function productLookup(title: string) {
  const key = title.split(" - ")[0].trim();
  if (imgCache.has(key)) return imgCache.get(key)!;
  let out = { image: null as string | null, handle: null as string | null };
  try {
    const r = await fetch(`${SITE_URL}/search/suggest.json?q=${encodeURIComponent(key)}&resources[type]=product&resources[limit]=5`, { headers: { "user-agent": "Mozilla/5.0 BluebellsEDM" } });
    const j = await r.json(); const ps = j.resources?.results?.products ?? [];
    const p = ps.find((x: { title: string }) => x.title.toLowerCase() === key.toLowerCase()) ?? ps[0];
    if (p) out = { image: typeof p.image === "string" ? p.image.replace(/(\.[a-z]+)(\?.*)?$/i, "_400x400$1") : null, handle: p.handle ?? null };
  } catch { /* ignore */ }
  imgCache.set(key, out); return out;
}
async function state(key: string, dflt: string) { return (await sql`select value from sync_state where key = ${key}`)[0]?.value ?? dflt; }
async function setState(key: string, value: string) { await sql`insert into sync_state(key, value) values (${key}, ${value}) on conflict (key) do update set value = excluded.value, updated_at = now()`; }
async function flowId(name: string): Promise<number | null> { const r = await sql`select id from flows where name = ${name} limit 1`; return r[0]?.id ?? null; }
async function contactByEmail(email: string, first?: string | null, last?: string | null) {
  const [c] = await sql`insert into contacts (email, first_name, last_name, status, unsubscribe_token) values (${email.toLowerCase()}, ${first ?? null}, ${last ?? null}, 'never_subscribed', encode(gen_random_bytes(12),'hex'))
    on conflict (email) do update set first_name = coalesce(contacts.first_name, excluded.first_name), last_name = coalesce(contacts.last_name, excluded.last_name) returning id, status, first_name`;
  return c;
}

/** New orders since last tick → orders table, mark checkouts completed, start Post Purchase + Customer Winback. */
export async function pollOrders(log?: (s: string) => void) {
  const since = await state("orders_since", new Date(Date.now() - 3600e3).toISOString());
  const pp = await flowId("Post Purchase"), wb = await flowId("Customer Winback");
  let cursor: string | null = null, n = 0, newest = since;
  do {
    const d: { orders: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: { id: string; email: string | null; createdAt: string; cancelledAt: string | null; name: string; currentTotalPriceSet: { shopMoney: { amount: string } }; customer: { firstName: string | null; lastName: string | null; emailMarketingConsent: { marketingState: string } | null } | null; tags: string[]; customAttributes: { key: string; value: string }[]; lineItems: { nodes: { title: string; quantity: number; image: { url: string } | null; product: { handle: string; title: string } | null }[] } }[] } } =
      await shopifyGraphql(`query($cursor: String, $q: String) { orders(first: 50, after: $cursor, query: $q, sortKey: CREATED_AT) { pageInfo { hasNextPage endCursor }
        nodes { id email name createdAt cancelledAt currentTotalPriceSet { shopMoney { amount } } customer { firstName lastName emailMarketingConsent { marketingState } } tags customAttributes { key value } lineItems(first: 20) { nodes { title quantity image { url } product { handle title } } } } } }`, { cursor, q: `created_at:>'${since}'` });
    for (const o of d.orders.nodes) {
      if (o.createdAt > newest) newest = o.createdAt;
      if (!o.email || o.cancelledAt) continue;
      const c = await contactByEmail(o.email, o.customer?.firstName, o.customer?.lastName);
      if (o.customer?.emailMarketingConsent?.marketingState === "SUBSCRIBED" && c.status === "never_subscribed") await sql`update contacts set status='subscribed', consent_source='shopify', consent_at=now() where id=${c.id}`;
      const attr = (k: string) => o.customAttributes?.find(a => a.key === k)?.value;
      const tagDate = o.tags?.find(t => /^\d{2}\/\d{2}\/\d{4}$/.test(t));
      const attrDate = attr("Delivery-Date") ?? attr("Pickup-Date");
      const fulfil = tagDate ? tagDate.split("/").reverse().join("-") : attrDate ? attrDate.replace(/\//g, "-") : null;
      const method = (attr("Checkout-Method") ?? (o.tags?.includes("Pickup Order") ? "pickup" : o.tags?.includes("Delivery Order") ? "delivery" : null));
      const items = o.lineItems.nodes.map(li => ({ title: li.product?.title ?? li.title, variant: li.title, quantity: li.quantity, handle: li.product?.handle ?? null, image: li.image?.url ?? null }));
      const [ins] = await sql`insert into orders (shopify_order_id, contact_id, email, total, placed_at, first_name, line_items, fulfil_date, method)
        values (${gid(o.id)}, ${c.id}, ${o.email.toLowerCase()}, ${Number(o.currentTotalPriceSet.shopMoney.amount)}, ${o.createdAt}, ${o.customer?.firstName ?? null}, ${JSON.stringify(items)}::jsonb, ${fulfil}, ${method})
        on conflict (shopify_order_id) do update set contact_id = coalesce(orders.contact_id, excluded.contact_id), fulfil_date = coalesce(excluded.fulfil_date, orders.fulfil_date), line_items = coalesce(excluded.line_items, orders.line_items) returning (xmax = 0) as inserted`;
      await sql`update contacts set last_order_at = greatest(coalesce(last_order_at, '1970-01-01'), ${o.createdAt}::timestamptz), order_count = (select count(*) from orders where contact_id = ${c.id}), total_spent = (select coalesce(sum(total),0) from orders where contact_id = ${c.id}), updated_at = now() where id = ${c.id}`;
      await sql`update checkouts set completed_at = ${o.createdAt}::timestamptz, recovered = exists(select 1 from send_queue q join flow_runs r on r.id = q.flow_run_id where r.contact_id = ${c.id} and q.status = 'sent' and q.sent_at > now() - interval '5 days') where contact_id = ${c.id} and completed_at is null`;
      await sql`update flow_runs r set status = 'cancelled', finished_at = now() from flows f where f.id = r.flow_id and f.name like 'Abandoned Cart%' and r.contact_id = ${c.id} and r.status = 'active'`;
      if (ins?.inserted) {
        const ctx = { order: { name: o.name, fulfil_date: fulfil, method, line_items: items } };
        if (pp) await startFlow(pp, c.id, `order:${gid(o.id)}`, ctx);
        if (wb) await startFlow(wb, c.id, `order:${gid(o.id)}`, ctx);
        n++;
      }
    }
    cursor = d.orders.pageInfo.hasNextPage ? d.orders.pageInfo.endCursor : null;
  } while (cursor);
  await setState("orders_since", newest);
  log?.(`orders: ${n} new`);
  return n;
}

/** Abandoned checkouts (REST) → checkouts table → start Abandoned Cart flow (delay lives in the flow). */
export async function pollCheckouts(log?: (s: string) => void) {
  const token = await getSetting("shopify_access_token"); if (!token) return 0;
  const since = await state("checkouts_since", new Date(Date.now() - 6 * 3600e3).toISOString());
  const ac = await flowId("Abandoned Cart Reminder (Email)");
  const r = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2026-10/checkouts.json?status=open&updated_at_min=${encodeURIComponent(since)}&limit=250`, { headers: { "X-Shopify-Access-Token": token } });
  if (!r.ok) { log?.(`checkouts: ${r.status}`); return 0; }
  const { checkouts } = await r.json() as { checkouts: { token: string; id: number; email: string | null; abandoned_checkout_url: string; total_price: string; created_at: string; updated_at: string; completed_at: string | null; customer?: { first_name?: string; last_name?: string }; line_items: { title: string; quantity: number; price: string; line_price: string; product_id?: number; variant_id?: number; image_url?: string; handle?: string }[] }[] };
  let n = 0, newest = since;
  for (const ck of checkouts) {
    if (ck.updated_at > newest) newest = ck.updated_at;
    if (!ck.email || ck.completed_at || !ck.line_items?.length) continue;
    const c = await contactByEmail(ck.email, ck.customer?.first_name, ck.customer?.last_name);
    const items = [];
    for (const li of ck.line_items) { const p = await productLookup(li.title); items.push({ title: li.title, quantity: li.quantity, line_price: li.line_price ?? li.price, image: li.image_url ?? p.image, handle: li.handle ?? p.handle ?? undefined }); }
    await sql`insert into checkouts (token, shopify_checkout_id, email, contact_id, abandoned_url, line_items, total, created_at, updated_at)
      values (${ck.token}, ${ck.id}, ${ck.email.toLowerCase()}, ${c.id}, ${ck.abandoned_checkout_url}, ${JSON.stringify(items)}::jsonb, ${Number(ck.total_price)}, ${ck.created_at}, ${ck.updated_at})
      on conflict (token) do update set line_items = excluded.line_items, total = excluded.total, updated_at = excluded.updated_at, abandoned_url = excluded.abandoned_url`;
    // skip if they ordered since this checkout was created
    const ordered = (await sql`select 1 from orders where contact_id = ${c.id} and placed_at >= ${ck.created_at}::timestamptz limit 1`).length > 0;
    if (ordered || !ac) continue;
    if (await startFlow(ac, c.id, `checkout:${ck.token}`, { checkout: { url: ck.abandoned_checkout_url, line_items: items } })) n++;
  }
  await setState("checkouts_since", newest);
  log?.(`checkouts: ${checkouts.length} seen, ${n} flows started`);
  return n;
}

/** New subscribers: Klaviyo "Subscribed to Email Marketing" + form submissions since last tick (forms still live on the site) → start New Welcome Flow. */
export async function pollSubscribers(log?: (s: string) => void) {
  const since = await state("subs_since", new Date(Date.now() - 3600e3).toISOString());
  const wf = await flowId("New Welcome Flow");
  let n = 0, newest = since;
  for (const metric of ["UFh4eM", "RTHDqC"]) { // Subscribed to Email Marketing, Form submitted
    let url: string | null = `https://a.klaviyo.com/api/events?filter=equals(metric_id,"${metric}"),greater-than(datetime,${since})&sort=datetime&page[size]=100&include=profile&fields[profile]=email,first_name,last_name`;
    while (url) {
      const page = await kget(url) as { data: { attributes: { datetime: string }; relationships: { profile: { data: { id: string } } } }[]; included?: { id: string; attributes: { email: string; first_name: string | null; last_name: string | null } }[]; links?: { next?: string } };
      const prof = new Map((page.included ?? []).map(p => [p.id, p.attributes]));
      for (const e of page.data) {
        if (e.attributes.datetime > newest) newest = e.attributes.datetime;
        const p = prof.get(e.relationships.profile.data.id); if (!p?.email) continue;
        const c = await contactByEmail(p.email, p.first_name, p.last_name);
        if (c.status === "never_subscribed" || c.status === "unsubscribed") await sql`update contacts set status = 'subscribed', consent_source = 'klaviyo:form', consent_at = ${e.attributes.datetime}::timestamptz, updated_at = now() where id = ${c.id} and status <> 'suppressed'`;
        if (wf && await startFlow(wf, c.id, `signup:${p.email.toLowerCase()}`)) n++;
      }
      url = page.links?.next ?? null;
    }
  }
  await setState("subs_since", newest);
  log?.(`subscribers: ${n} welcome flows started`);
  return n;
}
