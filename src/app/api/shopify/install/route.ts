import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { setSetting } from "@/lib/settings";

const SCOPES = "read_customers,read_orders,read_files,write_files,read_marketing_events,read_checkouts,read_discounts,write_discounts,read_products";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  await setSetting("shopify_oauth_state", state);
  const url = new URL(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/oauth/authorize`);
  url.searchParams.set("client_id", process.env.SHOPIFY_CLIENT_ID!);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("redirect_uri", `${process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz"}/api/shopify/callback`);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
