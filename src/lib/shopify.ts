import { getSetting } from "@/lib/settings";

const API_VERSION = "2026-10";

export async function shopifyGraphql<T = unknown>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = await getSetting("shopify_access_token");
  if (!token) throw new Error("Shopify not connected — visit /api/shopify/install");
  const r = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data as T;
}
