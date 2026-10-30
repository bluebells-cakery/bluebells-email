import { SITE_URL } from "@/lib/site";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { sql } from "@/lib/db";
import { brand } from "@/lib/brand";
import { uploadToShopifyFiles } from "@/lib/shopify-files";
import { waveRow, productRow, imageRow, footerRow, image, text, button, type Product } from "@/lib/blocks";

const MODEL = "claude-sonnet-5-5";
type Row = Record<string, unknown>;

const SYSTEM = `You are the design assistant inside Bluebells Cakery's email builder (Auckland bakery: Kingsland, Commercial Bay, Airport; site bluebellscakery.com).
You build email rows from a small block kit and write on-brand copy: warm, playful, short sentences, NZ English, no exclamation overload.
Brand colours: navy #262967 (text), cream #fffdf8 (background), teal #00bfb3 (buttons/links), pastels blush #fbe7e6, peach #fcd1bd, butter #fff9ea, lilac #e4c5e0, sky #c0e6ef. Headings: Crimson Pro (serif). Body: Poppins.
Workflow: use search_media to find existing artwork/badges/photos and search_products for live products BEFORE emitting rows; never invent image URLs. Then call emit_rows once with the finished rows. Keep rows email-safe (max 3 columns). If the user only wants copy, call emit_copy.`;

const tools: Anthropic.Tool[] = [
  { name: "search_media", description: "Search the media library (campaign artwork, badges, logos, photos). Returns id, url, filename, folder, width, height.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "search_products", description: "Search live products on bluebellscakery.com. Returns title, url, image, price.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "emit_rows", description: "Return the finished rows to insert into the email.",
    input_schema: { type: "object", required: ["rows", "note"], properties: {
      note: { type: "string", description: "One short sentence for the user about what you built." },
      rows: { type: "array", items: { type: "object", required: ["columns"], properties: {
        background: { type: "string", description: "hex, optional" },
        padding: { type: "string", description: "CSS padding e.g. '20px 10px', optional" },
        columns: { type: "array", maxItems: 3, items: { type: "object", required: ["items"], properties: {
          background: { type: "string" },
          items: { type: "array", items: { type: "object", required: ["type"], properties: {
            type: { type: "string", enum: ["text", "image", "button", "wave", "products", "footer"] },
            html: { type: "string", description: "text: inline HTML (<p>, <strong>, <br>, <a>)" },
            size: { type: "number", description: "text: font px" },
            font: { type: "string", enum: ["heading", "body"] },
            color: { type: "string" },
            align: { type: "string", enum: ["left", "center"] },
            url: { type: "string", description: "image: exact url from search_media" },
            width: { type: "number" }, height: { type: "number" },
            maxWidth: { type: "number", description: "image: display width px (e.g. 200 for a badge)" },
            href: { type: "string", description: "image/button link" },
            label: { type: "string", description: "button text" },
            bg: { type: "string", description: "button background hex" },
            fill: { type: "string", description: "wave: wave colour hex" },
            behind: { type: "string", description: "wave: colour behind the wave hex" },
            flip: { type: "boolean" },
            products: { type: "array", items: { type: "object", required: ["title", "url", "price"], properties: { title: { type: "string" }, url: { type: "string" }, image: { type: "string" }, price: { type: "string" }, compareAt: { type: "string" } } } },
            buttonText: { type: "string" },
          } } },
        } } },
      } } },
    } } },
  { name: "emit_copy", description: "Return copy suggestions (subject lines, paragraphs, CTAs) when no rows are needed.",
    input_schema: { type: "object", required: ["suggestions"], properties: { suggestions: { type: "array", items: { type: "string" } }, note: { type: "string" } } } },
];

async function renderWave(fill: string, behind: string, flip: boolean) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="41" viewBox="0 0 1158 40" preserveAspectRatio="none"><rect width="1158" height="40" fill="${behind}"/><g transform="${flip ? "translate(0,40) scale(1,-1) " : ""}translate(0,40) scale(0.1,-0.1)" fill="${fill}"><path d="${brand.wavePath}"/></g></svg>`;
  const fname = `wave-${fill.slice(1)}-on-${behind.slice(1)}${flip ? "-flipped" : ""}`;
  const existing = (await sql`select url from media where filename = ${fname + ".png"} limit 1`)[0];
  if (existing) return existing.url as string;
  const png = await sharp(Buffer.from(svg), { density: 300 }).resize({ width: 1200 }).png().toBuffer();
  const up = await uploadToShopifyFiles(png, fname + ".png", "image/png", "");
  await sql`insert into media (shopify_file_id, url, filename, mime, width, height, bytes, folder, tags, source) values (${up.id}, ${up.url}, ${fname + ".png"}, 'image/png', 1200, 41, ${png.length}, 'brand elements', '{brand,wave}', 'brand')`;
  return up.url;
}

type Item = Record<string, unknown>;
async function specToRows(rows: Item[]): Promise<Row[]> {
  const out: Row[] = [];
  for (const r of rows) {
    const cols = (r.columns as Item[]) ?? [];
    // special single-item rows
    const only = cols.length === 1 && (cols[0].items as Item[])?.length === 1 ? (cols[0].items as Item[])[0] : null;
    if (only?.type === "wave") { out.push(waveRow(await renderWave(String(only.fill ?? "#fbe7e6"), String(only.behind ?? "#fffdf8"), !!only.flip), 1200, 41, String(only.flip ? only.fill ?? "#fbe7e6" : only.behind ?? "#fffdf8"))); continue; }
    if (only?.type === "footer") { out.push(footerRow()); continue; }
    if (only?.type === "products") { out.push(productRow((only.products as Product[]) ?? [], { bg: r.background as string, buttonText: only.buttonText as string })); continue; }
    const columns = [];
    for (const c of cols) {
      const contents: unknown[] = [];
      for (const it of (c.items as Item[]) ?? []) {
        if (it.type === "text") contents.push(text(String(it.html ?? ""), { size: Number(it.size ?? 16), font: it.font as "heading" | "body", color: it.color as string, align: it.align as "left" | "center" }));
        else if (it.type === "image" && it.url) {
          const img = image(String(it.url), Number(it.width ?? 600), Number(it.height ?? 600), { href: it.href as string, padding: "10px" });
          if (it.maxWidth) (img.values.src as Record<string, unknown>).maxWidth = `${it.maxWidth}px`;
          contents.push(img);
        }
        else if (it.type === "button") contents.push(button(String(it.label ?? "Shop now"), String(it.href ?? SITE_URL), { bg: it.bg as string }));
        else if (it.type === "wave") contents.push(image(await renderWave(String(it.fill ?? "#fbe7e6"), String(it.behind ?? "#fffdf8"), !!it.flip), 1200, 41));
      }
      columns.push({ contents, values: { backgroundColor: c.background ?? "", padding: "0px", border: {} } });
    }
    out.push({ cells: columns.map(() => 1), columns, values: { backgroundColor: r.background ?? "", columnsBackgroundColor: "", padding: r.padding ?? "10px", hideDesktop: false, hideMobile: false, noStackMobile: false } });
  }
  return out;
}

export async function runAssistant(prompt: string, history: { role: "user" | "assistant"; content: string }[] = []) {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [...history.map(h => ({ role: h.role, content: h.content })), { role: "user", content: prompt }];
  for (let i = 0; i < 8; i++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 4000, system: SYSTEM, tools, messages });
    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUses.length) return { kind: "text" as const, text: res.content.filter(b => b.type === "text").map(b => (b as Anthropic.TextBlock).text).join("\n") };
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const t of toolUses) {
      const inp = t.input as Record<string, unknown>;
      if (t.name === "emit_rows") return { kind: "rows" as const, rows: await specToRows(inp.rows as Item[]), note: String(inp.note ?? "") };
      if (t.name === "emit_copy") return { kind: "copy" as const, suggestions: inp.suggestions as string[], note: String(inp.note ?? "") };
      let content = "[]";
      if (t.name === "search_media") {
        const q = String(inp.query ?? ""); const like = "%" + q + "%";
        const rows = await sql`select id, url, filename, folder, width, height from media where filename ilike ${like} or folder ilike ${like} or alt ilike ${like} or ${q} = any(tags) order by created_at desc limit 20`;
        content = JSON.stringify(rows);
      } else if (t.name === "search_products") {
        const r = await fetch(`${process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz"}/api/products/search?q=${encodeURIComponent(String(inp.query ?? ""))}`);
        content = JSON.stringify((await r.json()).products);
      }
      results.push({ type: "tool_result", tool_use_id: t.id, content });
    }
    messages.push({ role: "assistant", content: res.content }, { role: "user", content: results });
  }
  return { kind: "text" as const, text: "I couldn't finish that one — try rephrasing." };
}
