import { SITE_URL } from "@/lib/site";
// Builders for Unlayer row JSON — "Bluebells blocks" inserted into a design.
type Row = Record<string, unknown>;
const NAVY = "#262967", CREAM = "#fffdf8", TEAL = "#00bfb3";
const HEAD = "'Crimson Pro', Georgia, 'Times New Roman', serif";
const BODY = "'Poppins', Arial, Helvetica, sans-serif";

const rowBase = (columns: unknown[], values: Row = {}): Row => ({
  cells: columns.map(() => 1), columns,
  values: { backgroundColor: "", columnsBackgroundColor: "", padding: "0px", hideDesktop: false, hideMobile: false, noStackMobile: false, ...values },
});
const col = (contents: unknown[], values: Row = {}) => ({ contents, values: { backgroundColor: "", padding: "0px", border: {}, ...values } });

export const image = (url: string, width: number, height: number, opts: { href?: string; alt?: string; padding?: string; fullWidth?: boolean } = {}) => ({
  type: "image",
  values: {
    containerPadding: opts.padding ?? "0px", textAlign: "center", altText: opts.alt ?? "",
    src: { url, width, height, autoWidth: false, maxWidth: "100%" },
    action: { name: "web", values: { href: opts.href ?? "", target: "_blank" } },
    hideDesktop: false, hideMobile: false,
  },
});
export const text = (html: string, opts: { size?: number; color?: string; align?: "left" | "center"; padding?: string; font?: "heading" | "body"; lineHeight?: string } = {}) => ({
  type: "text",
  values: {
    containerPadding: opts.padding ?? "10px", textAlign: opts.align ?? "center", lineHeight: opts.lineHeight ?? "130%",
    fontSize: `${opts.size ?? 16}px`, color: opts.color ?? NAVY, fontFamily: { label: opts.font === "heading" ? "Crimson Pro (headings)" : "Poppins (body)", value: opts.font === "heading" ? HEAD : BODY },
    text: html, hideDesktop: false, hideMobile: false,
  },
});
export const button = (label: string, href: string, opts: { bg?: string; color?: string; padding?: string; radius?: string } = {}) => ({
  type: "button",
  values: {
    containerPadding: opts.padding ?? "10px", textAlign: "center",
    href: { name: "web", values: { href, target: "_blank" } },
    buttonColors: { color: opts.color ?? "#ffffff", backgroundColor: opts.bg ?? TEAL, hoverColor: "#ffffff", hoverBackgroundColor: "#2dccd3" },
    size: { autoWidth: true, width: "100%" }, fontSize: "16px", fontFamily: { label: "Poppins (body)", value: BODY },
    lineHeight: "120%", padding: "12px 28px", border: {}, borderRadius: opts.radius ?? "30px", text: `<span style="line-height: 19.2px;">${label}</span>`,
    hideDesktop: false, hideMobile: false,
  },
});

/** Full-width wave image (the PNG already rendered with the correct colours). */
export const waveRow = (url: string, width: number, height: number, behindColour: string) =>
  rowBase([col([image(url, width, height, { fullWidth: true })])], { backgroundColor: behindColour, padding: "0px" });

export type Product = { title: string; url: string; image: string | null; price: string; compareAt: string | null };
/** 1–3 product cards side by side. */
export const productRow = (products: Product[], opts: { bg?: string; cardBg?: string; buttonText?: string } = {}) => {
  const columns = products.map(p => col([
    ...(p.image ? [image(p.image, 600, 600, { href: p.url, alt: p.title, padding: "0px 0px 10px" })] : []),
    text(`<p style="line-height: 130%;"><strong>${p.title}</strong></p>`, { size: 18, font: "heading", padding: "0px 10px 4px" }),
    text(`<p style="line-height: 130%;">${p.compareAt ? `<s style="color:#919191">$${p.compareAt}</s> ` : ""}$${p.price}</p>`, { size: 14, padding: "0px 10px 8px" }),
    button(opts.buttonText ?? "Order now", p.url, { padding: "0px 10px 14px" }),
  ], { backgroundColor: opts.cardBg ?? "", padding: "10px" }));
  return rowBase(columns, { backgroundColor: opts.bg ?? "", padding: "20px 10px", columnsBackgroundColor: "" });
};

/** Centered image (badge, sticker, logo) with optional link. */
export const imageRow = (url: string, width: number, height: number, opts: { href?: string; maxWidth?: number; bg?: string } = {}) => {
  const img = image(url, width, height, { href: opts.href, padding: "20px" });
  if (opts.maxWidth) (img.values.src as Record<string, unknown>).maxWidth = `${opts.maxWidth}px`;
  return rowBase([col([img])], { backgroundColor: opts.bg ?? "" });
};

/** Standard footer: address, stores, unsubscribe. */
export const footerRow = () => rowBase([col([
  text(`<p style="line-height: 150%;"><strong>Bluebells Cakery</strong><br>Kingsland · Commercial Bay · Auckland Airport<br><a href="${SITE_URL}" target="_blank" style="color:${NAVY};">${SITE_URL.replace("https://", "")}</a></p>`, { size: 12, padding: "20px 20px 6px" }),
  text(`<p style="line-height: 150%;">You're receiving this because you signed up at Bluebells Cakery.<br><a href="{{unsubscribe_url}}" style="color:${NAVY};">Unsubscribe</a> · Bluebells Cakery Limited, Auckland, New Zealand</p>`, { size: 11, color: "#6b6b7a", padding: "0px 20px 24px" }),
])], { backgroundColor: CREAM });

/** Insert rows into an exported Unlayer design (appends at the end unless index given). */
export function insertRows(design: Record<string, unknown>, rows: Row[], index?: number) {
  const d = JSON.parse(JSON.stringify(design));
  d.body ??= { rows: [], values: {} };
  d.body.rows ??= [];
  const at = index ?? d.body.rows.length;
  d.body.rows.splice(at, 0, ...rows);
  return d;
}
