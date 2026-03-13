import { NextRequest, NextResponse } from "next/server";
import {
  getMatches,
  getPlayer,
  isPubgApiConfigured,
  isPubgApiKeyMissingError,
  isPubgApiQuotaExceededError,
  sanitizePlatformShard,
} from "@/lib/pubg";
import type { MatchQueueFilter } from "@/lib/pubg";
import { getApiCache, setApiCache } from "@/lib/apiCache";
import { getPubgPlayerCache, upsertPubgPlayerCache } from "@/features/player-search/api/cacheService";
import {
  clampInteger,
  isValidPlayerSearchInput,
  sanitizeAccountId,
  sanitizePlayerSearchInput,
  sanitizeSeasonId,
} from "@/lib/requestValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extractCachedMatches(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Array.isArray((payload as { matches?: unknown }).matches)
  ) {
    return (payload as { matches: unknown[] }).matches;
  }
  return [];
}

function mergeMatchesIntoCachePayload(existingPayload: unknown, matches: unknown[]): unknown {
  if (
    existingPayload &&
    typeof existingPayload === "object" &&
    !Array.isArray(existingPayload) &&
    Array.isArray((existingPayload as { matches?: unknown }).matches)
  ) {
    return {
      ...(existingPayload as Record<string, unknown>),
      matches,
      fetchedAt: new Date().toISOString(),
    };
  }
  return matches;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawUsername = searchParams.get("username") ?? "";
  const rawAccountId = searchParams.get("accountId") ?? "";
  const rawSeasonId = searchParams.get("season") ?? "";

  const username = sanitizePlayerSearchInput(rawUsername);
  const accountId = rawAccountId.trim().length > 0 ? sanitizeAccountId(rawAccountId) : null;
  const seasonId = rawSeasonId.trim().length > 0 ? sanitizeSeasonId(rawSeasonId) : null;
  const limit = clampInteger(searchParams.get("limit"), { min: 1, max: 180, fallback: 120 });
  const requestedPlatform = sanitizePlatformShard(searchParams.get("platform"));
  const platform = requestedPlatform;
  const forceRefresh = searchParams.has("refresh");
  const queueParam = searchParams.get("queue")?.trim().toLowerCase();
  const queueFilter: MatchQueueFilter =
    queueParam === "competitive" ? "competitive" : queueParam === "normal" ? "normal" : "all";

  if (rawUsername.trim().length > 0 && !isValidPlayerSearchInput(rawUsername)) {
    return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
  }

  if (rawAccountId.trim().length > 0 && !accountId) {
    return NextResponse.json({ error: "Invalid accountId format" }, { status: 400 });
  }

  if (rawSeasonId.trim().length > 0 && !seasonId) {
    return NextResponse.json({ error: "Invalid season format" }, { status: 400 });
  }

  if (!isPubgApiConfigured(requestedPlatform)) {
    return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
  }

  try {
    let matchIds: string[] = [];
    let id = accountId ?? "";
    let resolvedPlayerName = username;

    if (!id && username && !forceRefresh) {
      const cachedPlayer = await getPubgPlayerCache<unknown>(username);
      if (cachedPlayer) {
        id = cachedPlayer.accountId;
        resolvedPlayerName = cachedPlayer.playerName;
        const cachedMatches = extractCachedMatches(cachedPlayer.statsData);

        if (cachedPlayer.isFresh && cachedMatches.length > 0) {
          return NextResponse.json({
            account_id: cachedPlayer.accountId,
            stats_data: cachedMatches,
            cache: {
              source: "supabase",
              fresh: true,
              updated_at: cachedPlayer.updatedAt,
            },
          });
        }
      }
    }

    if (!id && username) {
      try {
        const player = await getPlayer(username, requestedPlatform, forceRefresh);
        if (player) {
          id = player.id;
          resolvedPlayerName = player.name;
          matchIds = player.matchIds;
        }
      } catch (error) {
        if (isPubgApiQuotaExceededError(error)) {
          return NextResponse.json({ error: "API 할당량 오류" }, { status: 429 });
        }
        throw error;
      }
    }

    if (!id) {
      return NextResponse.json({
        account_id: null,
        stats_data: [] as unknown[],
        cache: {
          source: "none",
          fresh: false,
          updated_at: null,
        },
      });
    }

    const cacheKey = `matches:v2:${platform}:${id}:${limit}:${queueFilter}:${seasonId || "all"}`;
    if (!forceRefresh) {
      const cached = await getApiCache<unknown[]>(cacheKey);
      if (Array.isArray(cached)) {
        if (resolvedPlayerName) {
          const existingCache = await getPubgPlayerCache<unknown>(resolvedPlayerName);
          await upsertPubgPlayerCache({
            playerName: resolvedPlayerName,
            accountId: id,
            statsData: mergeMatchesIntoCachePayload(existingCache?.statsData, cached),
          });
        }
        return NextResponse.json({
          account_id: id,
          stats_data: cached,
          cache: {
            source: "memory",
            fresh: true,
            updated_at: new Date().toISOString(),
          },
        });
      }
    }

    const data = await getMatches(id, matchIds, limit, queueFilter, platform, forceRefresh, seasonId || undefined);
    if (!forceRefresh) {
      await setApiCache(cacheKey, data, 75, ["matches", platform, id, queueFilter, seasonId || "all"]);
    }

    if (resolvedPlayerName) {
      const existingCache = await getPubgPlayerCache<unknown>(resolvedPlayerName);
      await upsertPubgPlayerCache({
        playerName: resolvedPlayerName,
        accountId: id,
        statsData: mergeMatchesIntoCachePayload(existingCache?.statsData, data),
      });
    }

    return NextResponse.json({
      account_id: id,
      stats_data: data,
      cache: {
        source: "live",
        fresh: true,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (isPubgApiQuotaExceededError(error)) {
      return NextResponse.json({ error: "API 할당량 오류" }, { status: 429 });
    }
    if (isPubgApiKeyMissingError(error)) {
      return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
    }
    console.error("Matches API failed:", error);
    return NextResponse.json({ error: "전적 데이터를 불러오는 중입니다." }, { status: 502 });
  }
}
