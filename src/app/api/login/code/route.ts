import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { COOKIE, PENDING, makeToken, tokenUser } from "@/lib/session";
import { safeEq, hashPassword } from "@/lib/auth";
import { codeHash } from "@/lib/login-code";

/** Step 2: emailed code → 30-day session. In reset mode it also sets the new password. 5 wrong tries locks for 15 min. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const next = String(form.get("next") || "/dashboard"), e = String(form.get("e") || ""), mode = String(form.get("mode") || "");
  const back = (err: string) => NextResponse.redirect(new URL(`/login/code?error=${err}&next=${encodeURIComponent(next)}&e=${encodeURIComponent(e)}${mode === "reset" ? "&mode=reset" : ""}`, req.url), 303);
  const uid = await tokenUser(req.cookies.get(PENDING)?.value, mode === "reset" ? "r" : "p");
  if (!uid) return back("1");
  const [u] = await sql`select * from users where id = ${uid}`;
  if (!u || (u.locked_until && new Date(u.locked_until) > new Date())) return NextResponse.redirect(new URL("/login?error=locked", req.url), 303);
  let newPw: string | null = null;
  if (mode === "reset") {
    newPw = String(form.get("password") || "");
    if (newPw.length < 10) return back("short");
    if (newPw !== String(form.get("password2") || "")) return back("match");
  }
  const code = String(form.get("code") || "").replace(/\D/g, "");
  const ok = u.login_code_hash && u.login_code_expires && new Date(u.login_code_expires) > new Date() && code.length === 6 && safeEq(codeHash(code), u.login_code_hash);
  if (!ok) {
    await sql`update users set failed_count = failed_count + 1, locked_until = case when failed_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end, login_code_hash = case when failed_count + 1 >= 5 then null else login_code_hash end where id = ${u.id}`;
    return back("1");
  }
  if (newPw) await sql`update users set pw_hash = ${hashPassword(newPw)} where id = ${u.id}`;
  await sql`update users set login_code_hash = null, login_code_expires = null, failed_count = 0, locked_until = null, last_login_at = now() where id = ${u.id}`;
  const res = NextResponse.redirect(new URL(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard", req.url), 303);
  res.cookies.set(COOKIE, await makeToken(u.id, 30), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  res.cookies.set(PENDING, "", { path: "/", maxAge: 0 });
  return res;
}
