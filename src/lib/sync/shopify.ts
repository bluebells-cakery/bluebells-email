import { sql } from "@/lib/db";
import { shopifyGraphql } from "@/lib/shopify";

type Customer = {
  id: string; email: string | null; firstName: string | null; lastName: string | null; phone: string | null;
  numberOfOrders: string; amountSpent: { amount: string }; createdAt: string; updatedAt: string; tags: string[];
  emailMarketingConsent: { marketingState: string; marketingOptInLevel: string | null; consentUpdatedAt: string | null } | null;
  lastOrder: { createdAt: string } | null;
  defaultAddress: { city: string | null; country: string | null } | null;
};
type Order = { id: string; email: string | null; createdAt: string; cancelledAt: string | null; currentTotalPriceSet: { shopMoney: { amount: string } }; customer: { id: string } | null };

const gid = (g: string) => Number(g.split("/").pop());

export async function syncShopifyCustomers(opts: { since?: string; log?: (s: string) => void } = {}) {
  let cursor: string | null = null, n = 0;
  const query = opts.since ? `updated_at:>=${opts.since}` : null;
  do {
    const data: { customers: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: Customer[] } } = await shopifyGraphql(`
      query($cursor: String, $query: String) {
        customers(first: 250, after: $cursor, query: $query, sortKey: UPDATED_AT) {
          pageInfo { hasNextPage endCursor }
          nodes { id email firstName lastName phone numberOfOrders amountSpent { amount } createdAt updatedAt tags
            emailMarketingConsent { marketingState marketingOptInLevel consentUpdatedAt }
            lastOrder { createdAt } defaultAddress { city country } }
        } }`, { cursor, query });
    const rows = data.customers.nodes.filter(c => c.email).map(c => {
      const state = c.emailMarketingConsent?.marketingState ?? "NOT_SUBSCRIBED";
      const status = state === "SUBSCRIBED" ? "subscribed" : state === "UNSUBSCRIBED" ? "unsubscribed" : "never_subscribed";
      return {
        email: c.email!.trim().toLowerCase(), first_name: c.firstName, last_name: c.lastName, phone: c.phone, shopify_customer_id: gid(c.id), status,
        consent_source: status === "subscribed" ? "shopify" : null,
        consent_at: status === "subscribed" ? c.emailMarketingConsent?.consentUpdatedAt ?? null : null,
        unsubscribed_at: status === "unsubscribed" ? c.emailMarketingConsent?.consentUpdatedAt ?? null : null,
        last_order_at: c.lastOrder?.createdAt ?? null, order_count: Number(c.numberOfOrders), total_spent: Number(c.amountSpent.amount),
        tags: c.tags, created_at: c.createdAt, city: c.defaultAddress?.city ?? null, country: c.defaultAddress?.country ?? null,
      };
    });
    // de-dupe within page (Shopify can have two customers with same email in different case)
    const seen = new Set<string>(); const uniq = rows.filter(r => !seen.has(r.email) && seen.add(r.email));
    if (uniq.length) await sql`
      insert into contacts (email, first_name, last_name, phone, shopify_customer_id, status, consent_source, consent_at, unsubscribed_at,
                            last_order_at, order_count, total_spent, tags, created_at, city, country)
      select email, first_name, last_name, phone, shopify_customer_id, status, consent_source, consent_at::timestamptz, unsubscribed_at::timestamptz,
             last_order_at::timestamptz, order_count, total_spent, tags, created_at::timestamptz, city, country
      from json_populate_recordset(null::contacts, ${JSON.stringify(uniq)}::json)
      on conflict (email) do update set
        first_name = coalesce(excluded.first_name, contacts.first_name),
        last_name  = coalesce(excluded.last_name, contacts.last_name),
        phone      = coalesce(excluded.phone, contacts.phone),
        shopify_customer_id = excluded.shopify_customer_id,
        status = case when contacts.status = 'suppressed' then 'suppressed' else excluded.status end,
        consent_source = case when excluded.status = 'subscribed' and contacts.status <> 'subscribed' then 'shopify' else contacts.consent_source end,
        consent_at = case when excluded.status = 'subscribed' then coalesce(excluded.consent_at, contacts.consent_at) else contacts.consent_at end,
        unsubscribed_at = coalesce(excluded.unsubscribed_at, contacts.unsubscribed_at),
        last_order_at = greatest(excluded.last_order_at, contacts.last_order_at),
        order_count = greatest(excluded.order_count, contacts.order_count),
        total_spent = greatest(excluded.total_spent, contacts.total_spent),
        tags = (select coalesce(array_agg(distinct t), '{}') from unnest(contacts.tags || excluded.tags) t),
        city = coalesce(excluded.city, contacts.city), country = coalesce(excluded.country, contacts.country),
        updated_at = now()`;
    n += uniq.length;
    cursor = data.customers.pageInfo.hasNextPage ? data.customers.pageInfo.endCursor : null;
    opts.log?.(`customers ${n}`);
  } while (cursor);
  return n;
}

export async function syncShopifyOrders(opts: { since?: string; log?: (s: string) => void } = {}) {
  let cursor: string | null = null, n = 0;
  const query = opts.since ? `created_at:>=${opts.since}` : null;
  do {
    const data: { orders: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: Order[] } } = await shopifyGraphql(`
      query($cursor: String, $query: String) {
        orders(first: 250, after: $cursor, query: $query, sortKey: CREATED_AT) {
          pageInfo { hasNextPage endCursor }
          nodes { id email createdAt cancelledAt currentTotalPriceSet { shopMoney { amount } } customer { id } }
        } }`, { cursor, query });
    const rows = data.orders.nodes.filter(o => !o.cancelledAt).map(o => ({
      shopify_order_id: gid(o.id), email: o.email?.trim().toLowerCase() ?? null, total: Number(o.currentTotalPriceSet.shopMoney.amount), placed_at: o.createdAt,
    }));
    if (rows.length) await sql`
      insert into orders (shopify_order_id, contact_id, email, total, placed_at)
      select r.shopify_order_id, c.id, r.email, r.total, r.placed_at::timestamptz
      from json_populate_recordset(null::orders, ${JSON.stringify(rows)}::json) r
      left join contacts c on c.email = r.email
      on conflict (shopify_order_id) do update set total = excluded.total, contact_id = coalesce(excluded.contact_id, orders.contact_id)`;
    n += rows.length;
    cursor = data.orders.pageInfo.hasNextPage ? data.orders.pageInfo.endCursor : null;
    opts.log?.(`orders ${n}`);
  } while (cursor);
  return n;
}
