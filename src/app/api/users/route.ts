import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

const link = (req: NextRequest, t: string) => `${process.env.APP_URL ?? req.nextUrl.origin}/login/setup?token=${t}`;
/** Owner only. POST {email,name,role} adds a person; {id, action:"reset"} issues a fresh setup link; {id, action:"remove"}; {id, role}. */
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
  const token = randomBytes(24).toString("hex");
  if (b.action === "reset") {
    // Fresh password + phone code. The old ones stop working straight away.
    await sql`update users set pw_hash = null, totp_secret = null, totp_enabled = false, setup_token = ${token}, setup_expires = now() + interval '48 hours', failed_count = 0, locked_until = null where id = ${b.id}`;
    return NextResponse.json({ ok: true, link: link(req, token) });
  }
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const r = await sql`insert into users (email, name, role, setup_token, setup_expires) values (${email}, ${String(b.name ?? "").trim() || null}, ${b.role === "owner" ? "owner" : "staff"}, ${token}, now() + interval '48 hours') on conflict (email) do nothing returning id`;
  if (!r.length) return NextResponse.json({ error: "That email already has a login." }, { status: 400 });
  return NextResponse.json({ ok: true, link: link(req, token) });
}
