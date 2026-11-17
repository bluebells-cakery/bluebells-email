import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { sendEmail } from "@/lib/ses";

async function sendInvite(req: NextRequest, to: string, name: string | null, from: string) {
  const url = `${process.env.APP_URL ?? req.nextUrl.origin}/login/reset?e=${encodeURIComponent(to)}`;
  const hi = name ? `Hi ${name},` : "Hi,";
  const html = `<div style="font-family:Arial,sans-serif;color:#262967;font-size:15px;line-height:1.6;max-width:520px">
<p>${hi}</p><p>${from} has given you a login to <b>Bluebells EDM</b>, our email marketing app.</p>
<p><a href="${url}" style="display:inline-block;background:#262967;color:#fff;text-decoration:none;padding:12px 22px;border-radius:24px">Set up my login</a></p>
<ol style="padding-left:18px"><li>Click the button above (your email is filled in) and press <b>Email me a code</b>.</li><li>We&rsquo;ll email you a 6-digit code. Type it in and choose a password (10+ characters).</li><li>After that, log in at edm.bluebellscakery.co.nz with your email and password, plus a code we email you each time.</li></ol>
<p style="color:#666;font-size:13px">If you weren&rsquo;t expecting this, you can ignore it.</p></div>`;
  await sendEmail({ to, subject: "Your Bluebells EDM login", html, text: `${hi}\n\n${from} has given you a login to Bluebells EDM.\n\n1. Open ${url} and press Email me a code.\n2. Type in the 6-digit code we email you and choose a password (10+ characters).\n3. After that, log in at edm.bluebellscakery.co.nz with your email and password, plus a code we email you each time.`, fromName: "Bluebells EDM" });
}

/** Owner only. POST {email,name,role} adds a person and emails them an invite; {id, action:"invite"} resends it; {id, action:"remove"}; {id, action:"role", role}. */
export async function POST(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "Only the account owner can manage logins." }, { status: 403 });
  const b = await req.json();
  if (b.action === "remove") {
    if (Number(b.id) === owner.id) return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });
    await sql`delete from users where id = ${b.id}`; return NextResponse.json({ ok: true });
  }
  if (b.action === "role") {
    if (Number(b.id) === owner.id) return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
    await sql`update users set role = ${b.role === "owner" ? "owner" : "staff"} where id = ${b.id}`; return NextResponse.json({ ok: true });
  }
  if (b.action === "invite") {
    const [u] = await sql`select email, name from users where id = ${b.id}`;
    if (!u) return NextResponse.json({ error: "Not found." }, { status: 404 });
    try { await sendInvite(req, u.email, u.name, owner.name ?? "Ryan"); } catch (e) { return NextResponse.json({ error: "Couldn't send the invite: " + (e as Error).message }, { status: 500 }); }
    return NextResponse.json({ ok: true, invited: u.email });
  }
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const r = await sql`insert into users (email, name, role) values (${email}, ${String(b.name ?? "").trim() || null}, ${b.role === "owner" ? "owner" : "staff"}) on conflict (email) do nothing returning id`;
  if (!r.length) return NextResponse.json({ error: "That email already has a login." }, { status: 400 });
  try { await sendInvite(req, email, String(b.name ?? "").trim() || null, owner.name ?? "Ryan"); } catch (e) { return NextResponse.json({ ok: true, invited: null, error: "Added, but the invite email didn't send: " + (e as Error).message }); }
  return NextResponse.json({ ok: true, invited: email });
}
