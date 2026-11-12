/** Session token: `<userId>.<expiryMs>.<hmac>` signed with EDM_SESSION_SECRET (Web Crypto, works in the proxy and routes). */
export const COOKIE = "bb_edm_session";
export const PENDING = "bb_edm_pending"; // password OK, waiting for the phone code
const enc = new TextEncoder();
async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(process.env.EDM_SESSION_SECRET || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))))).replace(/=+$/, "");
}
export async function makeToken(userId: number, days = 30, kind = "s") { const exp = String(Date.now() + days * 864e5); return `${userId}.${exp}.${await hmac(`${kind}:${userId}.${exp}`)}`; }
/** Returns the user id, or null if the token is missing, expired or forged. */
export async function tokenUser(t: string | undefined, kind = "s"): Promise<number | null> {
  if (!t || !process.env.EDM_SESSION_SECRET) return null;
  const [uid, exp, sig] = t.split(".");
  if (!uid || !exp || !sig || Number(exp) < Date.now()) return null;
  return (await hmac(`${kind}:${uid}.${exp}`)) === sig ? Number(uid) : null;
}
export const validToken = async (t: string | undefined) => (await tokenUser(t)) !== null;
