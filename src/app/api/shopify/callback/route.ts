import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSetting, setSetting } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const hmac = p.get("hmac") ?? "";
  const pairs = [...p.entries()].filter(([k]) => k !== "hmac").sort(([a], [b]) => a.localeCompare(b));
  const msg = pairs.map(([k, v]) => `${k}=${v}`).join("&");
  const digest = createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET!).update(msg).digest("hex");
  if (hmac.length !== digest.length || !timingSafeEqual(Buffer.from(hmac), Buffer.from(digest)))
    return new NextResponse("Bad HMAC", { status: 400 });
  if (p.get("state") !== (await getSetting("shopify_oauth_state"))) return new NextResponse("Bad state", { status: 400 });
  if (p.get("shop") !== process.env.SHOPIFY_STORE_DOMAIN) return new NextResponse("Wrong shop", { status: 400 });

  const r = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, code: p.get("code") }),
  });
  if (!r.ok) return new NextResponse(`Token exchange failed: ${await r.text()}`, { status: 500 });
  const { access_token, scope } = await r.json();
  await setSetting("shopify_access_token", access_token);
  await setSetting("shopify_scopes", scope ?? "");
  return new NextResponse("Shopify connected to Bluebells EDM. You can close this tab.", { status: 200 });
}
