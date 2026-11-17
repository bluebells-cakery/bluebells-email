import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { PENDING, makeToken } from "@/lib/session";
import { checkPassword } from "@/lib/auth";
import { emailLoginCode } from "@/lib/login-code";

const cookie = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

/** Step 1: email + password. If right, a 6-digit code is emailed (step 2). */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase(), pw = String(form.get("password") || "");
  const next = String(form.get("next") || "/dashboard");
  const fail = (e: string) => NextResponse.redirect(new URL(`/login?error=${e}`, req.url), 303);
  const [u] = await sql`select * from users where email = ${email}`;
  if (!u) return fail("1");
  if (u.locked_until && new Date(u.locked_until) > new Date()) return fail("locked");
  if (!u.pw_hash) return fail("nopw");
  if (!checkPassword(pw, u.pw_hash)) {
    await sql`update users set failed_count = failed_count + 1, locked_until = case when failed_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end where id = ${u.id}`;
    return fail("1");
  }
  try { await emailLoginCode(u as never, "login"); } catch (e) { console.error("login code", (e as Error).message); return fail("send"); }
  const res = NextResponse.redirect(new URL(`/login/code?next=${encodeURIComponent(next)}&e=${encodeURIComponent(email)}`, req.url), 303);
  res.cookies.set(PENDING, await makeToken(u.id, 10 / 1440, "p"), { ...cookie, maxAge: 600 });
  return res;
}
