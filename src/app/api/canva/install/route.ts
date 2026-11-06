import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { setSetting } from "@/lib/settings";

const SCOPES = "asset:read asset:write design:meta:read design:content:read design:content:write design:permission:read design:permission:write folder:read folder:write folder:permission:read folder:permission:write comment:read comment:write brandtemplate:meta:read brandtemplate:content:read profile:read";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  await setSetting("canva_oauth", JSON.stringify({ state, verifier }));
  const u = new URL("https://www.canva.com/api/oauth/authorize");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", process.env.CANVA_CLIENT_ID!);
  u.searchParams.set("redirect_uri", `${process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz"}/api/canva/callback`);
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("state", state);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  return NextResponse.redirect(u);
}
