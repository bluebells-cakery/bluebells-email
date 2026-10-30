import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [q] = await sql`select html from send_queue where token = ${token}`;
  return q ? new NextResponse(q.html, { headers: { "content-type": "text/html" } }) : new NextResponse("Not found", { status: 404 });
}
