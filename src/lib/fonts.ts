import { getSetting } from "@/lib/settings";

export type ExtraFont = { label: string; family: string; google: string; fallback: string };

export async function getExtraFonts(): Promise<ExtraFont[]> {
  try { return JSON.parse((await getSetting("extra_fonts")) ?? "[]"); } catch { return []; }
}
