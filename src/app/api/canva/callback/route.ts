import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/settings";
import { saveTokens } from "@/lib/canva";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("error")) return new NextResponse(`Canva said: ${p.get("error_description") ?? p.get("error")}`, { status: 400 });
  const saved = JSON.parse((await getSetting("canva_oauth")) ?? "{}");
  if (!saved.state || p.get("state") !== saved.state) return new NextResponse("Bad state", { status: 400 });
  const basic = "Basic " + Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString("base64");
  const r = await fetch("https://api.canva.com/rest/v1/oauth/token", { method: "POST", headers: { Authorization: basic, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code: p.get("code")!, code_verifier: saved.verifier, redirect_uri: `${process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz"}/api/canva/callback` }) });
  if (!r.ok) return new NextResponse(`Token exchange failed: ${await r.text()}`, { status: 500 });
  await saveTokens(await r.json());
  return NextResponse.redirect(new URL("/media?canva=connected", req.url));
}
