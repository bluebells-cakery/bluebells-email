import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Receives SNS notifications for SES events (bounce, complaint, delivery, reject).
export async function POST(req: NextRequest) {
  const raw = await req.text();
  let msg: Record<string, unknown>;
  try { msg = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const type = req.headers.get("x-amz-sns-message-type") ?? msg.Type;

  if (type === "SubscriptionConfirmation" && typeof msg.SubscribeURL === "string") {
    await fetch(msg.SubscribeURL);
    return NextResponse.json({ ok: true, confirmed: true });
  }
  if (type !== "Notification") return NextResponse.json({ ok: true });

  let ev: Record<string, unknown>;
  try { ev = JSON.parse(msg.Message as string); } catch { return NextResponse.json({ ok: true }); }

  const eventType = String(ev.eventType ?? ev.notificationType ?? "").toLowerCase();
  const mail = (ev.mail ?? {}) as { messageId?: string; destination?: string[]; tags?: Record<string, string[]> };
  const messageId = mail.messageId;
  const sendRow = messageId
    ? (await sql`select id, contact_id, campaign_id, flow_id from send_queue where ses_message_id = ${messageId}`)[0]
    : undefined;

  const recipients: string[] = [];
  if (eventType === "bounce") {
    const b = ev.bounce as { bounceType?: string; bouncedRecipients?: { emailAddress: string }[] };
    for (const r of b.bouncedRecipients ?? []) recipients.push(r.emailAddress);
    if (b.bounceType === "Permanent") {
      for (const email of recipients) {
        await sql`insert into suppressions(email, reason, source) values (${email}, 'bounce', 'ses') on conflict (email) do nothing`;
        await sql`update contacts set status='suppressed', suppressed_reason='bounce', updated_at=now() where email=${email} and status<>'suppressed'`;
      }
    }
  } else if (eventType === "complaint") {
    const c = ev.complaint as { complainedRecipients?: { emailAddress: string }[] };
    for (const r of c.complainedRecipients ?? []) recipients.push(r.emailAddress);
    for (const email of recipients) {
      await sql`insert into suppressions(email, reason, source) values (${email}, 'complaint', 'ses') on conflict (email) do update set reason='complaint'`;
      await sql`update contacts set status='suppressed', suppressed_reason='complaint', updated_at=now() where email=${email}`;
    }
  } else {
    recipients.push(...(mail.destination ?? []));
  }

  if (["bounce", "complaint", "delivery", "reject", "deliverydelay"].includes(eventType)) {
    await sql`insert into events(contact_id, send_id, campaign_id, flow_id, type, meta)
      values (${sendRow?.contact_id ?? null}, ${sendRow?.id ?? null}, ${sendRow?.campaign_id ?? null}, ${sendRow?.flow_id ?? null}, ${eventType}, ${JSON.stringify({ recipients, messageId })})`;
  }
  return NextResponse.json({ ok: true });
}

