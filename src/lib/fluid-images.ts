/** Wide images saved at a fixed pixel width (e.g. 600px) can't shrink on phones and push the whole email wider than the screen.
 *  This makes them fill the email width instead (width:100%, capped at the old pixel width). Applied on every template save. */
/* eslint-disable @typescript-eslint/no-explicit-any */
/** bands: also move full-width row colours to the content area. Only do that in the editor, where Unlayer then re-exports matching HTML. */
export function fluidDesign<T>(design: T, opts: { bands?: boolean } = {}): T {
  // Full-width colour bands (row background) become content-width backgrounds, so the sides stay one colour.
  if (opts.bands) ((design as any)?.body?.rows ?? []).forEach((r: any) => {
    const v = r.values ?? {};
    if (v.backgroundColor && !v.columnsBackgroundColor && !v.backgroundImage?.url) { v.columnsBackgroundColor = v.backgroundColor; v.backgroundColor = ""; }
  });
  ((design as any)?.body?.rows ?? []).forEach((r: any) => (r.columns ?? []).forEach((c: any) => (c.contents ?? []).forEach((x: any) => {
    const mw = x.type === "image" ? String(x.values?.src?.maxWidth ?? "") : "";
    if (/^\d+px$/.test(mw) && parseInt(mw) >= 480 && (r.columns ?? []).length === 1) x.values.src.maxWidth = "100%";
  })));
  return design;
}
export function fluidHtml(html: string): string {
  return html.replace(/(<img\b[^>]*style="[^"]*?)width:\s*(\d+)px;\s*max-width:\s*\2px;/gi, (m, pre, n) => Number(n) >= 480 ? `${pre}width: 100%;max-width: ${n}px;` : m);
}
