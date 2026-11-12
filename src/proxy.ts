import { NextRequest, NextResponse } from "next/server";
import { COOKIE, validToken } from "@/lib/session";

/**
 * Personal logins for the EDM app (email + password + phone code). Everything is private except what the public website, SES, Shopify and cron call.
 * Session = HMAC-signed cookie carrying the user id (EDM_SESSION_SECRET).
 */
const PUBLIC = [
  /^\/login(\/(code|setup))?$/, /^\/api\/login(\/(code|setup))?$/, /^\/api\/logout$/,
  /^\/f\/[^/]+$/,                            // embeddable popup script
  /^\/api\/forms\/[^/]+\/(view|submit)$/,    // popup events + submissions
  /^\/(t|u|v|r)\//,                          // tracking, unsubscribe, view-in-browser, review form
  /^\/api\/ses\/events$/, /^\/api\/resend\/events$/, /^\/api\/shopify\//, /^\/api\/canva\/(install|callback)$/, /^\/api\/cron\//,
  /^\/_next\//, /^\/favicon/, /^\/(apple-)?icon(-\d+)?\.png$/, /^\/manifest\.webmanifest$/, /^\/brand\//, /^\/[^/]+\.(svg|png|ico|txt)$/,
];
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();
  if (await validToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const url = req.nextUrl.clone(); url.pathname = "/login"; url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
