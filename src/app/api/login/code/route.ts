import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { COOKIE, PENDING, makeToken, tokenUser } from "@/lib/session";
import { checkTotp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData(); const next = String(form.get("next") || "/dashboard");
  const uid = await tokenUser(req.cookies.get(PENDING)?.value, "p");
  if (!uid) return NextResponse.redirect(new URL("/login", req.url), 303);
  const [u] = await sql`select * from users where id = ${uid}`;
  if (!u || (u.locked_until && new Date(u.locked_until) > new Date())) return NextResponse.redirect(new URL("/login?error=locked", req.url), 303);
  if (!checkTotp(u.totp_secret, String(form.get("code") || ""))) {
    await sql`update users set failed_count = failed_count + 1, locked_until = case when failed_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end where id = ${u.id}`;
    return NextResponse.redirect(new URL(`/login/code?error=1&next=${encodeURIComponent(next)}`, req.url), 303);
  }
  await sql`update users set failed_count = 0, locked_until = null, last_login_at = now() where id = ${u.id}`;
  const res = NextResponse.redirect(new URL(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard", req.url), 303);
  res.cookies.set(COOKIE, await makeToken(u.id, 30), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  res.cookies.set(PENDING, "", { path: "/", maxAge: 0 });
  return res;
}
