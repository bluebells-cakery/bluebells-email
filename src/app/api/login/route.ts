import { NextRequest, NextResponse } from "next/server";
import { COOKIE, makeToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const pw = String(form.get("password") || ""), want = process.env.EDM_PASSWORD || "";
  const next = String(form.get("next") || "/dashboard");
  if (!want || pw.length !== want.length || !pw.split("").every((c, i) => c === want[i])) return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
  const res = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/dashboard", req.url), 303);
  res.cookies.set(COOKIE, await makeToken(90), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 90 * 86400 });
  return res;
}
