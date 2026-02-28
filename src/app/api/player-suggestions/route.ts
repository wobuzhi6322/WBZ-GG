import { NextRequest, NextResponse } from "next/server";
import { sanitizeLeaderboardRegion } from "@/lib/pubg";
import { clampInteger, sanitizePlayerSearchInput } from "@/lib/requestValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const rawRegion = request.nextUrl.searchParams.get("region");
  const query = sanitizePlayerSearchInput(rawQuery);
  const region = sanitizeLeaderboardRegion(rawRegion);
  const limit = clampInteger(request.nextUrl.searchParams.get("limit"), { min: 1, max: 10, fallback: 10 });
  return NextResponse.json({
    query,
    region,
    suggestions: [] as string[],
    limit,
    minLength: 3,
    source: "disabled",
  });
}
