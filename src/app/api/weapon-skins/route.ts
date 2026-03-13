import { NextRequest, NextResponse } from "next/server";
import { getPubgWeaponSkins, PubgSkinCollectionType, WeaponSkinLanguage } from "@/lib/pubgWeaponSkins";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const langParam = request.nextUrl.searchParams.get("lang");
  const language: WeaponSkinLanguage = langParam === "en" ? "en" : "ko";
  const typeParam = request.nextUrl.searchParams.get("type");
  const collectionType: PubgSkinCollectionType =
    typeParam === "clothing" || typeParam === "all" || typeParam === "weapon" ? typeParam : "weapon";

  try {
    const payload = await getPubgWeaponSkins(language, collectionType);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Weapon skins API failed:", error);
    return NextResponse.json(
      {
        categories: [],
        items: [],
        fetchedAt: new Date().toISOString(),
        totalSkins: 0,
        collectionType,
      },
      { status: 200 }
    );
  }
}
