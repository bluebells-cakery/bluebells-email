import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Resend webhooks (Svix-signed): email.bounced / email.complained / email.delivered / email.delivery_delayed
function verify(req: NextRequest, raw: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET; if (!secret) return true; // not configured yet
  const id = req.headers.get("svix-id"), ts = req.headers.get("svix-timestamp"), sigs = req.headers.get("svix-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
  return sigs.split(" ").some(s => { const v = s.split(",")[1] ?? ""; try { return v.length === expected.length && timingSafeEqual(Buffer.from(v), Buffer.from(expected)); } catch { return false; } });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verify(req, raw)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  let ev: { type: string; data: { email_id?: string; to?: string[]; bounce?: { type?: string; subType?: string } } };
  try { ev = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const map: Record<string, string> = { "email.bounced": "bounce", "email.complained": "complaint", "email.delivered": "delivery", "email.delivery_delayed": "deliverydelay", "email.failed": "reject" };
  const eventType = map[ev.type]; if (!eventType) return NextResponse.json({ ok: true, ignored: ev.type });
  const messageId = ev.data.email_id;
  const recipients = (ev.data.to ?? []).map(e => e.toLowerCase());
  const sendRow = messageId ? (await sql`select id, contact_id, campaign_id, flow_id from send_queue where ses_message_id = ${messageId}`)[0] : undefined;

  if (eventType === "bounce" && (ev.data.bounce?.type ?? "Permanent") === "Permanent") {
    for (const email of recipients) {
      await sql`insert into suppressions(email, reason, source) values (${email}, 'bounce', 'resend') on conflict (email) do nothing`;
      await sql`update contacts set status='suppressed', suppressed_reason='bounce', updated_at=now() where email=${email} and status<>'suppressed'`;
    }
  } else if (eventType === "complaint") {
    for (const email of recipients) {
      await sql`insert into suppressions(email, reason, source) values (${email}, 'complaint', 'resend') on conflict (email) do update set reason='complaint'`;
      await sql`update contacts set status='suppressed', suppressed_reason='complaint', updated_at=now() where email=${email}`;
    }
  }
  await sql`insert into events(contact_id, send_id, campaign_id, flow_id, type, meta)
    values (${sendRow?.contact_id ?? null}, ${sendRow?.id ?? null}, ${sendRow?.campaign_id ?? null}, ${sendRow?.flow_id ?? null}, ${eventType}, ${JSON.stringify({ recipients, messageId, provider: "resend", bounce: ev.data.bounce ?? null })})`;
  return NextResponse.json({ ok: true });
}
