import { NextRequest, NextResponse } from "next/server";
import { importDesign } from "@/lib/canva";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { designId } = await req.json();
  try { return NextResponse.json({ items: await importDesign(designId) }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }
}
