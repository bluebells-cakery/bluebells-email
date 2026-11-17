import { NextRequest, NextResponse } from "next/server";
import { randomInt, createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { PENDING, makeToken } from "@/lib/session";
import { sendEmail } from "@/lib/ses";

const cookie = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
const hash = (s: string) => createHash("sha256").update((process.env.EDM_SESSION_SECRET ?? "") + ":" + s).digest("hex");

/** Step 1: email in → 6-digit code emailed (only to people added on the Users page). */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const next = String(form.get("next") || "/dashboard");
  const [u] = await sql`select * from users where email = ${email}`;
  // Same next screen whether or not the email is on the list, so the form can't be used to find out who has a login.
  const res = NextResponse.redirect(new URL(`/login/code?next=${encodeURIComponent(next)}&e=${encodeURIComponent(email)}`, req.url), 303);
  if (!u) return res;
  if (u.locked_until && new Date(u.locked_until) > new Date()) return NextResponse.redirect(new URL("/login?error=locked", req.url), 303);
  const recent = u.login_code_sent_at && Date.now() - new Date(u.login_code_sent_at).getTime() < 30_000;
  if (!recent) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await sql`update users set login_code_hash = ${hash(code)}, login_code_expires = now() + interval '10 minutes', login_code_sent_at = now() where id = ${u.id}`;
    const html = `<div style="font-family:Arial,sans-serif;color:#262967;font-size:15px;line-height:1.5"><p>Your Bluebells EDM login code:</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold;margin:12px 0">${code}</p><p style="color:#666;font-size:13px">It works once, for 10 minutes. If you didn't try to log in, ignore this email.</p></div>`;
    try { await sendEmail({ to: u.email, subject: `Your Bluebells EDM login code: ${code}`, html, text: `Your Bluebells EDM login code: ${code}\nIt works once, for 10 minutes.`, fromName: "Bluebells EDM" }); }
    catch (e) { console.error("login code", (e as Error).message); return NextResponse.redirect(new URL("/login?error=send", req.url), 303); }
  }
  res.cookies.set(PENDING, await makeToken(u.id, 10 / 1440, "p"), { ...cookie, maxAge: 600 });
  return res;
}
