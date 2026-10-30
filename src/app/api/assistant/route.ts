import { NextRequest, NextResponse } from "next/server";
import { runAssistant } from "@/lib/assistant";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { prompt, history = [] } = await req.json();
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
  try { return NextResponse.json(await runAssistant(prompt, history)); }
  catch (e) { return NextResponse.json({ kind: "text", text: `Error: ${(e as Error).message}` }, { status: 500 }); }
}
