import { getSetting, setSetting } from "@/lib/settings";
import { sql } from "@/lib/db";
import { uploadToShopifyFiles } from "@/lib/shopify-files";

const API = "https://api.canva.com/rest/v1";
const basic = () => "Basic " + Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString("base64");

type Tokens = { access_token: string; refresh_token: string; expires_at: number };

export async function saveTokens(t: { access_token: string; refresh_token: string; expires_in: number }) {
  await setSetting("canva_tokens", JSON.stringify({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + t.expires_in * 1000 - 60000 }));
}

export async function canvaConnected() { return !!(await getSetting("canva_tokens")); }

async function accessToken(): Promise<string> {
  const raw = await getSetting("canva_tokens");
  if (!raw) throw new Error("Canva not connected — visit /api/canva/install");
  const t: Tokens = JSON.parse(raw);
  if (Date.now() < t.expires_at) return t.access_token;
  const r = await fetch(`${API}/oauth/token`, { method: "POST", headers: { Authorization: basic(), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh_token }) });
  if (!r.ok) throw new Error(`Canva refresh failed: ${await r.text()}`);
  const j = await r.json(); await saveTokens(j); return j.access_token;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${await accessToken()}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`Canva ${r.status}: ${await r.text()}`);
  return r.json();
}

export type CanvaDesign = { id: string; title?: string; updated_at: number; thumbnail?: { url: string; width: number; height: number }; urls?: { edit_url: string } };

export async function listDesigns(query = "", continuation?: string) {
  const p = new URLSearchParams({ limit: "50", sort_by: "modified_descending", ownership: "any" });
  if (query) p.set("query", query); if (continuation) p.set("continuation", continuation);
  return api<{ items: CanvaDesign[]; continuation?: string }>(`/designs?${p}`);
}

/** Export a design to PNG (each page) and store in the media library. Returns media rows. */
export async function importDesign(designId: string) {
  const d = await api<{ design: CanvaDesign }>(`/designs/${designId}`);
  const title = (d.design.title || `canva-${designId}`).trim();
  const job = await api<{ job: { id: string; status: string; urls?: string[]; error?: { message: string } } }>(`/exports`, {
    method: "POST", body: JSON.stringify({ design_id: designId, format: { type: "png", lossless: true } }) });
  let j = job.job;
  for (let i = 0; i < 40 && j.status === "in_progress"; i++) { await new Promise(r => setTimeout(r, 1500)); j = (await api<{ job: typeof j }>(`/exports/${j.id}`)).job; }
  if (j.status !== "success" || !j.urls?.length) throw new Error(j.error?.message ?? "Canva export failed");
  const folder = `canva/${title}`.replace(/[^\w\-/ .&()]/g, "");
  const out = [];
  for (let i = 0; i < j.urls.length; i++) {
    const key = `canva:${designId}:${i + 1}`;
    const res = await fetch(j.urls[i]); const buf = Buffer.from(await res.arrayBuffer());
    const fname = `${title.replace(/[^\w-]+/g, "-").toLowerCase()}${j.urls.length > 1 ? `-p${i + 1}` : ""}.png`;
    const up = await uploadToShopifyFiles(buf, fname, "image/png", title);
    const [row] = await sql`insert into media (shopify_file_id, url, filename, mime, width, height, bytes, folder, tags, source, source_url, alt)
      values (${up.id}, ${up.url}, ${fname}, 'image/png', ${up.width ?? null}, ${up.height ?? null}, ${buf.length}, ${folder}, '{canva}', 'canva', ${key}, ${title})
      on conflict (source_url) do update set url = excluded.url, shopify_file_id = excluded.shopify_file_id, width = excluded.width, height = excluded.height, bytes = excluded.bytes, created_at = now()
      returning id, url, filename, folder`;
    out.push(row);
  }
  return out;
}
