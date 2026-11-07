import { sql } from "@/lib/db";
import { shopifyGraphql } from "@/lib/shopify";

/** Handles of child/option products (tag OPTIONS_HIDDEN_PRODUCT — flavour/size/add-on lines). Cached 6h in settings. */
export async function hiddenHandles(): Promise<Set<string>> {
  const [row] = await sql`select value, updated_at from settings where key = 'hidden_product_handles'`;
  if (row && Date.now() - new Date(row.updated_at).getTime() < 6 * 3600e3) return new Set(JSON.parse(row.value));
  try {
    let cursor: string | null = null; const handles: string[] = [];
    do {
      const d: { products: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: { handle: string }[] } } =
        await shopifyGraphql(`query($c: String) { products(first: 250, after: $c, query: "tag:OPTIONS_HIDDEN_PRODUCT") { pageInfo { hasNextPage endCursor } nodes { handle } } }`, { c: cursor });
      handles.push(...d.products.nodes.map(n => n.handle)); cursor = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
    } while (cursor);
    await sql`insert into settings(key, value) values ('hidden_product_handles', ${JSON.stringify(handles)}) on conflict (key) do update set value = excluded.value, updated_at = now()`;
    return new Set(handles);
  } catch { return new Set(row ? JSON.parse(row.value) : []); }
}

/** Parent products only — drop child/option lines. */
export function parentsOnly<T extends { handle?: string | null }>(items: T[] | undefined | null, hidden: Set<string>): T[] {
  return (items ?? []).filter(i => !i.handle || !hidden.has(i.handle));
}
