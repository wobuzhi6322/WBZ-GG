import { NextRequest, NextResponse } from "next/server";
import { getPubgWeapons, WeaponLanguage } from "@/lib/pubgWeapons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const langParam = request.nextUrl.searchParams.get("lang");
  const language: WeaponLanguage = langParam === "en" ? "en" : "ko";

  try {
    const payload = await getPubgWeapons(language);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Weapons API failed:", error);
    return NextResponse.json({ categories: [], fetchedAt: new Date().toISOString() }, { status: 200 });
  }
}
