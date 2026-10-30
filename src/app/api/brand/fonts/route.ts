import { NextRequest, NextResponse } from "next/server";
import { setSetting } from "@/lib/settings";
import { getExtraFonts } from "@/lib/fonts";

export async function GET() { return NextResponse.json({ fonts: await getExtraFonts() }); }

export async function POST(req: NextRequest) {
  const { family, fallback = "Arial, Helvetica, sans-serif" } = await req.json();
  if (!family) return NextResponse.json({ error: "family required" }, { status: 400 });
  const google = `${String(family).trim().replace(/ /g, "+")}:wght@400;500;600;700`;
  // verify Google Fonts knows it
  const r = await fetch(`https://fonts.googleapis.com/css2?family=${google}&display=swap`, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) return NextResponse.json({ error: `Google Fonts doesn't have "${family}"` }, { status: 404 });
  const fonts = (await getExtraFonts()).filter(f => f.family.toLowerCase() !== String(family).trim().toLowerCase());
  fonts.push({ label: String(family).trim(), family: String(family).trim(), google, fallback });
  await setSetting("extra_fonts", JSON.stringify(fonts));
  return NextResponse.json({ fonts });
}

export async function DELETE(req: NextRequest) {
  const { family } = await req.json();
  const fonts = (await getExtraFonts()).filter(f => f.family !== family);
  await setSetting("extra_fonts", JSON.stringify(fonts));
  return NextResponse.json({ fonts });
}
