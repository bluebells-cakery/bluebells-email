/** Team-login session token: `<expiryMs>.<hmac>` signed with EDM_SESSION_SECRET (Web Crypto, works in the proxy and routes). */
export const COOKIE = "bb_edm_session";
const enc = new TextEncoder();
async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(process.env.EDM_SESSION_SECRET || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))))).replace(/=+$/, "");
}
export async function makeToken(days = 30) { const exp = String(Date.now() + days * 864e5); return `${exp}.${await hmac(exp)}`; }
export async function validToken(t: string | undefined) {
  if (!t) return false;
  const [exp, sig] = t.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return (await hmac(exp)) === sig;
}
