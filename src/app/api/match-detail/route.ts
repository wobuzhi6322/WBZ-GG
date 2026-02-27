import { NextRequest, NextResponse } from "next/server";
import {
  getMatchDetail,
  isPubgApiConfigured,
  isPubgApiKeyMissingError,
  isPubgApiQuotaExceededError,
  sanitizePlatformShard,
} from "@/lib/pubg";
import { getApiCache, setApiCache } from "@/lib/apiCache";
import { sanitizeAccountId, sanitizeMatchId } from "@/lib/requestValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rawMatchId = request.nextUrl.searchParams.get("matchId") ?? "";
  const rawAccountId = request.nextUrl.searchParams.get("accountId") ?? "";
  const matchId = sanitizeMatchId(rawMatchId);
  const accountId = rawAccountId.trim().length > 0 ? sanitizeAccountId(rawAccountId) : null;
  const platform = sanitizePlatformShard(request.nextUrl.searchParams.get("platform"));
  const forceRefresh = request.nextUrl.searchParams.has("refresh");

  if (!isPubgApiConfigured(platform)) {
    return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
  }

  if (!matchId) {
    return NextResponse.json({ error: "Invalid or missing matchId" }, { status: 400 });
  }

  if (rawAccountId.trim().length > 0 && !accountId) {
    return NextResponse.json({ error: "Invalid accountId format" }, { status: 400 });
  }

  const cacheKey = `match-detail:v1:${platform}:${matchId}:${accountId || "none"}`;
  try {
    if (!forceRefresh) {
      const cached = await getApiCache<Record<string, unknown>>(cacheKey);
      if (cached && typeof cached === "object") {
        return NextResponse.json(cached);
      }
    }

    const payload = await getMatchDetail(matchId, accountId || undefined, platform, forceRefresh);
    if (!payload) {
      return NextResponse.json({ error: "Match detail not found" }, { status: 404 });
    }

    if (!forceRefresh) {
      await setApiCache(cacheKey, payload, 300, ["match-detail", platform, matchId]);
    }
    return NextResponse.json(payload);
  } catch (error) {
    if (isPubgApiQuotaExceededError(error)) {
      return NextResponse.json({ error: "API 할당량 오류" }, { status: 429 });
    }
    if (isPubgApiKeyMissingError(error)) {
      return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
    }
    console.error("Match detail API failed:", error);
    return NextResponse.json({ error: "매치 상세 데이터를 불러오는 중입니다." }, { status: 502 });
  }
}
