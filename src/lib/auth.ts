import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { COOKIE, tokenUser } from "@/lib/session";

export type User = { id: number; email: string; name: string | null; role: "owner" | "staff" };
/** The logged-in user for this request (null if none). */
export async function currentUser(): Promise<User | null> {
  const uid = await tokenUser((await cookies()).get(COOKIE)?.value);
  if (!uid) return null;
  const [u] = await sql`select id, email, name, role from users where id = ${uid}`;
  return (u as User) ?? null;
}
export async function requireOwner(): Promise<User | null> { const u = await currentUser(); return u?.role === "owner" ? u : null; }

// ---- passwords (scrypt) ----
export function hashPassword(pw: string) { const salt = randomBytes(16); return `${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`; }
export function checkPassword(pw: string, stored: string | null) {
  if (!stored) return false; const [s, h] = stored.split(":"); if (!s || !h) return false;
  const a = scryptSync(pw, Buffer.from(s, "hex"), 64), b = Buffer.from(h, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export const safeEq = (a: string, b: string) => { const x = createHash("sha256").update(a).digest(), y = createHash("sha256").update(b).digest(); return timingSafeEqual(x, y); };

// ---- phone codes (TOTP, RFC 6238 — Google Authenticator / Authy / 1Password) ----
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function newTotpSecret() { const b = randomBytes(20); let bits = "", out = ""; for (const x of b) bits += x.toString(2).padStart(8, "0"); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)]; return out; }
function b32decode(s: string) { let bits = ""; for (const c of s.replace(/=+$/, "").toUpperCase()) { const v = B32.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, "0"); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
export function totpAt(secret: string, step: number) {
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", b32decode(secret)).update(buf).digest(); const o = h[h.length - 1] & 15;
  return String(((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6).padStart(6, "0");
}
export function checkTotp(secret: string | null, code: string) {
  if (!secret) return false; const c = code.replace(/\D/g, ""); if (c.length !== 6) return false;
  const now = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some(d => safeEq(totpAt(secret, now + d), c));
}
export const totpUri = (email: string, secret: string) => `otpauth://totp/${encodeURIComponent("Bluebells EDM:" + email)}?secret=${secret}&issuer=${encodeURIComponent("Bluebells EDM")}`;

// ---- signatures: stop anyone with database access alone from sending ----
const sign = (s: string) => createHmac("sha256", process.env.EDM_SESSION_SECRET || "").update(s).digest("hex");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
/** Covers what goes out and to whom — editing a campaign after approval voids it. */
export const campaignSig = (c: { id: number | string; html: string | null; subject: string | null; audience: unknown }) =>
  sign(`campaign:${c.id}:${sha(c.html ?? "")}:${sha(c.subject ?? "")}:${sha(JSON.stringify(c.audience ?? null))}`);
export const queueSig = (q: { token: string; contact_id: number | string; subject: string | null; html: string | null }) =>
  sign(`queue:${q.token}:${q.contact_id}:${sha((q.subject ?? "") + "\n" + (q.html ?? ""))}`);
export const canSign = () => !!process.env.EDM_SESSION_SECRET;
