import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { COOKIE, makeToken } from "@/lib/session";
import { checkTotp, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData(); const token = String(form.get("token") || "");
  const back = (e: string) => NextResponse.redirect(new URL(`/login/setup?token=${token}&error=${e}`, req.url), 303);
  const [u] = token ? await sql`select * from users where setup_token = ${token} and setup_expires > now()` : [];
  if (!u) return NextResponse.redirect(new URL("/login?error=expired", req.url), 303);
  const pw = String(form.get("password") || "");
  if (pw.length < 10) return back("short");
  if (pw !== String(form.get("password2") || "")) return back("match");
  if (!checkTotp(u.totp_secret, String(form.get("code") || ""))) return back("code");
  await sql`update users set pw_hash = ${hashPassword(pw)}, totp_enabled = true, setup_token = null, setup_expires = null, failed_count = 0, locked_until = null, last_login_at = now() where id = ${u.id}`;
  const res = NextResponse.redirect(new URL("/dashboard", req.url), 303);
  res.cookies.set(COOKIE, await makeToken(u.id, 30), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  return res;
}
