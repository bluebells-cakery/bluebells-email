// Renders Klaviyo-style template HTML with our data, and instruments links/opens for tracking.
export type RenderCtx = {
  first_name?: string | null; email: string; unsubscribe_url: string; token: string;
  checkout?: { url: string; line_items: { title: string; handle?: string; quantity: number; line_price: string; image?: string | null }[] } | null;
  order?: { name?: string } | null;
  products?: { title: string; url: string; image?: string | null; price?: string }[];
};
const APP = () => process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz";
const ORG = { name: "Bluebells Cakery", full_address: "Auckland, New Zealand", url: "https://bluebellscakery.com" };

export function renderTemplate(html: string, ctx: RenderCtx): string {
  let h = html;
  // conditionals / loops for abandoned-cart line items
  h = h.replace(/\{%\s*if event\.extra\.line_items\s*%\}([\s\S]*?)\{%\s*else\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, (_, a, b) => (ctx.checkout?.line_items?.length ? a : b));
  h = h.replace(/\{%\s*for item in event\.extra\.line_items\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g, (_, body) =>
    (ctx.checkout?.line_items ?? []).map(it => body
      .replace(/\{%\s*if item\.product\.variant\.images\.0\.src\s*%\}([\s\S]*?)\{%\s*else\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, (_: string, a: string, b: string) => (it.image ? a : b))
      .replace(/\{\{\s*item\.product\.variant\.images\.0\.src\s*\}\}/g, it.image ?? "")
      .replace(/\{\{\s*item\.product\.images\.0\.src[^}]*\}\}/g, it.image ?? "")
      .replace(/\{\{\s*item\.product\.handle\s*\}\}/g, it.handle ?? "")
      .replace(/\{\{\s*item\.product\.title\s*\}\}/g, it.title)
      .replace(/\{\{\s*item\.quantity[^}]*\}\}/g, String(it.quantity))
      .replace(/\{%\s*currency_format item\.line_price[^%]*%\}/g, `$${it.line_price}`)).join(""));
  // product feed (best sellers) blocks: {% if feeds.X|index:N %}...{% endif %}
  h = h.replace(/\{%\s*if feeds\.\w+\|index:(\d+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, (_, n, body) => {
    const p = ctx.products?.[Number(n)]; if (!p) return "";
    return body.replace(/\{%\s*with[^%]*%\}/g, "").replace(/\{%\s*endwith\s*%\}/g, "")
      .replace(/\{\{\s*item\.url\s*\}\}/g, p.url).replace(/\{\{\s*Title\s*\}\}/g, p.title).replace(/\{\{\s*item\.title[^}]*\}\}/g, p.title)
      .replace(/\{\{\s*item\.image_full_url\s*\}\}/g, p.image ?? "").replace(/\{\{\s*Price[^}]*\}\}/g, p.price ? `$${p.price}` : "").replace(/\{\{\s*Compare_at[^}]*\}\}/g, "");
  });
  // simple tags
  h = h.replace(/\{\{\s*event\.extra\.checkout_url[^}]*\}\}/g, ctx.checkout?.url ?? ORG.url);
  h = h.replace(/\{\{\s*organization\.url[^}]*\}\}/g, ORG.url);
  h = h.replace(/\{\{\s*organization\.name\s*\}\}/g, ORG.name);
  h = h.replace(/\{\{\s*organization\.full_address\s*\}\}/g, ORG.full_address);
  h = h.replace(/\{\{\s*person\.first_name\|default:\s*['"]([^'"]*)['"]\s*\}\}/g, (_, d) => ctx.first_name || d);
  h = h.replace(/\{\{\s*(person\.)?first_name[^}]*\}\}/g, ctx.first_name ?? "");
  h = h.replace(/\{%\s*coupon_code\s*['"]([^'"]+)['"]\s*%\}/g, "$1");
  h = h.replace(/\{%\s*current_year\s*%\}/g, String(new Date().getFullYear()));
  h = h.replace(/\{%\s*unsubscribe_link\s*%\}/g, ctx.unsubscribe_url);
  h = h.replace(/\{%\s*unsubscribe\s*%\}/g, `<a href="${ctx.unsubscribe_url}" style="color:inherit;text-decoration:underline">Unsubscribe</a>`);
  h = h.replace(/\{%\s*web_view\s*%\}/g, `${APP()}/v/${ctx.token}`);
  h = h.replace(/\{\{\s*unsubscribe_url\s*\}\}/g, ctx.unsubscribe_url);
  h = h.replace(/\{\{\s*email\s*\}\}/g, ctx.email);
  // leftovers
  h = h.replace(/\{%[^%]*%\}/g, "").replace(/\{\{[^}]*\}\}/g, "");
  return h;
}

/** Wrap http(s) links with click tracking and append an open pixel. */
export function instrument(html: string, token: string): string {
  const base = APP();
  let h = html.replace(/href="(https?:\/\/[^"]+)"/g, (m, url) => {
    if (url.startsWith(base + "/u/") || url.startsWith(base + "/t/") || /mailto:|unsubscribe/.test(url)) return m;
    return `href="${base}/t/c/${token}?u=${encodeURIComponent(url)}"`;
  });
  const px = `<img src="${base}/t/o/${token}.gif" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />`;
  h = h.includes("</body>") ? h.replace("</body>", px + "</body>") : h + px;
  return h;
}

export function textVersion(html: string) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|h\d)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
}
