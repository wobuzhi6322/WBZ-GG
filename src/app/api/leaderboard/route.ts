import { NextRequest, NextResponse } from "next/server";
import {
  type LeaderboardEntry,
  getLeaderboardSnapshot,
  isPubgApiConfigured,
  isPubgApiQuotaExceededError,
} from "@/lib/pubg";
import { getApiCache, setApiCache } from "@/lib/apiCache";
import { getPubgLeaderboardCache, upsertPubgLeaderboardCache } from "@/features/leaderboard/api/cacheService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PUBG_API_SETUP_GUIDE = "https://developer.pubg.com/";
const GLOBAL_MODE = "squad";
const GLOBAL_TOP_LIMIT = 100;
const PER_REGION_FETCH_LIMIT = 100;
const GLOBAL_REGION_DELAY_MS = 2000;
const GLOBAL_MEMORY_CACHE_TTL_SECONDS = 5 * 60;
const GLOBAL_DB_CACHE_KEY = "leaderboard:global:squad:top100:v3";

type SourceShard = "pc-kakao" | "pc-as" | "pc-na" | "pc-eu" | "pc-sea";
type RegionBadge = "KAKAO" | "AS" | "NA" | "EU" | "SEA" | "SA" | "RU";

interface GlobalRegionSource {
  shard: SourceShard;
  badge: RegionBadge;
}

interface GlobalLeaderboardEntry extends LeaderboardEntry {
  region: RegionBadge;
  sourceRegion: SourceShard;
}

const GLOBAL_REGION_SOURCES: GlobalRegionSource[] = [
  { shard: "pc-kakao", badge: "KAKAO" },
  { shard: "pc-as", badge: "AS" },
  { shard: "pc-na", badge: "NA" },
  { shard: "pc-eu", badge: "EU" },
  { shard: "pc-sea", badge: "SEA" },
];

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isGlobalEntry(value: unknown): value is GlobalLeaderboardEntry {
  if (!isObjectRecord(value)) return false;
  return (
    typeof value.name === "string" &&
    typeof value.rp === "number" &&
    typeof value.region === "string" &&
    typeof value.sourceRegion === "string"
  );
}

function isGlobalEntriesArray(payload: unknown): payload is GlobalLeaderboardEntry[] {
  return Array.isArray(payload) && payload.every(isGlobalEntry);
}

function appendWarning(baseWarning: string | null, extraWarning: string): string {
  const base = typeof baseWarning === "string" ? baseWarning.trim() : "";
  return base ? `${base} ${extraWarning}` : extraWarning;
}

function joinWarnings(warnings: string[]): string | null {
  const normalized = warnings
    .map((warning) => warning.trim())
    .filter((warning) => warning.length > 0);

  if (normalized.length === 0) return null;
  return Array.from(new Set(normalized)).join(" ");
}

async function sleep(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function entryIdentity(entry: LeaderboardEntry): string {
  const accountKey = entry.accountId?.trim().toLowerCase();
  if (accountKey) return `account:${accountKey}`;
  return `name:${entry.name.trim().toLowerCase()}`;
}

function isCandidateBetter(candidate: GlobalLeaderboardEntry, current: GlobalLeaderboardEntry): boolean {
  if (candidate.rp !== current.rp) return candidate.rp > current.rp;
  if (candidate.kills !== current.kills) return candidate.kills > current.kills;
  if (candidate.winRate !== current.winRate) return candidate.winRate > current.winRate;
  if (candidate.wins !== current.wins) return candidate.wins > current.wins;
  if (candidate.games !== current.games) return candidate.games > current.games;
  return candidate.rank < current.rank;
}

function compareGlobalEntries(a: GlobalLeaderboardEntry, b: GlobalLeaderboardEntry): number {
  if (b.rp !== a.rp) return b.rp - a.rp;
  if (b.kills !== a.kills) return b.kills - a.kills;
  if (b.winRate !== a.winRate) return b.winRate - a.winRate;
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (b.games !== a.games) return b.games - a.games;
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.name.localeCompare(b.name);
}

function toQuotaWarningByRegion(source: GlobalRegionSource): string {
  return `[${source.badge}] API 할당량 제한으로 데이터를 불러오는 중입니다.`;
}

function toGenericWarningByRegion(source: GlobalRegionSource): string {
  return `[${source.badge}] 데이터를 불러오는 중입니다.`;
}

async function fetchGlobalTop100(forceRefresh: boolean): Promise<{
  entries: GlobalLeaderboardEntry[];
  seasonId: string | null;
  triedShards: string[];
  warnings: string[];
}> {
  const merged = new Map<string, GlobalLeaderboardEntry>();
  const warnings: string[] = [];
  const triedShards: string[] = [];
  let seasonId: string | null = null;

  for (let index = 0; index < GLOBAL_REGION_SOURCES.length; index += 1) {
    const source = GLOBAL_REGION_SOURCES[index];
    triedShards.push(source.shard);

    if (index > 0) {
      await sleep(GLOBAL_REGION_DELAY_MS);
    }

    try {
      const snapshot = await getLeaderboardSnapshot(GLOBAL_MODE, PER_REGION_FETCH_LIMIT, source.shard, forceRefresh);
      if (!seasonId && snapshot.seasonId) {
        seasonId = snapshot.seasonId;
      }
      if (snapshot.warning) {
        warnings.push(`[${source.badge}] ${snapshot.warning}`);
      }

      for (const entry of snapshot.entries) {
        if (entry.rank <= 0) continue;
        if (!entry.name || entry.name.trim().length === 0) continue;

        const candidate: GlobalLeaderboardEntry = {
          ...entry,
          region: source.badge,
          sourceRegion: source.shard,
        };

        const key = entryIdentity(entry);
        const current = merged.get(key);
        if (!current || isCandidateBetter(candidate, current)) {
          merged.set(key, candidate);
        }
      }
    } catch (error) {
      console.error(`Global leaderboard fetch failed for ${source.shard}:`, error);
      warnings.push(isPubgApiQuotaExceededError(error) ? toQuotaWarningByRegion(source) : toGenericWarningByRegion(source));
    }
  }

  const entries = Array.from(merged.values())
    .sort(compareGlobalEntries)
    .slice(0, GLOBAL_TOP_LIMIT)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  if (entries.length === 0 && warnings.length === 0) {
    warnings.push("데이터를 불러오는 중입니다.");
  }

  return {
    entries,
    seasonId,
    triedShards,
    warnings,
  };
}

function buildResponse(options: {
  entries: GlobalLeaderboardEntry[];
  warning: string | null;
  seasonId?: string | null;
  triedShards?: string[];
  cacheHit: boolean;
  cacheSource: string;
  cacheUpdatedAt?: string | null;
  apiSetupRequired?: boolean;
}): Record<string, unknown> {
  const {
    entries,
    warning,
    seasonId = null,
    triedShards = [],
    cacheHit,
    cacheSource,
    cacheUpdatedAt = null,
    apiSetupRequired = false,
  } = options;

  return {
    entries,
    mode: GLOBAL_MODE,
    region: "global",
    sourceShard: "GLOBAL",
    seasonId,
    triedShards,
    fetchedAt: new Date().toISOString(),
    warning,
    daekkoller: null,
    pro: null,
    regionalHighlights: [],
    serverStatus: {
      requestedRegion: "global",
      activeShard: "GLOBAL",
      fallbackUsed: false,
      apiKeyConfigured: isPubgApiConfigured(),
    },
    apiSetup: apiSetupRequired
      ? {
          required: true,
          guideUrl: PUBG_API_SETUP_GUIDE,
          steps: [
            "Create or sign in to your PUBG Developer account.",
            "Create an application and issue an API key.",
            "Set PUBG_API_KEY (steam) and/or PUBG_API_KEY_KAKAO (kakao) in .env.local and restart the server.",
          ],
        }
      : {
          required: false,
          guideUrl: PUBG_API_SETUP_GUIDE,
        },
    cache: {
      hit: cacheHit,
      source: cacheSource,
      key: GLOBAL_DB_CACHE_KEY,
      updatedAt: cacheUpdatedAt,
    },
  };
}

function buildStaleCacheResponse(staleEntries: GlobalLeaderboardEntry[], cacheUpdatedAt: string | null): Record<string, unknown> {
  return buildResponse({
    entries: staleEntries,
    warning: "실시간 데이터를 불러오는 중입니다. 최근 캐시 데이터를 표시합니다.",
    cacheHit: true,
    cacheSource: "supabase-stale-cache",
    cacheUpdatedAt,
  });
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.has("refresh");
  let staleEntries: GlobalLeaderboardEntry[] | null = null;
  let staleUpdatedAt: string | null = null;

  if (!forceRefresh) {
    const memoryCachedEntries = await getApiCache<GlobalLeaderboardEntry[]>(GLOBAL_DB_CACHE_KEY);
    if (isGlobalEntriesArray(memoryCachedEntries)) {
      return NextResponse.json(
        buildResponse({
          entries: memoryCachedEntries,
          warning: null,
          cacheHit: true,
          cacheSource: "server-cache",
        })
      );
    }

    const dbCached = await getPubgLeaderboardCache<GlobalLeaderboardEntry[]>(GLOBAL_DB_CACHE_KEY);
    if (dbCached && isGlobalEntriesArray(dbCached.payload)) {
      staleEntries = dbCached.payload;
      staleUpdatedAt = dbCached.updatedAt;

      if (dbCached.isFresh) {
        await setApiCache(GLOBAL_DB_CACHE_KEY, dbCached.payload, GLOBAL_MEMORY_CACHE_TTL_SECONDS, [
          "leaderboard",
          "global",
          GLOBAL_MODE,
          "top100",
        ]);

        return NextResponse.json(
          buildResponse({
            entries: dbCached.payload,
            warning: null,
            cacheHit: true,
            cacheSource: "supabase-cache",
            cacheUpdatedAt: dbCached.updatedAt,
          })
        );
      }
    }
  }

  if (!isPubgApiConfigured()) {
    if (staleEntries) {
      return NextResponse.json(buildStaleCacheResponse(staleEntries, staleUpdatedAt));
    }

    return NextResponse.json(
      buildResponse({
        entries: [],
        warning: "API Key Missing",
        cacheHit: false,
        cacheSource: "live",
        apiSetupRequired: true,
      }),
      { status: 503 }
    );
  }

  try {
    const globalResult = await fetchGlobalTop100(forceRefresh);

    if (globalResult.entries.length === 0 && staleEntries) {
      return NextResponse.json(buildStaleCacheResponse(staleEntries, staleUpdatedAt));
    }

    const warning = joinWarnings(globalResult.warnings);
    const responsePayload = buildResponse({
      entries: globalResult.entries,
      warning,
      seasonId: globalResult.seasonId,
      triedShards: globalResult.triedShards,
      cacheHit: false,
      cacheSource: "live",
    });

    if (!forceRefresh) {
      await setApiCache(GLOBAL_DB_CACHE_KEY, globalResult.entries, GLOBAL_MEMORY_CACHE_TTL_SECONDS, [
        "leaderboard",
        "global",
        GLOBAL_MODE,
        "top100",
      ]);

      if (globalResult.entries.length > 0) {
        await upsertPubgLeaderboardCache({
          cacheKey: GLOBAL_DB_CACHE_KEY,
          payload: globalResult.entries,
        });
      }
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Global leaderboard failed:", error);

    if (staleEntries) {
      return NextResponse.json(buildStaleCacheResponse(staleEntries, staleUpdatedAt));
    }

    const warning = isPubgApiQuotaExceededError(error)
      ? "PUBG API 할당량 제한으로 데이터를 불러오는 중입니다."
      : "글로벌 리더보드를 불러오는 중입니다.";

    return NextResponse.json(
      buildResponse({
        entries: [],
        warning,
        cacheHit: false,
        cacheSource: "live",
      })
    );
  }
}
