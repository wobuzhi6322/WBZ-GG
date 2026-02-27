import "server-only";

import type {
  CurrentSeasonInfo,
  JsonApiList,
  JsonApiObject,
  LeaderboardEntry,
  LeaderboardMode,
  LeaderboardRegion,
  LeaderboardResponse,
  LeaderboardSnapshot,
  MatchBotKillSummary,
  MatchDetailPayload,
  MatchFetchResult,
  MatchKillActor,
  MatchKillLogEntry,
  MatchQueueFilter,
  MatchResponse,
  MatchSummary,
  MatchTeammateSummary,
  PlayerData,
  PlayerEntity,
  ProLeaderboardPlayerEntry,
  ProLeaderboardSnapshot,
  ProLeaderboardTeamMember,
  ProLeaderboardTeamEntry,
  ProPlayerAccumulator,
  ProParticipantRow,
  ProTeamAccumulator,
  ProTeamMemberAccumulator,
  PubgPlatformShard,
  PubgStats,
  RankedStats,
  RankedStatsResponse,
  SeasonItem,
  SeasonOption,
  SeasonStatsResponse,
  TelemetryEvent,
  TierInfo,
  TournamentListResponse,
  TournamentSummaryResponse,
  UnknownRecord,
} from "@/entities/pubg/types";
import {
  buildSeasonLabel,
  clamp,
  extractDbnos,
  extractCompetitiveRankPointDelta,
  extractCompetitiveRankPointTotal,
  extractLongestKillMeters,
  extractTotalDistanceKm,
  extractSeasonNumber,
  extractTelemetryUrl,
  formatDuration,
  formatMapName,
  formatMatchDate,
  formatModeLabel,
  formatQueueLabel,
  getPlayerNameFromMatch,
  getTierFromRp,
  isQueueMatch,
  normalizeKillLogs,
  normalizeRoutePoints,
  normalizeBlueZoneStates,
  normalizeLeaderboardEntries,
  normalizeQueueType,
  parseMatchIds,
  parseTimestamp,
  isSameActor,
  pickLatestDateIso,
  pickPrimaryMode,
  resolveMapDetail,
  resolvePrimaryTeamLabel,
  resolvePrimaryWeaponFromStats,
  resolveProTeamLabel,
  safeNumber,
  toPercent,
  toProParticipantRow,
} from "@/entities/pubg/lib/mapper";
import {
  fetchPubgGlobalJson,
  fetchPubgShardJson,
  fetchTelemetryEventsJson,
} from "@/shared/api/pubgFetcher";

export type {
  CurrentSeasonInfo,
  LeaderboardEntry,
  LeaderboardMode,
  LeaderboardRegion,
  LeaderboardSnapshot,
  MatchBotKillSummary,
  MatchDetailPayload,
  MatchKillActor,
  MatchKillLogEntry,
  MatchQueueFilter,
  MatchSummary,
  MatchFetchResult,
  MatchTeammateSummary,
  PlayerData,
  ProLeaderboardPlayerEntry,
  ProLeaderboardSnapshot,
  ProLeaderboardTeamMember,
  ProLeaderboardTeamEntry,
  PubgPlatformShard,
  PubgStats,
  RankedStats,
  SeasonOption,
  TierInfo,
} from "@/entities/pubg/types";

const STEAM_API_KEY = process.env.PUBG_API_KEY?.trim() || "";
const KAKAO_API_KEY =
  process.env.PUBG_API_KEY_KAKAO?.trim() ||
  process.env.PUBG_KAKAO_API_KEY?.trim() ||
  "";
const SHARD = "steam";
const DEFAULT_PLATFORM_SHARD: PubgPlatformShard = SHARD;
const BASE_URL = "https://api.pubg.com/shards";
const API_ROOT_URL = "https://api.pubg.com";
const LEADERBOARD_MODES = ["solo", "duo", "squad", "solo-fpp", "duo-fpp", "squad-fpp"] as const;
const LEADERBOARD_REGIONS = ["pc-as", "pc-krjp", "pc-sea", "pc-kakao", "pc-na", "pc-eu", "pc-oc", "pc-sa"] as const;
const DEFAULT_LEADERBOARD_REGION = "pc-as";
const LEADERBOARD_FALLBACK_BY_REGION: Record<(typeof LEADERBOARD_REGIONS)[number], string[]> = {
  "pc-as": ["pc-krjp", "pc-sea", "pc-kakao", "pc-na", "pc-eu", "pc-oc", "pc-sa"],
  "pc-krjp": ["pc-as", "pc-sea", "pc-kakao", "pc-na", "pc-eu", "pc-oc", "pc-sa"],
  "pc-sea": ["pc-as", "pc-krjp", "pc-kakao", "pc-na", "pc-eu", "pc-oc", "pc-sa"],
  "pc-kakao": ["pc-as", "pc-krjp", "pc-sea", "pc-na", "pc-eu", "pc-oc", "pc-sa"],
  "pc-na": ["pc-eu", "pc-as", "pc-krjp", "pc-sea", "pc-kakao", "pc-oc", "pc-sa"],
  "pc-eu": ["pc-na", "pc-as", "pc-krjp", "pc-sea", "pc-kakao", "pc-oc", "pc-sa"],
  "pc-oc": ["pc-sea", "pc-as", "pc-krjp", "pc-kakao", "pc-na", "pc-eu", "pc-sa"],
  "pc-sa": ["pc-na", "pc-eu", "pc-as", "pc-krjp", "pc-sea", "pc-kakao", "pc-oc"],
};
const MATCH_DETAIL_CACHE_TTL_MS = 1000 * 60 * 5;
const PLAYER_SUGGESTION_CACHE_TTL_MS = 1000 * 60 * 15;
const PLAYER_SUGGESTION_PREFIX_CACHE_TTL_MS = 1000 * 60 * 10;
const PRO_LEADERBOARD_CACHE_TTL_MS = 1000 * 60 * 10;
const PUBG_FETCH_MAX_RETRIES = Math.min(
  5,
  Math.max(0, Number.parseInt(process.env.PUBG_FETCH_MAX_RETRIES ?? "2", 10) || 2)
);
const PUBG_FETCH_RETRY_BASE_MS = Math.min(
  5000,
  Math.max(150, Number.parseInt(process.env.PUBG_FETCH_RETRY_BASE_MS ?? "500", 10) || 500)
);
const PUBG_MATCH_FETCH_CONCURRENCY = Math.min(
  8,
  Math.max(1, Number.parseInt(process.env.PUBG_MATCH_FETCH_CONCURRENCY ?? "3", 10) || 3)
);
const PUBG_MATCH_FETCH_CHUNK_SIZE = Math.min(
  3,
  Math.max(1, Number.parseInt(process.env.PUBG_MATCH_FETCH_CHUNK_SIZE ?? "3", 10) || 3)
);
const PUBG_MATCH_FETCH_THROTTLE_MS = Math.min(
  4000,
  Math.max(0, Number.parseInt(process.env.PUBG_MATCH_FETCH_THROTTLE_MS ?? "1000", 10) || 1000)
);
const PUBG_MATCH_FETCH_HARD_CAP = Math.min(
  240,
  Math.max(30, Number.parseInt(process.env.PUBG_MATCH_FETCH_HARD_CAP ?? "120", 10) || 120)
);
const PUBG_API_QUOTA_EXCEEDED_ERROR = "PUBG_API_QUOTA_EXCEEDED";
const PUBG_API_KEY_MISSING_ERROR = "API Key Missing";


export function isPubgApiQuotaExceededError(error: unknown): boolean {
  return error instanceof Error && error.message === PUBG_API_QUOTA_EXCEEDED_ERROR;
}

export function isPubgApiKeyMissingError(error: unknown): boolean {
  return error instanceof Error && error.message === PUBG_API_KEY_MISSING_ERROR;
}



const matchDetailCache = new Map<string, { expiresAt: number; value: MatchDetailPayload }>();
const matchDetailPending = new Map<string, Promise<MatchDetailPayload | null>>();

const playerSuggestionCache: { expiresAt: number; names: string[] } = {
  expiresAt: 0,
  names: [],
};
let playerSuggestionPending: Promise<string[]> | null = null;
const playerSuggestionPrefixCache = new Map<string, { expiresAt: number; names: string[] }>();
const playerSuggestionPrefixPending = new Map<string, Promise<string[]>>();

const proLeaderboardCache: { expiresAt: number; payload: ProLeaderboardSnapshot | null } = {
  expiresAt: 0,
  payload: null,
};
let proLeaderboardPending: Promise<ProLeaderboardSnapshot> | null = null;

const PLAYER_SUGGESTION_SEED_NAMES = [
  "Hide_On_Bush",
  "Shroud",
  "TGLTN",
  "Inonix",
  "Pio",
  "Loki",
  "Aixleft",
];

const PLAYER_SUGGESTION_SOURCE_QUERIES: Array<{ mode: LeaderboardMode; region: LeaderboardRegion }> = [
  { mode: "squad-fpp", region: "pc-as" },
  { mode: "squad", region: "pc-as" },
  { mode: "duo-fpp", region: "pc-as" },
  { mode: "duo", region: "pc-as" },
  { mode: "solo-fpp", region: "pc-as" },
  { mode: "solo", region: "pc-as" },
  { mode: "squad-fpp", region: "pc-kakao" },
  { mode: "squad-fpp", region: "pc-sea" },
  { mode: "squad-fpp", region: "pc-eu" },
  { mode: "squad-fpp", region: "pc-na" },
];

const PLAYER_SUGGESTION_LIVE_SEARCH_REGIONS = ["pc-as", "pc-kakao", "pc-sea", "pc-na", "pc-eu"] as const;
const PLAYER_SUGGESTION_LIVE_SEARCH_MODES = [
  "squad-fpp",
  "squad",
  "duo-fpp",
  "duo",
  "solo-fpp",
  "solo",
] as const;

const PLAYER_SUGGESTION_LIVE_SEARCH_QUERIES: Array<{ mode: LeaderboardMode; region: LeaderboardRegion }> =
  PLAYER_SUGGESTION_LIVE_SEARCH_REGIONS.flatMap((region) =>
    PLAYER_SUGGESTION_LIVE_SEARCH_MODES.map((mode) => ({ mode, region }))
  );

function normalizeSuggestionRegion(region: string | null | undefined): LeaderboardRegion | null {
  if (!region) return null;
  const trimmed = region.trim();
  if (!trimmed) return null;
  return sanitizeLeaderboardRegion(trimmed);
}

function getSuggestionSearchQueries(preferredRegion: LeaderboardRegion | null): Array<{ mode: LeaderboardMode; region: LeaderboardRegion }> {
  if (!preferredRegion) return PLAYER_SUGGESTION_LIVE_SEARCH_QUERIES;

  const prioritized = PLAYER_SUGGESTION_LIVE_SEARCH_QUERIES.filter((query) => query.region === preferredRegion);
  const fallback = PLAYER_SUGGESTION_LIVE_SEARCH_QUERIES.filter((query) => query.region !== preferredRegion);
  return [...prioritized, ...fallback];
}

function isLeaderboardMode(value: string): value is LeaderboardMode {
  return (LEADERBOARD_MODES as readonly string[]).includes(value);
}

function isLeaderboardRegion(value: string): value is LeaderboardRegion {
  return (LEADERBOARD_REGIONS as readonly string[]).includes(value);
}

function isPlatformShard(value: string): value is PubgPlatformShard {
  return value === "steam" || value === "kakao";
}

export function sanitizePlatformShard(value: string | null | undefined): PubgPlatformShard {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (candidate === "pc-kakao") return "kakao";
  if (candidate === "pc-steam") return "steam";
  return isPlatformShard(candidate) ? candidate : DEFAULT_PLATFORM_SHARD;
}

export function getAlternatePlatformShard(shard: PubgPlatformShard): PubgPlatformShard {
  return shard === "steam" ? "kakao" : "steam";
}

export function sanitizeLeaderboardMode(value: string | null | undefined): LeaderboardMode {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  return isLeaderboardMode(candidate) ? candidate : "squad-fpp";
}

export function sanitizeLeaderboardRegion(value: string | null | undefined): LeaderboardRegion {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (candidate === "pc-krjp") return "pc-as";
  return isLeaderboardRegion(candidate) ? candidate : DEFAULT_LEADERBOARD_REGION;
}

function resolvePubgApiKey(shard?: string): string | null {
  const normalizedShard = (shard ?? "").trim().toLowerCase();

  if (!normalizedShard) {
    return STEAM_API_KEY || KAKAO_API_KEY || null;
  }

  if (normalizedShard === "kakao" || normalizedShard === "pc-kakao") {
    return KAKAO_API_KEY || STEAM_API_KEY || null;
  }

  if (normalizedShard === "steam" || normalizedShard === "tournament") {
    return STEAM_API_KEY || KAKAO_API_KEY || null;
  }

  return STEAM_API_KEY || KAKAO_API_KEY || null;
}

export function getPubgApiKeyStatus(shard?: string): { configured: boolean } {
  const resolvedKey = resolvePubgApiKey(shard);
  return {
    configured: Boolean(resolvedKey),
  };
}

export function isPubgApiConfigured(shard?: string): boolean {
  return Boolean(resolvePubgApiKey(shard));
}

async function fetchPubg<T>(endpoint: string, ttl = 60, shard = SHARD): Promise<T | null> {
  const apiKey = resolvePubgApiKey(shard);
  if (!apiKey) {
    throw new Error(PUBG_API_KEY_MISSING_ERROR);
  }

  return fetchPubgShardJson<T>({
    endpoint,
    apiKey,
    ttl,
    maxRetries: PUBG_FETCH_MAX_RETRIES,
    retryBaseMs: PUBG_FETCH_RETRY_BASE_MS,
    quotaErrorMessage: PUBG_API_QUOTA_EXCEEDED_ERROR,
    baseUrl: BASE_URL,
    shard,
  });
}

async function fetchPubgGlobal<T>(endpoint: string, ttl = 120, shard: string = DEFAULT_PLATFORM_SHARD): Promise<T | null> {
  const apiKey = resolvePubgApiKey(shard);
  if (!apiKey) {
    throw new Error(PUBG_API_KEY_MISSING_ERROR);
  }

  return fetchPubgGlobalJson<T>({
    endpoint,
    apiKey,
    ttl,
    maxRetries: PUBG_FETCH_MAX_RETRIES,
    retryBaseMs: PUBG_FETCH_RETRY_BASE_MS,
    quotaErrorMessage: PUBG_API_QUOTA_EXCEEDED_ERROR,
    baseUrl: API_ROOT_URL,
  });
}

async function getSeasonItems(
  shard = SHARD,
  forceRefresh = false
): Promise<SeasonItem[]> {
  const seasonsData = await fetchPubg<JsonApiList<SeasonItem>>("/seasons", forceRefresh ? 0 : 3600, shard);
  if (!seasonsData?.data?.length) return [];
  return seasonsData.data.filter((item) => typeof item.id === "string" && item.id.trim().length > 0);
}

async function getCurrentSeasonId(
  shard = SHARD,
  forceRefresh = false
): Promise<string | null> {
  const seasonItems = await getSeasonItems(shard, forceRefresh);
  if (seasonItems.length === 0) return null;

  const current = seasonItems.find((season) => season.attributes?.isCurrentSeason);
  return (current ?? seasonItems[0]).id;
}

export async function getSeasonOptions(
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  limit = 10,
  forceRefresh = false
): Promise<SeasonOption[]> {
  try {
    const seasonItems = await getSeasonItems(shard, forceRefresh);
    if (seasonItems.length === 0) return [];

    const safeLimit = Math.min(Math.max(limit, 1), 40);
    const mapped = seasonItems.map((season) => {
      const seasonNumber = extractSeasonNumber(season.id);
      return {
        seasonId: season.id,
        seasonNumber,
        label: buildSeasonLabel(season.id, seasonNumber),
        isCurrent: Boolean(season.attributes?.isCurrentSeason),
      };
    });

    return mapped
      .filter((season) => season.seasonNumber !== null && season.seasonNumber >= 3 && season.seasonNumber <= 40)
      .sort((a, b) => {
        const aNumber = a.seasonNumber ?? -1;
        const bNumber = b.seasonNumber ?? -1;
        if (aNumber !== bNumber) return bNumber - aNumber;
        if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
        return b.seasonId.localeCompare(a.seasonId);
      })
      .slice(0, safeLimit);
  } catch (error) {
    console.error("Failed to fetch season options:", error);
    return [];
  }
}

export async function getCurrentSeasonInfo(
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  forceRefresh = false
): Promise<CurrentSeasonInfo | null> {
  try {
    const seasonId = await getCurrentSeasonId(shard, forceRefresh);
    if (!seasonId) return null;
    const seasonNumber = extractSeasonNumber(seasonId);
    return {
      seasonId,
      seasonNumber,
      label: buildSeasonLabel(seasonId, seasonNumber),
    };
  } catch (error) {
    console.error("Failed to fetch current season info:", error);
    return null;
  }
}

export async function getPlayer(
  playerName: string,
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  forceRefresh = false
): Promise<PlayerData | null> {
  try {
    const encodedName = encodeURIComponent(playerName.trim());
    if (!encodedName) return null;
    const ttl = forceRefresh ? 0 : shard === "kakao" ? 20 : 180;

    let response = await fetchPubg<JsonApiList<PlayerEntity>>(
      `/players?filter[playerNames]=${encodedName}`,
      ttl,
      shard
    );
    if ((!response?.data || response.data.length === 0) && !forceRefresh) {
      response = await fetchPubg<JsonApiList<PlayerEntity>>(
        `/players?filter[playerNames]=${encodedName}`,
        0,
        shard
      );
    }

    if (!response?.data?.length) return null;
    const player = response.data[0];

    return {
      id: player.id,
      name: player.attributes?.name ?? playerName,
      shardId: player.attributes?.shardId ?? shard,
      matchIds: parseMatchIds(player),
    };
  } catch (error) {
    if (isPubgApiQuotaExceededError(error) || isPubgApiKeyMissingError(error)) {
      throw error;
    }
    console.error("Failed to fetch player:", error);
    return null;
  }
}

export async function getPlayerById(
  accountId: string,
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  forceRefresh = false
): Promise<PlayerData | null> {
  try {
    const safeAccountId = accountId.trim();
    if (!safeAccountId) return null;
    const ttl = forceRefresh ? 0 : shard === "kakao" ? 20 : 120;

    let response = await fetchPubg<JsonApiObject<PlayerEntity>>(
      `/players/${safeAccountId}`,
      ttl,
      shard
    );
    if (!response?.data && !forceRefresh) {
      response = await fetchPubg<JsonApiObject<PlayerEntity>>(
        `/players/${safeAccountId}`,
        0,
        shard
      );
    }
    const player = response?.data;
    if (!player || !player.id) return null;

    return {
      id: player.id,
      name: player.attributes?.name ?? safeAccountId,
      shardId: player.attributes?.shardId ?? shard,
      matchIds: parseMatchIds(player),
    };
  } catch (error) {
    if (isPubgApiQuotaExceededError(error) || isPubgApiKeyMissingError(error)) {
      throw error;
    }
    console.error("Failed to fetch player by id:", error);
    return null;
  }
}

export async function getPlayerStats(
  accountId: string,
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  forceRefresh = false,
  seasonId?: string | null
): Promise<PubgStats | null> {
  try {
    const resolvedSeasonId = seasonId?.trim() || (await getCurrentSeasonId(shard, forceRefresh));
    if (!resolvedSeasonId) return null;
    const ttl = forceRefresh ? 0 : shard === "kakao" ? 30 : 180;

    const statsData = await fetchPubg<SeasonStatsResponse>(
      `/players/${accountId}/seasons/${resolvedSeasonId}`,
      ttl,
      shard
    );
    if (!statsData?.data?.attributes?.gameModeStats) return null;

    const selectedMode = pickPrimaryMode(statsData.data.attributes.gameModeStats);
    if (!selectedMode) return null;

    const { mode, stats } = selectedMode;
    const matches = safeNumber(stats.roundsPlayed);
    if (matches === 0) return null;

    const kills = safeNumber(stats.kills);
    const assists = safeNumber(stats.assists);
    const deaths = safeNumber(stats.losses);
    const damage = safeNumber(stats.damageDealt);
    const wins = safeNumber(stats.wins);
    const top10s = safeNumber(stats.top10s);
    const dbnos = safeNumber(stats.dBNOs);
    const timeSurvived = safeNumber(stats.timeSurvived);

    const kda = ((kills + assists) / Math.max(1, deaths)).toFixed(2);
    const avgDamage = Math.round(damage / Math.max(1, matches));
    const winRate = toPercent(wins, matches);
    const avgSurvivalMinutes = timeSurvived / Math.max(1, matches) / 60;
    const top10Rate = Number.parseFloat(toPercent(top10s, matches));
    const winRateNumber = Number.parseFloat(winRate);
    const killsPerMatch = kills / Math.max(1, matches);

    return {
      overview: {
        mode,
        modeLabel: formatModeLabel(mode),
        matchesPlayed: matches,
        wins,
        top10s,
        kills,
        damageDealt: Math.round(damage),
        assists,
        dbnos,
        timeSurvived: Math.round(timeSurvived),
        kda,
        avgDamage,
        winRate,
      },
      radar: [
        {
          subject: "전투",
          A: clamp(Math.round(killsPerMatch * 30 + avgDamage / 15), 0, 150),
          fullMark: 150,
        },
        {
          subject: "생존",
          A: clamp(Math.round(avgSurvivalMinutes * 6), 0, 150),
          fullMark: 150,
        },
        {
          subject: "팀플레이",
          A: clamp(Math.round(((assists + dbnos) / Math.max(1, matches)) * 20), 0, 150),
          fullMark: 150,
        },
        {
          subject: "상위권",
          A: clamp(Math.round(top10Rate * 1.5), 0, 150),
          fullMark: 150,
        },
        {
          subject: "승리",
          A: clamp(Math.round(winRateNumber * 3), 0, 150),
          fullMark: 150,
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return null;
  }
}

function buildLeaderboardShardCandidates(region: LeaderboardRegion): string[] {
  const fallbacks = LEADERBOARD_FALLBACK_BY_REGION[region] ?? [];
  const candidates = [region, ...fallbacks];
  return Array.from(new Set(candidates));
}

export async function getLeaderboard(
  mode = "squad-fpp",
  region = DEFAULT_LEADERBOARD_REGION,
  forceRefresh = false
) {
  const safeMode = sanitizeLeaderboardMode(mode);
  const safeRegion = sanitizeLeaderboardRegion(region);
  const snapshot = await getLeaderboardSnapshot(safeMode, 50, safeRegion, forceRefresh);
  return snapshot.entries;
}

export async function getLeaderboardSnapshot(
  mode = "squad-fpp",
  limit = 50,
  region = DEFAULT_LEADERBOARD_REGION,
  forceRefresh = false
): Promise<LeaderboardSnapshot> {
  const safeMode = sanitizeLeaderboardMode(mode);
  const safeRegion = sanitizeLeaderboardRegion(region);
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const shardCandidates = buildLeaderboardShardCandidates(safeRegion);
  const triedShards: string[] = [];
  let warning: string | null = null;

  try {
    let seasonId: string | null = null;
    for (const shard of shardCandidates) {
      seasonId = await getCurrentSeasonId(shard, forceRefresh);
      if (seasonId) break;
    }
    if (!seasonId) {
      return {
        entries: [],
        mode: safeMode,
        sourceShard: null,
        seasonId: null,
        triedShards,
        fetchedAt: new Date().toISOString(),
        warning: `Current season not found on ${safeRegion}.`,
      };
    }

    for (const shard of shardCandidates) {
      triedShards.push(shard);
      const leaderboardData = await fetchPubg<LeaderboardResponse>(
        `/leaderboards/${seasonId}/${safeMode}`,
        forceRefresh ? 0 : 120,
        shard
      );
      const entries = normalizeLeaderboardEntries(leaderboardData, safeLimit);
      if (entries.length > 0) {
        return {
          entries,
          mode: safeMode,
          sourceShard: shard,
          seasonId,
          triedShards,
          fetchedAt: new Date().toISOString(),
          warning,
        };
      }
    }

    warning = "Leaderboard data is currently empty on available shards.";
    return {
      entries: [],
      mode: safeMode,
      sourceShard: null,
      seasonId,
      triedShards,
      fetchedAt: new Date().toISOString(),
      warning,
    };
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return {
      entries: [],
      mode: safeMode,
      sourceShard: null,
      seasonId: null,
      triedShards,
      fetchedAt: new Date().toISOString(),
      warning: "Failed to fetch PUBG leaderboard.",
    };
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  if (values.length === 0) return [];

  const safeConcurrency = Math.max(1, Math.min(concurrency, values.length));
  const results = new Array<R>(values.length);
  let cursor = 0;

  async function consume(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => consume()));
  return results;
}

async function delay(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSearchName(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_.-]+/g, "");
}

function dedupeNames(values: string[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(value);
  }

  return names;
}

async function buildTournamentParticipantNamePool(matchLimit = 24): Promise<string[]> {
  try {
    const { matchIds } = await getLatestTournamentSummary();
    const sampledMatchIds = matchIds.slice(0, Math.min(Math.max(matchLimit, 1), 30));
    if (sampledMatchIds.length === 0) return [];

    const matchPayloads = await mapWithConcurrency(
      sampledMatchIds,
      4,
      async (matchId): Promise<MatchResponse | null> => {
        return fetchPubg<MatchResponse>(`/matches/${matchId}`, 300, "tournament");
      }
    );

    const names = new Set<string>();
    for (const payload of matchPayloads) {
      if (!payload?.included?.length) continue;
      for (const item of payload.included) {
        if (item.type !== "participant") continue;
        const stats = item.attributes?.stats;
        if (!stats || typeof stats !== "object") continue;
        const name = typeof (stats as UnknownRecord).name === "string" ? String((stats as UnknownRecord).name).trim() : "";
        if (!name) continue;
        names.add(name);
      }
    }

    return Array.from(names);
  } catch (error) {
    console.error("Failed to build tournament player suggestion pool:", error);
    return [];
  }
}

async function buildPlayerSuggestionPool(): Promise<string[]> {
  const names = new Set<string>(PLAYER_SUGGESTION_SEED_NAMES);
  if (!isPubgApiConfigured()) {
    return dedupeNames(Array.from(names));
  }

  const [snapshots, tournamentNames] = await Promise.all([
    Promise.all(PLAYER_SUGGESTION_SOURCE_QUERIES.map(({ mode, region }) => getLeaderboardSnapshot(mode, 500, region))),
    buildTournamentParticipantNamePool(24),
  ]);

  for (const snapshot of snapshots) {
    for (const entry of snapshot.entries) {
      const name = entry.name.trim();
      if (!name) continue;
      names.add(name);
    }
  }

  for (const name of tournamentNames) {
    names.add(name);
  }

  return dedupeNames(Array.from(names)).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

function rankPrefixMatches(names: string[], normalizedQuery: string, limit: number): string[] {
  const longerPrefixMatches: string[] = [];
  const exactMatches: string[] = [];

  for (const name of names) {
    const normalizedName = normalizeSearchName(name);
    if (!normalizedName || !normalizedName.startsWith(normalizedQuery)) continue;

    if (normalizedName.length > normalizedQuery.length) {
      longerPrefixMatches.push(name);
    } else {
      exactMatches.push(name);
    }
  }

  return [...longerPrefixMatches, ...exactMatches].slice(0, limit);
}

function mergeSuggestionPool(extraNames: string[]): void {
  if (extraNames.length === 0) return;

  const merged = dedupeNames([...playerSuggestionCache.names, ...extraNames]).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );

  playerSuggestionCache.names = merged;
  playerSuggestionCache.expiresAt = Math.max(playerSuggestionCache.expiresAt, Date.now() + PLAYER_SUGGESTION_CACHE_TTL_MS);
}

async function fetchLivePrefixMatches(
  normalizedQuery: string,
  limit: number,
  preferredRegion: string | null | undefined
): Promise<string[]> {
  const normalizedRegion = normalizeSuggestionRegion(preferredRegion);
  const cacheKey = `${normalizedRegion ?? "all"}:${normalizedQuery}`;

  const cached = playerSuggestionPrefixCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.names.slice(0, limit);
  }

  const pending = playerSuggestionPrefixPending.get(cacheKey);
  if (pending) {
    const names = await pending;
    return names.slice(0, limit);
  }

  const nextPromise = (async (): Promise<string[]> => {
    const collectedNames = new Set<string>();
    const matchedNames = new Set<string>();
    const searchQueries = getSuggestionSearchQueries(normalizedRegion);

    for (const { mode, region } of searchQueries) {
      const snapshot = await getLeaderboardSnapshot(mode, 500, region);
      if (!snapshot.entries.length) continue;

      const snapshotNames = snapshot.entries
        .map((entry) => entry.name.trim())
        .filter((name): name is string => name.length > 0);

      for (const name of snapshotNames) {
        collectedNames.add(name);
        const normalizedName = normalizeSearchName(name);
        if (normalizedName.startsWith(normalizedQuery)) {
          matchedNames.add(name);
        }
      }

      if (matchedNames.size >= limit) {
        break;
      }
    }

    const ranked = rankPrefixMatches(Array.from(matchedNames), normalizedQuery, limit);
    mergeSuggestionPool(Array.from(collectedNames));

    playerSuggestionPrefixCache.set(cacheKey, {
      expiresAt: Date.now() + PLAYER_SUGGESTION_PREFIX_CACHE_TTL_MS,
      names: ranked,
    });

    return ranked;
  })().finally(() => {
    playerSuggestionPrefixPending.delete(cacheKey);
  });

  playerSuggestionPrefixPending.set(cacheKey, nextPromise);
  const names = await nextPromise;
  return names.slice(0, limit);
}

async function getCachedPlayerSuggestionPool(): Promise<string[]> {
  if (playerSuggestionCache.expiresAt > Date.now() && playerSuggestionCache.names.length > 0) {
    return playerSuggestionCache.names;
  }

  if (playerSuggestionPending) {
    return playerSuggestionPending;
  }

  playerSuggestionPending = buildPlayerSuggestionPool()
    .then((names) => {
      playerSuggestionCache.expiresAt = Date.now() + PLAYER_SUGGESTION_CACHE_TTL_MS;
      playerSuggestionCache.names = names;
      return names;
    })
    .finally(() => {
      playerSuggestionPending = null;
    });

  return playerSuggestionPending;
}

export async function getPlayerSuggestions(
  query: string,
  limit = 10,
  preferredRegion: string | null | undefined = null
): Promise<string[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 10);
  const normalizedQuery = normalizeSearchName(query);
  if (normalizedQuery.length < 3) return [];

  const names = await getCachedPlayerSuggestionPool();
  const cachedMatches = rankPrefixMatches(names, normalizedQuery, safeLimit);
  if (cachedMatches.length > 0) {
    return cachedMatches;
  }

  return fetchLivePrefixMatches(normalizedQuery, safeLimit, preferredRegion);
}

async function getLatestTournamentSummary(): Promise<{
  tournamentId: string;
  matchIds: string[];
  createdAtByMatchId: Map<string, string>;
}> {
  const tournaments = await fetchPubgGlobal<TournamentListResponse>("/tournaments", 300);
  const latestTournamentId = tournaments?.data?.[0]?.id?.trim() ?? "";
  if (!latestTournamentId) {
    throw new Error("Tournament list is empty.");
  }

  const summary = await fetchPubgGlobal<TournamentSummaryResponse>(
    `/tournaments/${encodeURIComponent(latestTournamentId)}`,
    300
  );
  const matchIds = (summary?.data?.relationships?.matches?.data ?? [])
    .map((entry) => (typeof entry.id === "string" ? entry.id.trim() : ""))
    .filter((id): id is string => id.length > 0);

  const createdAtByMatchId = new Map<string, string>();
  for (const included of summary?.included ?? []) {
    if (included?.type !== "match") continue;
    if (!included.id || !included.attributes?.createdAt) continue;
    createdAtByMatchId.set(included.id, included.attributes.createdAt);
  }

  matchIds.sort((a, b) => parseTimestamp(createdAtByMatchId.get(b)) - parseTimestamp(createdAtByMatchId.get(a)));

  return {
    tournamentId: latestTournamentId,
    matchIds,
    createdAtByMatchId,
  };
}

async function buildProLeaderboardSnapshot(limit = 50, matchLimit = 12): Promise<ProLeaderboardSnapshot> {
  if (!isPubgApiConfigured()) {
    return {
      tournamentId: null,
      tournamentLabel: null,
      sourceShard: "tournament",
      matchesAnalyzed: 0,
      fetchedAt: new Date().toISOString(),
      warning: "API Key Missing",
      players: [],
      teams: [],
    };
  }

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeMatchLimit = Math.min(Math.max(matchLimit, 1), 30);

  try {
    const { tournamentId, matchIds, createdAtByMatchId } = await getLatestTournamentSummary();
    const sampledMatchIds = matchIds.slice(0, safeMatchLimit);

    const matchResponses = await mapWithConcurrency(
      sampledMatchIds,
      4,
      async (matchId): Promise<{ matchId: string; payload: MatchResponse | null }> => {
        const payload = await fetchPubg<MatchResponse>(`/matches/${matchId}`, 300, "tournament");
        return { matchId, payload };
      }
    );

    const playerMap = new Map<string, ProPlayerAccumulator>();
    const teamMap = new Map<string, ProTeamAccumulator>();
    let matchesAnalyzed = 0;

    for (const { matchId, payload } of matchResponses) {
      if (!payload?.included?.length) continue;
      const included = payload.included;
      const participantsById = new Map<string, ProParticipantRow>();

      for (const item of included) {
        const participant = toProParticipantRow(item);
        if (!participant) continue;
        participantsById.set(participant.participantId, participant);
      }

      const rosterItems = included.filter((item) => item.type === "roster");
      if (rosterItems.length === 0) continue;

      const matchCreatedAt =
        (typeof payload.data?.attributes?.createdAt === "string" ? payload.data.attributes.createdAt : "") ||
        createdAtByMatchId.get(matchId) ||
        "";

      let hasProcessedRoster = false;

      for (const roster of rosterItems) {
        const references = roster.relationships?.participants?.data ?? [];
        const rosterParticipants = references
          .map((ref) => (typeof ref.id === "string" ? participantsById.get(ref.id) ?? null : null))
          .filter((row): row is ProParticipantRow => row !== null);

        if (rosterParticipants.length === 0) continue;
        hasProcessedRoster = true;

        const rosterStats = (roster.attributes?.stats ?? {}) as UnknownRecord;
        const rosterRank = safeNumber(rosterStats.rank);
        const rosterTeamIdRaw = safeNumber(rosterStats.teamId);
        const rosterTeamId = rosterTeamIdRaw > 0 ? rosterTeamIdRaw : rosterParticipants[0]?.teamId ?? null;
        const averagePlacement =
          rosterParticipants.reduce((sum, participant) => sum + (participant.winPlace || 0), 0) /
          Math.max(1, rosterParticipants.length);
        const placement = rosterRank > 0 ? rosterRank : Math.max(1, Math.round(averagePlacement));

        const teamLabel = resolveProTeamLabel(rosterParticipants, rosterTeamId);
        const teamKey = `${teamLabel}:${rosterTeamId ?? "na"}`;
        const teamKills = rosterParticipants.reduce((sum, participant) => sum + participant.kills, 0);
        const teamDamage = rosterParticipants.reduce((sum, participant) => sum + participant.damage, 0);

        const teamAccumulator = teamMap.get(teamKey) ?? {
          key: teamKey,
          teamLabel,
          teamId: rosterTeamId,
          matches: 0,
          wins: 0,
          top4: 0,
          kills: 0,
          damage: 0,
          placementTotal: 0,
          lastMatchAt: "",
          roster: new Map<string, ProTeamMemberAccumulator>(),
        };

        teamAccumulator.matches += 1;
        if (placement === 1) teamAccumulator.wins += 1;
        if (placement <= 4) teamAccumulator.top4 += 1;
        teamAccumulator.kills += teamKills;
        teamAccumulator.damage += teamDamage;
        teamAccumulator.placementTotal += placement;
        teamAccumulator.lastMatchAt = pickLatestDateIso(teamAccumulator.lastMatchAt, matchCreatedAt);

        for (const participant of rosterParticipants) {
          const memberKey = participant.accountId ?? `name:${participant.name.toLowerCase()}`;
          const member = teamAccumulator.roster.get(memberKey) ?? {
            key: memberKey,
            name: participant.name,
            matches: 0,
            kills: 0,
            damage: 0,
          };

          member.matches += 1;
          member.kills += participant.kills;
          member.damage += participant.damage;
          teamAccumulator.roster.set(memberKey, member);
        }

        teamMap.set(teamKey, teamAccumulator);

        for (const participant of rosterParticipants) {
          const playerKey = participant.accountId ?? `name:${participant.name.toLowerCase()}`;
          const playerAccumulator = playerMap.get(playerKey) ?? {
            key: playerKey,
            name: participant.name,
            matches: 0,
            wins: 0,
            top4: 0,
            kills: 0,
            assists: 0,
            deaths: 0,
            damage: 0,
            placementTotal: 0,
            lastMatchAt: "",
            teamLabels: new Map<string, number>(),
          };

          const playerPlacement = participant.winPlace > 0 ? participant.winPlace : placement;
          playerAccumulator.matches += 1;
          if (playerPlacement === 1) playerAccumulator.wins += 1;
          if (playerPlacement <= 4) playerAccumulator.top4 += 1;
          playerAccumulator.kills += participant.kills;
          playerAccumulator.assists += participant.assists;
          playerAccumulator.damage += participant.damage;
          playerAccumulator.placementTotal += playerPlacement;
          if (participant.deathType && participant.deathType.toLowerCase() !== "alive") {
            playerAccumulator.deaths += 1;
          }
          playerAccumulator.lastMatchAt = pickLatestDateIso(playerAccumulator.lastMatchAt, matchCreatedAt);
          playerAccumulator.teamLabels.set(teamLabel, (playerAccumulator.teamLabels.get(teamLabel) ?? 0) + 1);

          playerMap.set(playerKey, playerAccumulator);
        }
      }

      if (hasProcessedRoster) {
        matchesAnalyzed += 1;
      }
    }

    const players: ProLeaderboardPlayerEntry[] = Array.from(playerMap.values())
      .map((player) => {
        const avgPlacement = player.placementTotal / Math.max(1, player.matches);
        const winRate = (player.wins / Math.max(1, player.matches)) * 100;
        const accountId = player.key.startsWith("name:") ? null : player.key;
        return {
          rank: 0,
          name: player.name,
          accountId,
          teamTag: resolvePrimaryTeamLabel(player.teamLabels),
          matches: player.matches,
          wins: player.wins,
          top4: player.top4,
          kills: player.kills,
          assists: player.assists,
          deaths: player.deaths,
          kda: ((player.kills + player.assists) / Math.max(1, player.deaths)).toFixed(2),
          avgDamage: Math.round(player.damage / Math.max(1, player.matches)),
          avgPlacement: Number(avgPlacement.toFixed(2)),
          winRate: Number(winRate.toFixed(2)),
          lastMatchAt: player.lastMatchAt,
        };
      })
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.kills !== a.kills) return b.kills - a.kills;
        if (a.avgPlacement !== b.avgPlacement) return a.avgPlacement - b.avgPlacement;
        if (b.avgDamage !== a.avgDamage) return b.avgDamage - a.avgDamage;
        return a.name.localeCompare(b.name);
      })
      .slice(0, safeLimit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const teams: ProLeaderboardTeamEntry[] = Array.from(teamMap.values())
      .map((team) => {
        const winRate = (team.wins / Math.max(1, team.matches)) * 100;
        const avgPlacement = team.placementTotal / Math.max(1, team.matches);

        const roster = Array.from(team.roster.values())
          .map((member) => ({
            name: member.name,
            matches: member.matches,
            kills: member.kills,
            avgDamage: Math.round(member.damage / Math.max(1, member.matches)),
          }))
          .sort((a, b) => b.kills - a.kills || b.avgDamage - a.avgDamage)
          .slice(0, 6);

        return {
          rank: 0,
          teamKey: team.key,
          teamLabel: team.teamLabel,
          teamId: team.teamId,
          matches: team.matches,
          wins: team.wins,
          top4: team.top4,
          kills: team.kills,
          avgDamage: Math.round(team.damage / Math.max(1, team.matches)),
          avgPlacement: Number(avgPlacement.toFixed(2)),
          winRate: Number(winRate.toFixed(2)),
          roster,
          lastMatchAt: team.lastMatchAt,
        };
      })
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.avgPlacement !== b.avgPlacement) return a.avgPlacement - b.avgPlacement;
        if (b.kills !== a.kills) return b.kills - a.kills;
        return a.teamLabel.localeCompare(b.teamLabel);
      })
      .slice(0, 20)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return {
      tournamentId,
      tournamentLabel: tournamentId.toUpperCase(),
      sourceShard: "tournament",
      matchesAnalyzed,
      fetchedAt: new Date().toISOString(),
      warning: players.length === 0 ? "No PRO tournament player data available." : null,
      players,
      teams,
    };
  } catch (error) {
    console.error("Error fetching PRO leaderboard:", error);
    return {
      tournamentId: null,
      tournamentLabel: null,
      sourceShard: "tournament",
      matchesAnalyzed: 0,
      fetchedAt: new Date().toISOString(),
      warning: "Failed to fetch PRO leaderboard.",
      players: [],
      teams: [],
    };
  }
}

export async function getProLeaderboardSnapshot(
  limit = 50,
  matchLimit = 12,
  forceRefresh = false
): Promise<ProLeaderboardSnapshot> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeMatchLimit = Math.min(Math.max(matchLimit, 1), 30);

  const cachedPayload = proLeaderboardCache.payload;
  if (!forceRefresh && cachedPayload && proLeaderboardCache.expiresAt > Date.now()) {
    return {
      ...cachedPayload,
      players: cachedPayload.players.slice(0, safeLimit),
    };
  }

  if (!forceRefresh && proLeaderboardPending) {
    const pendingPayload = await proLeaderboardPending;
    return {
      ...pendingPayload,
      players: pendingPayload.players.slice(0, safeLimit),
    };
  }

  proLeaderboardPending = buildProLeaderboardSnapshot(Math.max(60, safeLimit), safeMatchLimit)
    .then((payload) => {
      proLeaderboardCache.payload = payload;
      proLeaderboardCache.expiresAt = Date.now() + PRO_LEADERBOARD_CACHE_TTL_MS;
      return payload;
    })
    .finally(() => {
      proLeaderboardPending = null;
    });

  const nextPayload = await proLeaderboardPending;
  return {
    ...nextPayload,
    players: nextPayload.players.slice(0, safeLimit),
  };
}

export async function getMatchesWithMeta(
  accountId: string,
  initialMatchIds: string[] = [],
  limit = 20,
  queueFilter: MatchQueueFilter = "all",
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  forceRefresh = false,
  seasonId?: string | null
): Promise<MatchFetchResult> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const initialIds = initialMatchIds.filter(Boolean);
    let latestIds: string[] = [];
    let quotaLimited = false;

    const playerRes = await fetchPubg<JsonApiObject<PlayerEntity> | JsonApiList<PlayerEntity>>(
      `/players/${accountId}`,
      forceRefresh ? 0 : shard === "kakao" ? 20 : 60,
      shard
    );
    if (playerRes) {
      const player = Array.isArray((playerRes as JsonApiList<PlayerEntity>).data)
        ? (playerRes as JsonApiList<PlayerEntity>).data[0]
        : (playerRes as JsonApiObject<PlayerEntity>).data;
      latestIds = parseMatchIds(player);
    }

    const merged = [...latestIds, ...initialIds];
    const deduplicatedIds = Array.from(new Set(merged));
    const rawFetchLimitBase =
      queueFilter === "all" ? safeLimit : Math.min(PUBG_MATCH_FETCH_HARD_CAP, Math.max(safeLimit * 3, 90));
    const rawFetchLimit = Math.min(PUBG_MATCH_FETCH_HARD_CAP, Math.max(30, rawFetchLimitBase));
    const matchIds = deduplicatedIds.slice(0, rawFetchLimit);

    if (matchIds.length === 0) {
      return {
        matches: [],
        quotaLimited: false,
        requestedLimit: safeLimit,
        fetchedRawCount: 0,
      };
    }

    const fetchSingleMatch = async (matchId: string): Promise<MatchSummary | null> => {
      const mRes = await fetchPubg<MatchResponse>(
        `/matches/${matchId}`,
        forceRefresh ? 30 : shard === "kakao" ? 300 : 86400,
        shard
      );
      if (!mRes?.data || !mRes?.included?.length) return null;

      const participants = mRes.included.filter((item) => item.type === "participant");
      const myParticipant = participants.find((participant) => {
        const stats = participant.attributes?.stats;
        if (!stats || typeof stats !== "object") return false;
        return (stats as UnknownRecord).playerId === accountId;
      });

      if (!myParticipant) return null;

      const stats = (myParticipant.attributes?.stats ?? {}) as UnknownRecord;
      const myTeamId = safeNumber(stats.teamId);
      const myRosterId =
        typeof stats.rosterId === "number" && Number.isFinite(stats.rosterId)
          ? Number(stats.rosterId)
          : null;
      const myParticipantId = typeof myParticipant.id === "string" ? myParticipant.id : "";
      const participantStatsById = new Map<string, UnknownRecord>();
      for (const participant of participants) {
        if (typeof participant.id !== "string") continue;
        const participantStats = participant.attributes?.stats;
        if (!participantStats || typeof participantStats !== "object") continue;
        participantStatsById.set(participant.id, participantStats as UnknownRecord);
      }

      const teammateKeys = new Set<string>();
      const teammates: MatchTeammateSummary[] = [];
      const appendTeammate = (teammateStats: UnknownRecord, fallbackTeamId: number | null): void => {
        const teammateName = typeof teammateStats.name === "string" ? teammateStats.name.trim() : "";
        const teammateAccountId = typeof teammateStats.playerId === "string" ? teammateStats.playerId : null;
        const teammateTeamIdRaw = safeNumber(teammateStats.teamId);
        const teammateTeamId = teammateTeamIdRaw > 0 ? teammateTeamIdRaw : null;

        if (!teammateName) return;
        if (teammateAccountId === accountId) return;

        const dedupeKey = teammateAccountId?.trim() || teammateName.toLowerCase();
        if (!dedupeKey || teammateKeys.has(dedupeKey)) return;
        teammateKeys.add(dedupeKey);

        teammates.push({
          accountId: teammateAccountId,
          name: teammateName,
          teamId: teammateTeamId ?? fallbackTeamId,
          kills: safeNumber(teammateStats.kills),
          assists: safeNumber(teammateStats.assists),
          damage: Math.round(safeNumber(teammateStats.damageDealt)),
          headshots: safeNumber(teammateStats.headshotKills),
        });
      };

      if (myParticipantId) {
        const rosterItems = mRes.included.filter((item) => item.type === "roster");
        for (const roster of rosterItems) {
          const participantRefs = roster.relationships?.participants?.data ?? [];
          const rosterParticipantIds = participantRefs
            .map((ref) => (typeof ref.id === "string" ? ref.id : ""))
            .filter((id): id is string => id.length > 0);

          if (!rosterParticipantIds.includes(myParticipantId)) continue;

          const rosterStats = (roster.attributes?.stats ?? {}) as UnknownRecord;
          const rosterTeamIdRaw = safeNumber(rosterStats.teamId);
          const rosterTeamId = rosterTeamIdRaw > 0 ? rosterTeamIdRaw : null;
          const fallbackTeamId = rosterTeamId ?? (myTeamId > 0 ? myTeamId : null);

          for (const participantId of rosterParticipantIds) {
            if (participantId === myParticipantId) continue;
            const teammateStats = participantStatsById.get(participantId);
            if (!teammateStats) continue;
            appendTeammate(teammateStats, fallbackTeamId);
          }
          break;
        }
      }

      if (teammates.length === 0) {
        for (const participant of participants) {
          const participantStats = participant.attributes?.stats;
          if (!participantStats || typeof participantStats !== "object") continue;

          const teammateStats = participantStats as UnknownRecord;
          const teammateTeamIdRaw = safeNumber(teammateStats.teamId);
          const teammateTeamId = teammateTeamIdRaw > 0 ? teammateTeamIdRaw : null;
          const teammateRosterId =
            typeof teammateStats.rosterId === "number" && Number.isFinite(teammateStats.rosterId)
              ? Number(teammateStats.rosterId)
              : null;
          const sameTeamByTeamId = myTeamId > 0 && teammateTeamId !== null && teammateTeamId === myTeamId;
          const sameTeamByRosterId = myRosterId !== null && teammateRosterId !== null && teammateRosterId === myRosterId;

          if (!sameTeamByTeamId && !sameTeamByRosterId) continue;
          appendTeammate(teammateStats, teammateTeamId ?? (myTeamId > 0 ? myTeamId : null));
        }
      }

      const placement = safeNumber(stats.winPlace);
      const status: "win" | "top10" | "lose" = placement === 1 ? "win" : placement <= 10 ? "top10" : "lose";

      const rawMatchType = String(mRes.data.attributes?.matchType ?? "");
      const queueType = normalizeQueueType(rawMatchType);
      if (!isQueueMatch(queueType, queueFilter)) return null;
      const seasonState = String(mRes.data.attributes?.seasonState ?? "").trim();

      const kills = safeNumber(stats.kills);
      const damage = Math.round(safeNumber(stats.damageDealt));
      const dbnos = extractDbnos(stats);
      const primaryWeapon = resolvePrimaryWeaponFromStats(stats);
      const totalDistanceKm = extractTotalDistanceKm(stats);
      const longestKillMeters = extractLongestKillMeters(stats);
      const assists = safeNumber(stats.assists);
      const headshots = safeNumber(stats.headshotKills);
      const timeSurvivedSeconds = Math.round(safeNumber(stats.timeSurvived));
      const myContributionScore = kills + damage;
      const topTeammateContributionScore = teammates.reduce((max, teammate) => {
        const score = teammate.kills + teammate.damage;
        return Math.max(max, score);
      }, 0);
      const isTopContributor = myContributionScore >= Math.max(0, topTeammateContributionScore);
      const teamImpactBadge: MatchSummary["teamImpactBadge"] = isTopContributor
        ? placement > 0 && placement <= 3
          ? "CARRY"
          : "ACE"
        : null;
      const rankPointTotal = queueType === "competitive" ? extractCompetitiveRankPointTotal(stats) : null;
      const liveRankPointDelta = queueType === "competitive" ? extractCompetitiveRankPointDelta(stats) : null;

      return {
        id: mRes.data.id ?? matchId,
        map: formatMapName(String(mRes.data.attributes?.mapName ?? "")),
        mode: formatModeLabel(String(mRes.data.attributes?.gameMode ?? "unknown")),
        queueType,
        queueLabel: formatQueueLabel(queueType),
        seasonId: seasonState || seasonId?.trim() || null,
        result: placement > 0 ? `#${placement}` : "-",
        placement,
        primaryWeapon,
        kills,
        damage,
        dbnos,
        totalDistanceKm,
        longestKillMeters,
        assists,
        headshots,
        time: formatDuration(timeSurvivedSeconds),
        timeSurvivedSeconds,
        createdAt: String(mRes.data.attributes?.createdAt ?? ""),
        date: formatMatchDate(mRes.data.attributes?.createdAt),
        status,
        teamImpactBadge,
        rankPointTotal,
        rankPointDelta: liveRankPointDelta,
        rankPointDeltaSource: liveRankPointDelta !== null ? "live" : null,
        teammates,
      };
    };

    const chunkSize = Math.max(1, Math.min(PUBG_MATCH_FETCH_CONCURRENCY, PUBG_MATCH_FETCH_CHUNK_SIZE));
    const matches: Array<MatchSummary | null> = [];

    for (let start = 0; start < matchIds.length; start += chunkSize) {
      const chunk = matchIds.slice(start, start + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (matchId): Promise<MatchSummary | null> => {
          try {
            return await fetchSingleMatch(matchId);
          } catch (error) {
            if (isPubgApiQuotaExceededError(error)) {
              quotaLimited = true;
              return null;
            }
            if (isPubgApiKeyMissingError(error)) {
              throw error;
            }
            console.error("Failed to fetch match summary:", matchId, error);
            return null;
          }
        })
      );

      matches.push(...chunkResults);

      if (queueFilter === "all") {
        const matchedCount = matches.filter((match): match is MatchSummary => Boolean(match)).length;
        if (matchedCount >= safeLimit) {
          break;
        }
      }

      if (quotaLimited) {
        console.warn("PUBG API quota limited while fetching matches. Returning partial match list.");
        break;
      }

      if (start + chunkSize < matchIds.length) {
        await delay(PUBG_MATCH_FETCH_THROTTLE_MS);
      }
    }

    const resolvedMatches = matches
      .filter((match): match is MatchSummary => match !== null)
      .sort((a, b) => {
        const timeA = Date.parse(a.createdAt);
        const timeB = Date.parse(b.createdAt);
        const validA = Number.isFinite(timeA);
        const validB = Number.isFinite(timeB);

        if (validA && validB) return timeB - timeA;
        if (validA) return -1;
        if (validB) return 1;
        return 0;
      });

    for (let index = 0; index < resolvedMatches.length; index += 1) {
      const match = resolvedMatches[index];
      if (match.queueType !== "competitive" || match.rankPointDelta !== null) continue;

      if (typeof match.rankPointTotal === "number") {
        const previousCompetitive = resolvedMatches.slice(index + 1).find((candidate) => {
          if (candidate.queueType !== "competitive") return false;
          if (match.seasonId && candidate.seasonId && match.seasonId !== candidate.seasonId) return false;
          return true;
        });

        if (previousCompetitive && typeof previousCompetitive.rankPointTotal === "number") {
          match.rankPointDelta = Math.round(match.rankPointTotal - previousCompetitive.rankPointTotal);
          match.rankPointDeltaSource = "total-diff";
        }
      }
    }

    return {
      matches: resolvedMatches.slice(0, safeLimit),
      quotaLimited,
      requestedLimit: safeLimit,
      fetchedRawCount: resolvedMatches.length,
    };
  } catch (error) {
    if (isPubgApiQuotaExceededError(error) || isPubgApiKeyMissingError(error)) {
      throw error;
    }
    console.error("Error fetching matches:", error);
    return {
      matches: [],
      quotaLimited: false,
      requestedLimit: Math.min(Math.max(limit, 1), 500),
      fetchedRawCount: 0,
    };
  }
}

export async function getMatches(
  accountId: string,
  initialMatchIds: string[] = [],
  limit = 20,
  queueFilter: MatchQueueFilter = "all",
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  forceRefresh = false,
  seasonId?: string | null
): Promise<MatchSummary[]> {
  const result = await getMatchesWithMeta(accountId, initialMatchIds, limit, queueFilter, shard, forceRefresh, seasonId);
  return result.matches;
}

async function buildMatchDetail(
  matchId: string,
  accountId?: string,
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  forceRefresh = false
): Promise<MatchDetailPayload | null> {
  const match = await fetchPubg<MatchResponse>(`/matches/${matchId}`, forceRefresh ? 0 : 1200, shard);
  if (!match?.data?.attributes) return null;

  const createdAt = String(match.data.attributes.createdAt ?? "");
  const rawMapName = String(match.data.attributes.mapName ?? "");
  const mapDetail = resolveMapDetail(rawMapName);
  const telemetryUrl = extractTelemetryUrl(match);
  const telemetryEvents = telemetryUrl ? await fetchTelemetryEventsJson<TelemetryEvent>(telemetryUrl) : [];
  const included = Array.isArray(match.included) ? match.included : [];
  const participants = included.filter((item) => item.type === "participant");
  const participantStatsById = new Map<string, UnknownRecord>();
  for (const participant of participants) {
    if (typeof participant.id !== "string") continue;
    const participantStats = participant.attributes?.stats;
    if (!participantStats || typeof participantStats !== "object") continue;
    participantStatsById.set(participant.id, participantStats as UnknownRecord);
  }

  const teammateAccountIds = new Set<string>();
  const teammateNames = new Set<string>();
  if (accountId) {
    const myParticipant = participants.find((participant) => {
      const stats = participant.attributes?.stats;
      if (!stats || typeof stats !== "object") return false;
      return (stats as UnknownRecord).playerId === accountId;
    });
    const myParticipantId = typeof myParticipant?.id === "string" ? myParticipant.id : "";
    if (myParticipantId) {
      const rosterItems = included.filter((item) => item.type === "roster");
      for (const roster of rosterItems) {
        const participantRefs = roster.relationships?.participants?.data ?? [];
        const rosterParticipantIds = participantRefs
          .map((ref) => (typeof ref.id === "string" ? ref.id : ""))
          .filter((id): id is string => id.length > 0);
        if (!rosterParticipantIds.includes(myParticipantId)) continue;

        for (const participantId of rosterParticipantIds) {
          if (participantId === myParticipantId) continue;
          const teammateStats = participantStatsById.get(participantId);
          if (!teammateStats) continue;

          const teammateAccountId =
            typeof teammateStats.playerId === "string" && teammateStats.playerId.trim().length > 0
              ? teammateStats.playerId.trim()
              : null;
          const teammateName =
            typeof teammateStats.name === "string" && teammateStats.name.trim().length > 0
              ? teammateStats.name.trim().toLowerCase()
              : null;

          if (teammateAccountId) teammateAccountIds.add(teammateAccountId);
          if (teammateName) teammateNames.add(teammateName);
        }
        break;
      }
    }
  }

  const killLogs = normalizeKillLogs(matchId, mapDetail.sizeKm, telemetryEvents, accountId, createdAt);
  const routePoints = normalizeRoutePoints(
    matchId,
    mapDetail.sizeKm,
    telemetryEvents,
    accountId,
    teammateAccountIds,
    teammateNames,
    createdAt
  );
  const blueZoneStates = normalizeBlueZoneStates(matchId, mapDetail.sizeKm, telemetryEvents, createdAt);
  const playerDeath = accountId ? killLogs.find((log) => log.isPlayerDeath) ?? null : null;

  return {
    matchId,
    map: mapDetail,
    modeLabel: formatModeLabel(String(match.data.attributes.gameMode ?? "unknown")),
    createdAt,
    durationSec:
      typeof match.data.attributes.duration === "number" && Number.isFinite(match.data.attributes.duration)
        ? Math.round(match.data.attributes.duration)
        : null,
    totalKillEvents: killLogs.length,
    playerName: accountId ? getPlayerNameFromMatch(match, accountId) : null,
    playerDeath,
    killLogs,
    routePoints,
    blueZoneStates,
    sourceTelemetryUrl: telemetryUrl,
  };
}

export async function getMatchDetail(
  matchId: string,
  accountId?: string,
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  forceRefresh = false
): Promise<MatchDetailPayload | null> {
  const safeMatchId = matchId.trim();
  if (!safeMatchId) return null;
  const safeAccountId = accountId?.trim() ?? "";
  const cacheKey = `${shard}:${safeMatchId}:${safeAccountId}`;

  if (!forceRefresh) {
    const cached = matchDetailCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  if (!forceRefresh) {
    const pending = matchDetailPending.get(cacheKey);
    if (pending) {
      return pending;
    }
  }

  const nextPromise = buildMatchDetail(safeMatchId, safeAccountId || undefined, shard, forceRefresh)
    .then((result) => {
      if (result) {
        matchDetailCache.set(cacheKey, {
          expiresAt: Date.now() + MATCH_DETAIL_CACHE_TTL_MS,
          value: result,
        });
      }
      return result;
    })
    .finally(() => {
      matchDetailPending.delete(cacheKey);
    });

  if (!forceRefresh) {
    matchDetailPending.set(cacheKey, nextPromise);
  }
  return nextPromise;
}

function buildActorBotKillKeys(actor: MatchKillActor | null): string[] {
  if (!actor) return [];
  const keys: string[] = [];
  if (actor.accountId && actor.accountId.trim().length > 0) {
    keys.push(`id:${actor.accountId.trim()}`);
  }
  if (actor.name && actor.name.trim().length > 0) {
    keys.push(`name:${actor.name.trim().toLowerCase()}`);
  }
  return keys;
}

export function summarizeMatchBotKills(detail: MatchDetailPayload, accountId: string): MatchBotKillSummary {
  const safeAccountId = accountId.trim();
  if (!safeAccountId) {
    return {
      matchId: detail.matchId,
      totalKills: 0,
      botKills: 0,
      playerKills: 0,
      unknownKills: 0,
      playerBotKills: {},
    };
  }

  const myName = detail.playerName?.trim().toLowerCase() ?? "";
  const myKillLogs = detail.killLogs.filter((log) =>
    isSameActor(log.killer, safeAccountId, myName || undefined)
  );

  const playerBotKills = new Map<string, number>();
  for (const log of detail.killLogs) {
    if (log.victim?.actorType !== "bot") continue;
    if (!log.killer || log.killer.actorType !== "player") continue;
    const keys = buildActorBotKillKeys(log.killer);
    if (keys.length === 0) continue;
    for (const key of keys) {
      playerBotKills.set(key, (playerBotKills.get(key) ?? 0) + 1);
    }
  }

  const botKills = myKillLogs.filter((log) => log.victim?.actorType === "bot").length;
  const playerKills = myKillLogs.filter((log) => log.victim?.actorType === "player").length;
  const unknownKills = Math.max(0, myKillLogs.length - botKills - playerKills);

  return {
    matchId: detail.matchId,
    totalKills: myKillLogs.length,
    botKills,
    playerKills,
    unknownKills,
    playerBotKills: Object.fromEntries(playerBotKills),
  };
}

export async function getRankedStats(
  accountId: string,
  shard: PubgPlatformShard = DEFAULT_PLATFORM_SHARD,
  forceRefresh = false,
  seasonId?: string | null
): Promise<RankedStats | null> {
  try {
    const resolvedSeasonId = seasonId?.trim() || (await getCurrentSeasonId(shard, forceRefresh));
    if (!resolvedSeasonId) return null;
    const ttl = forceRefresh ? 0 : shard === "kakao" ? 45 : 300;

    const rankedRes = await fetchPubg<RankedStatsResponse>(
      `/players/${accountId}/seasons/${resolvedSeasonId}/ranked`,
      ttl,
      shard
    );
    if (!rankedRes?.data?.attributes?.rankedGameModeStats) return null;

    const selectedMode = pickPrimaryMode(rankedRes.data.attributes.rankedGameModeStats);
    if (!selectedMode) return null;

    const { mode, stats } = selectedMode;
    const matches = safeNumber(stats.roundsPlayed);
    if (matches === 0) return null;

    const kills = safeNumber(stats.kills);
    const assists = safeNumber(stats.assists);
    const deaths = safeNumber(stats.deaths);
    const wins = safeNumber(stats.wins);
    const damage = safeNumber(stats.damageDealt);
    const rp = Math.round(safeNumber(stats.currentRankPoint));
    const bestRp = Math.round(safeNumber(stats.bestRankPoint));

    return {
      rp,
      bestRp,
      tier: getTierFromRp(rp),
      matches,
      wins,
      kda: ((kills + assists) / Math.max(1, deaths)).toFixed(2),
      avgDmg: Math.round(damage / Math.max(1, matches)),
      winRate: toPercent(wins, matches),
      mode,
      modeLabel: formatModeLabel(mode),
    };
  } catch (error) {
    console.error("Error fetching ranked stats:", error);
    return null;
  }
}



