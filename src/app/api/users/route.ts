import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

/** Owner only. POST {email,name,role} adds a person (they log in with an emailed code); {id, action:"remove"}; {id, action:"role", role}. */
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
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const r = await sql`insert into users (email, name, role) values (${email}, ${String(b.name ?? "").trim() || null}, ${b.role === "owner" ? "owner" : "staff"}) on conflict (email) do nothing returning id`;
  if (!r.length) return NextResponse.json({ error: "That email already has a login." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
