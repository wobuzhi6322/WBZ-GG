import { NextRequest, NextResponse } from "next/server";
import { MAP_INTEL_MAPS } from "@/data/mapIntelMaps";
import { getMapIntel } from "@/lib/mapIntel";
import { sanitizeTextInput } from "@/lib/requestValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rawMapId = request.nextUrl.searchParams.get("mapId") ?? MAP_INTEL_MAPS[0].id;
  const mapId = sanitizeTextInput(rawMapId, 40);
  const knownMap = MAP_INTEL_MAPS.find((map) => map.id === mapId);

  if (!knownMap) {
    return NextResponse.json(
      {
        error: "Invalid mapId",
        availableMaps: MAP_INTEL_MAPS.map((map) => ({
          id: map.id,
          nameKo: map.nameKo,
          nameEn: map.nameEn,
          sizeKm: map.sizeKm,
        })),
      },
      { status: 400 }
    );
  }

  const payload = await getMapIntel(knownMap.id);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Invalid mapId",
        availableMaps: MAP_INTEL_MAPS.map((map) => ({
          id: map.id,
          nameKo: map.nameKo,
          nameEn: map.nameEn,
          sizeKm: map.sizeKm,
        })),
      },
      { status: 400 }
    );
  }

  return NextResponse.json(payload);
}
