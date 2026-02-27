import { NextRequest, NextResponse } from "next/server";
import { getPlayerSuggestions, sanitizeLeaderboardRegion } from "@/lib/pubg";
import { getApiCache, setApiCache } from "@/lib/apiCache";
import { clampInteger, isValidPlayerSearchInput, sanitizePlayerSearchInput } from "@/lib/requestValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const rawRegion = request.nextUrl.searchParams.get("region");
  const query = sanitizePlayerSearchInput(rawQuery);
  const region = sanitizeLeaderboardRegion(rawRegion);
  const limit = clampInteger(request.nextUrl.searchParams.get("limit"), { min: 1, max: 10, fallback: 10 });

  if (rawQuery.trim().length > 0 && !isValidPlayerSearchInput(rawQuery)) {
    return NextResponse.json(
      {
        query,
        region,
        suggestions: [] as string[],
        minLength: 3,
        source: "validation",
      },
      { status: 400 }
    );
  }

  if (query.length < 3) {
    return NextResponse.json({
      query,
      region,
      suggestions: [] as string[],
      minLength: 3,
      source: "leaderboard-cache",
    });
  }

  const cacheKey = `player-suggestions:v2:${region}:${query.toLowerCase()}:${limit}`;
  const cached = await getApiCache<string[]>(cacheKey);
  if (Array.isArray(cached) && cached.length > 0) {
    return NextResponse.json({
      query,
      region,
      suggestions: cached.slice(0, limit),
      minLength: 3,
      source: "server-cache",
    });
  }

  try {
    const suggestions = await getPlayerSuggestions(query, limit, region);
    await setApiCache(cacheKey, suggestions, 180, ["player-suggestions", region]);

    return NextResponse.json({
      query,
      region,
      suggestions,
      minLength: 3,
      source: "leaderboard-cache",
    });
  } catch (error) {
    console.error("Player suggestions API failed:", error);
    return NextResponse.json({
      query,
      region,
      suggestions: [] as string[],
      minLength: 3,
      source: "fallback-empty",
    });
  }
}
