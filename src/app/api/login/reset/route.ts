import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { PENDING, makeToken } from "@/lib/session";
import { emailLoginCode } from "@/lib/login-code";

/** First time / forgot password: email in → code emailed → set a password on the next screen. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const res = NextResponse.redirect(new URL(`/login/code?mode=reset&e=${encodeURIComponent(email)}`, req.url), 303);
  const [u] = await sql`select * from users where email = ${email}`;
  if (!u) return res; // same screen either way — doesn't reveal who has a login
  if (u.locked_until && new Date(u.locked_until) > new Date()) return NextResponse.redirect(new URL("/login?error=locked", req.url), 303);
  try { await emailLoginCode(u as never, "reset"); } catch (e) { console.error("reset code", (e as Error).message); return NextResponse.redirect(new URL("/login?error=send", req.url), 303); }
  res.cookies.set(PENDING, await makeToken(u.id, 10 / 1440, "r"), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
