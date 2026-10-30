import { NextRequest, NextResponse } from "next/server";
import { canvaConnected, listDesigns } from "@/lib/canva";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!(await canvaConnected())) return NextResponse.json({ connected: false, items: [] });
  try {
    const r = await listDesigns(req.nextUrl.searchParams.get("q") ?? "", req.nextUrl.searchParams.get("continuation") ?? undefined);
    const imported = new Set((await sql`select split_part(source_url, ':', 2) as id from media where source = 'canva'`).map(x => x.id));
    return NextResponse.json({ connected: true, continuation: r.continuation, items: r.items.map(d => ({ ...d, imported: imported.has(d.id) })) });
  } catch (e) { return NextResponse.json({ connected: true, items: [], error: (e as Error).message }, { status: 500 }); }
}
