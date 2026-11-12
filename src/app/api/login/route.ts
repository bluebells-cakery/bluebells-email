import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { PENDING, makeToken } from "@/lib/session";
import { checkPassword, safeEq } from "@/lib/auth";

const cookie = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase(), pw = String(form.get("password") || "");
  const next = String(form.get("next") || "/dashboard");
  const fail = (e: string) => NextResponse.redirect(new URL(`/login?error=${e}`, req.url), 303);
  const [u] = await sql`select * from users where email = ${email}`;
  if (!u) return fail("1");
  if (u.locked_until && new Date(u.locked_until) > new Date()) return fail("locked");
  // First login for the owner: the old team password lets them set their own password + phone code, once.
  const bootstrap = !u.pw_hash && u.role === "owner" && !!process.env.EDM_PASSWORD && safeEq(pw, process.env.EDM_PASSWORD);
  if (!bootstrap && !checkPassword(pw, u.pw_hash)) {
    await sql`update users set failed_count = failed_count + 1, locked_until = case when failed_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end where id = ${u.id}`;
    return fail("1");
  }
  if (!u.totp_enabled) {
    const token = randomBytes(24).toString("hex");
    await sql`update users set setup_token = ${token}, setup_expires = now() + interval '30 minutes' where id = ${u.id}`;
    return NextResponse.redirect(new URL(`/login/setup?token=${token}`, req.url), 303);
  }
  const res = NextResponse.redirect(new URL(`/login/code?next=${encodeURIComponent(next)}`, req.url), 303);
  res.cookies.set(PENDING, await makeToken(u.id, 10 / 1440, "p"), { ...cookie, maxAge: 600 });
  return res;
}
