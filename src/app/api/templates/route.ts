import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = body.name ?? "Untitled template";
  const design = body.design ?? {
    body: {
      rows: [],
      values: {
        contentWidth: "600px", backgroundColor: "#fffdf8", textColor: "#262967", contentAlign: "center",
        fontFamily: { label: "Poppins (body)", value: "'Poppins', Arial, Helvetica, sans-serif", url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" },
        linkStyle: { body: true, linkColor: "#00bfb3", linkHoverColor: "#2dccd3", linkUnderline: true, linkHoverUnderline: true },
        preheaderText: "",
      },
    },
    schemaVersion: 21,
  };
  const [row] = await sql`insert into templates(name, design) values (${name}, ${JSON.stringify(design)}::jsonb) returning id`;
  return NextResponse.json({ id: row.id });
}
