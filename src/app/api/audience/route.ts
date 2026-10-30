import { NextRequest, NextResponse } from "next/server";
import { audienceCount, type Audience } from "@/lib/campaigns";
export async function POST(req: NextRequest) { return NextResponse.json({ count: await audienceCount((await req.json()) as Audience) }); }
