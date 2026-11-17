import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { COOKIE, PENDING, makeToken, tokenUser } from "@/lib/session";
import { safeEq } from "@/lib/auth";

const hash = (s: string) => createHash("sha256").update((process.env.EDM_SESSION_SECRET ?? "") + ":" + s).digest("hex");

/** Step 2: the emailed code → 30-day session. 5 wrong tries locks the login for 15 minutes. */
export async function POST(req: NextRequest) {
  const form = await req.formData(); const next = String(form.get("next") || "/dashboard"); const e = String(form.get("e") || "");
  const back = (err: string) => NextResponse.redirect(new URL(`/login/code?error=${err}&next=${encodeURIComponent(next)}&e=${encodeURIComponent(e)}`, req.url), 303);
  const uid = await tokenUser(req.cookies.get(PENDING)?.value, "p");
  if (!uid) return back("1");
  const [u] = await sql`select * from users where id = ${uid}`;
  if (!u || (u.locked_until && new Date(u.locked_until) > new Date())) return NextResponse.redirect(new URL("/login?error=locked", req.url), 303);
  const code = String(form.get("code") || "").replace(/\D/g, "");
  const ok = u.login_code_hash && u.login_code_expires && new Date(u.login_code_expires) > new Date() && code.length === 6 && safeEq(hash(code), u.login_code_hash);
  if (!ok) {
    await sql`update users set failed_count = failed_count + 1, locked_until = case when failed_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end, login_code_hash = case when failed_count + 1 >= 5 then null else login_code_hash end where id = ${u.id}`;
    return back("1");
  }
  await sql`update users set login_code_hash = null, login_code_expires = null, failed_count = 0, locked_until = null, last_login_at = now() where id = ${u.id}`;
  const res = NextResponse.redirect(new URL(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard", req.url), 303);
  res.cookies.set(COOKIE, await makeToken(u.id, 30), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  res.cookies.set(PENDING, "", { path: "/", maxAge: 0 });
  return res;
}
