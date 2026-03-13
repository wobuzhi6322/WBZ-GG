import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import ProfileHeader from "@/components/features/ProfileHeader";
import AllInOneProfileDashboard, {
  type ProfileDashboardCardData,
} from "@/components/features/AllInOneProfileDashboard";
import ProfileInsightCard from "@/components/features/ProfileInsightCard";
import { IntegratedTeammatesPanel } from "@/components/features/IntegratedTeammatesPanel";
import HitboxAnalysisCard from "@/components/features/HitboxAnalysisCard";
import ActivityHeatmap from "@/components/features/ActivityHeatmap";
import StatRadar from "@/components/features/StatRadar";
import RankTrendWidget from "@/components/features/RankTrendWidget";
import ProfileMainTabs from "@/components/features/ProfileMainTabs";
import WeaponStatsTable from "@/components/features/WeaponStatsTable";
import MatchHistory from "@/components/features/MatchHistory";
import EncounterTrackerPanel from "@/components/features/EncounterTrackerPanel";
import ProfileSeasonSelector from "@/components/features/ProfileSeasonSelector";
import {
  getMatches,
  getPlayer,
  getPlayerById,
  getPlayerWeaponMasteryProfile,
  getPlayerStats,
  getRankedStats,
  getSeasonOptions,
  isPubgApiKeyMissingError,
  isPubgApiQuotaExceededError,
  sanitizePlatformShard,
} from "@/lib/pubg";
import type {
  CurrentSeasonInfo,
  MatchQueueFilter,
  MatchSummary,
  ModeStatsSummary,
  PlayerData,
  PubgPlatformShard,
  PubgStats,
  RankedStats,
  RankedModeStatsSummary,
  SeasonOption,
  WeaponMasteryProfile,
} from "@/lib/pubg";
import { getSteamProfile } from "@/lib/steam";
import { translations, type LanguageType } from "@/data/locales";
import {
  isValidPlayerSearchInput,
  safeDecodeURIComponent,
  sanitizeAccountId,
  sanitizePlayerSearchInput,
  sanitizeSeasonId,
} from "@/lib/requestValidation";
import {
  getPubgPlayerCache,
  upsertPubgPlayerCacheWithResult,
} from "@/features/player-search/api/cacheService";
import type { PastSeasonBadgeItem } from "@/components/features/PastSeasonBadges";

export interface ProfileTitleBadgeData {
  key: "warlord" | "camper" | "balanced" | "peaceful";
  emoji: string;
}

export interface SoulmateData {
  key: string;
  name: string;
  accountId: string | null;
  sharedMatches: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface RecentTeammate {
  name: string;
  count: number;
}

interface HitboxAnalysisData {
  headRatio: number;
  upperBodyRatio: number;
  armRatio: number;
  legRatio: number;
  estimatedHeadHits: number;
  estimatedBodyHits: number;
  sampleKills: number;
  mainWeapon: string | null;
  topWeaponKills: number;
  trackedWeaponKills: number;
  profile: "precision" | "balanced" | "body";
}

interface ProfilePageProps {
  params: { username: string };
  searchParams?: {
    queue?: string | string[];
    platform?: string | string[];
    refresh?: string | string[];
    season?: string | string[];
    id?: string | string[];
    accountId?: string | string[];
  };
}

function parseQueueFilter(raw: string | string[] | undefined): MatchQueueFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "normal") return "normal";
  if (value === "competitive") return "competitive";
  return "all";
}

function parseSeasonFilter(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return sanitizeSeasonId(value);
}

function parseAccountId(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  return sanitizeAccountId(value);
}

function resolveModeLabel(
  queue: MatchQueueFilter,
  queueLabels: { all: string; normal: string; competitive: string }
): string {
  if (queue === "competitive") return queueLabels.competitive;
  if (queue === "normal") return queueLabels.normal;
  return queueLabels.all;
}

function buildOverviewFromMatches(
  matches: MatchSummary[],
  queue: MatchQueueFilter,
  queueLabels: { all: string; normal: string; competitive: string }
): PubgStats["overview"] | null {
  if (!matches.length) return null;
  const scopedMatches =
    queue === "all" ? matches : matches.filter((match) => match.queueType === queue);
  if (!scopedMatches.length) return null;

  const matchesPlayed = scopedMatches.length;
  const wins = scopedMatches.filter((match) => match.status === "win").length;
  const top10s = scopedMatches.filter((match) => match.placement > 0 && match.placement <= 10).length;
  const kills = scopedMatches.reduce((sum, match) => sum + match.kills, 0);
  const assists = scopedMatches.reduce((sum, match) => sum + match.assists, 0);
  const damageDealt = scopedMatches.reduce((sum, match) => sum + match.damage, 0);
  const timeSurvived = scopedMatches.reduce((sum, match) => sum + match.timeSurvivedSeconds, 0);

  return {
    mode: queue,
    modeLabel: resolveModeLabel(queue, queueLabels),
    matchesPlayed,
    wins,
    top10s,
    kills,
    damageDealt,
    assists,
    dbnos: 0,
    timeSurvived,
    kda: ((kills + assists) / Math.max(1, matchesPlayed)).toFixed(2),
    avgDamage: Math.round(damageDealt / Math.max(1, matchesPlayed)),
    winRate: ((wins / Math.max(1, matchesPlayed)) * 100).toFixed(1),
  };
}

function buildRadarFromMatches(
  matches: MatchSummary[],
  queue: MatchQueueFilter,
  radarSubjects: { survival: string; combat: string; support: string; precision: string; stability: string }
): Array<{ subject: string; A: number; fullMark: number }> {
  const scopedMatches =
    queue === "all" ? matches : matches.filter((match) => match.queueType === queue);
  if (scopedMatches.length === 0) {
    return [
      { subject: radarSubjects.survival, A: 0, fullMark: 150 },
      { subject: radarSubjects.combat, A: 0, fullMark: 150 },
      { subject: radarSubjects.support, A: 0, fullMark: 150 },
      { subject: radarSubjects.precision, A: 0, fullMark: 150 },
      { subject: radarSubjects.stability, A: 0, fullMark: 150 },
    ];
  }

  const total = scopedMatches.length;
  const totalKills = scopedMatches.reduce((sum, match) => sum + match.kills, 0);
  const totalAssists = scopedMatches.reduce((sum, match) => sum + match.assists, 0);
  const totalDamage = scopedMatches.reduce((sum, match) => sum + match.damage, 0);
  const totalHeadshots = scopedMatches.reduce((sum, match) => sum + match.headshots, 0);
  const totalTop10 = scopedMatches.filter((match) => match.placement > 0 && match.placement <= 10).length;
  const totalSurvival = scopedMatches.reduce((sum, match) => sum + (match.timeSurvivedSeconds ?? 0), 0);

  const avgKills = totalKills / Math.max(1, total);
  const avgAssists = totalAssists / Math.max(1, total);
  const avgDamage = totalDamage / Math.max(1, total);
  const avgHeadshotRate = totalKills > 0 ? totalHeadshots / totalKills : 0;
  const top10Rate = totalTop10 / Math.max(1, total);
  const avgSurvival = totalSurvival / Math.max(1, total);

  const score = (value: number, max: number) => Math.min(150, Math.max(0, Math.round((value / max) * 150)));

  return [
    { subject: radarSubjects.survival, A: score(top10Rate, 0.7), fullMark: 150 },
    { subject: radarSubjects.combat, A: score(avgKills, 5), fullMark: 150 },
    { subject: radarSubjects.support, A: score(avgAssists, 3), fullMark: 150 },
    { subject: radarSubjects.precision, A: score(avgHeadshotRate, 0.4), fullMark: 150 },
    { subject: radarSubjects.stability, A: score((avgDamage / 400 + avgSurvival / 1200) / 2, 1), fullMark: 150 },
  ];
}

function buildProfileTitleBadge(
  overview: PubgStats["overview"] | null,
  matches: MatchSummary[]
): ProfileTitleBadgeData {
  const matchesPlayed = overview?.matchesPlayed ?? matches.length;
  const kda = overview ? Number.parseFloat(overview.kda) : 0;
  const avgDamage = overview?.avgDamage ?? 0;
  const winRate = overview ? Number.parseFloat(overview.winRate) : 0;
  const top10Rate =
    matchesPlayed > 0 ? (((overview?.top10s ?? 0) / Math.max(1, matchesPlayed)) * 100) : 0;
  const avgSurvivalSec =
    matches.length > 0
      ? matches.reduce((sum, match) => sum + match.timeSurvivedSeconds, 0) / matches.length
      : 0;

  if (kda >= 3 && avgDamage >= 350) {
    return { key: "warlord", emoji: "🔥" };
  }

  if (winRate < 10 && top10Rate >= 40 && avgSurvivalSec >= 18 * 60) {
    return { key: "camper", emoji: "⛺" };
  }

  if (kda <= 1) {
    return { key: "peaceful", emoji: "🌱" };
  }

  return { key: "balanced", emoji: "⚖️" };
}

function buildIntegratedTeammates(matches: MatchSummary[], playerName: string): {
  name: string;
  accountId: string | null;
  sharedMatches: number;
  wins: number;
  kills: number;
  winRate: number;
  kd: number;
}[] {
  const teammateMap = new Map<string, any>();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffTime = thirtyDaysAgo.getTime();

  for (const match of matches) {
    const matchTime = new Date(match.createdAt).getTime();
    if (matchTime < cutoffTime) continue;

    const isWin = match.status === "win";
    for (const teammate of match.teammates) {
      const name = teammate.name?.trim();
      if (!name || name.toLowerCase() === playerName.toLowerCase()) continue;
      
      const key = name.toLowerCase();
      const current = teammateMap.get(key);
      if (current) {
        current.sharedMatches += 1;
        if (isWin) current.wins += 1;
        current.kills += teammate.kills || 0;
        current.winRate = (current.wins / current.sharedMatches) * 100;
        const deaths = Math.max(1, current.sharedMatches - current.wins);
        current.kd = current.kills / deaths;
        continue;
      }
      
      const deaths = Math.max(1, 1 - (isWin ? 1 : 0));
      teammateMap.set(key, {
        name,
        accountId: teammate.accountId ?? null,
        sharedMatches: 1,
        wins: isWin ? 1 : 0,
        kills: teammate.kills || 0,
        winRate: isWin ? 100 : 0,
        kd: (teammate.kills || 0) / deaths,
      });
    }
  }

  return Array.from(teammateMap.values())
    .sort((a, b) => b.sharedMatches - a.sharedMatches || b.winRate - a.winRate);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildHitboxAnalysis(
  overview: PubgStats["overview"] | null,
  matches: MatchSummary[],
  weaponProfile: WeaponMasteryProfile | null
): HitboxAnalysisData {
  const recentKills = matches.reduce((sum, match) => sum + match.kills, 0);
  const recentHeadshots = matches.reduce((sum, match) => sum + match.headshots, 0);
  const overviewKills = overview?.kills ?? 0;
  const trackedWeaponKills = weaponProfile?.totalKills ?? 0;
  const topWeaponKills = weaponProfile?.topWeaponKills ?? 0;
  const avgDamage = overview?.avgDamage ?? 0;

  const headshotRate = recentKills > 0 ? recentHeadshots / recentKills : 0;
  const damageInfluence = clampNumber(avgDamage / 450, 0, 1);
  const weaponFocus = trackedWeaponKills > 0 ? topWeaponKills / trackedWeaponKills : 0.35;
  const rawHeadRatio = headshotRate * 100 * 0.78 + damageInfluence * 10 + weaponFocus * 7;
  const headRatio = Math.round(clampNumber(rawHeadRatio, 8, 44));
  const bodyRatio = 100 - headRatio;

  const upperBodyRatio = Math.round(bodyRatio * 0.43);
  const armRatio = Math.round(bodyRatio * 0.26);
  const legRatio = bodyRatio - upperBodyRatio - armRatio;

  const sampleKills = Math.max(overviewKills, recentKills, trackedWeaponKills, 1);
  const estimatedHeadHits = Math.max(1, Math.round(sampleKills * (headRatio / 100)));
  const estimatedBodyHits = Math.max(1, sampleKills - estimatedHeadHits);

  let profile: HitboxAnalysisData["profile"] = "balanced";
  if (headRatio >= 28) {
    profile = "precision";
  } else if (headRatio <= 14) {
    profile = "body";
  }

  return {
    headRatio,
    upperBodyRatio,
    armRatio,
    legRatio,
    estimatedHeadHits,
    estimatedBodyHits,
    sampleKills,
    mainWeapon: weaponProfile?.mainWeapon ?? null,
    topWeaponKills,
    trackedWeaponKills,
    profile,
  };
}

function buildMockPastSeasonBadges(
  currentSeason: CurrentSeasonInfo | null,
  rankedStats: RankedStats | null,
  platform: PubgPlatformShard
): PastSeasonBadgeItem[] {
  const currentSeasonNumber = currentSeason?.seasonNumber ?? 30;
  const baseRp = rankedStats?.rp ?? rankedStats?.bestRp ?? 3400;

  const mockValues = [
    { seasonNumber: currentSeasonNumber - 1, rp: Math.max(1400, baseRp) },
    { seasonNumber: currentSeasonNumber - 2, rp: Math.max(1200, baseRp - 260) },
    { seasonNumber: currentSeasonNumber - 3, rp: Math.max(1000, baseRp - 520) },
    { seasonNumber: currentSeasonNumber - 4, rp: Math.max(1000, baseRp - 760) },
  ].filter((item) => item.seasonNumber > 0);

  return mockValues.map((item, index) => ({
    season: `Season ${item.seasonNumber}`,
    rp: item.rp,
    server: platform,
    rank: index === 0 ? rankedStats?.modeStats?.squad?.rank ?? rankedStats?.modeStats?.["squad-fpp"]?.rank ?? null : null,
    tier: null,
  }));
}

function aggregateModeFamilyStats(
  modeStats: Record<string, ModeStatsSummary> | undefined,
  family: "solo" | "duo" | "squad",
  label: string
): ProfileDashboardCardData {
  const entries = [modeStats?.[family], modeStats?.[`${family}-fpp`]].filter(
    (entry): entry is ModeStatsSummary => Boolean(entry)
  );

  if (entries.length === 0) {
    return {
      key: `normal-${family}`,
      label,
      matches: 0,
      wins: 0,
      top10Rate: "0.0",
      winRate: "0.0",
      kda: "0.00",
      avgDamage: 0,
      headshotRate: "0.0",
    };
  }

  const matches = entries.reduce((sum, entry) => sum + entry.matches, 0);
  const wins = entries.reduce((sum, entry) => sum + entry.wins, 0);
  const top10s = entries.reduce((sum, entry) => sum + entry.top10s, 0);
  const kills = entries.reduce((sum, entry) => sum + entry.kills, 0);
  const assists = entries.reduce((sum, entry) => sum + entry.assists, 0);
  const avgDamage = Math.round(
    entries.reduce((sum, entry) => sum + entry.avgDamage * entry.matches, 0) / Math.max(1, matches)
  );
  const headshots = entries.reduce((sum, entry) => sum + entry.headshots, 0);
  const deaths = Math.max(1, matches - wins);

  return {
    key: `normal-${family}`,
    label,
    matches,
    wins,
    top10Rate: ((top10s / Math.max(1, matches)) * 100).toFixed(1),
    winRate: ((wins / Math.max(1, matches)) * 100).toFixed(1),
    kda: ((kills + assists) / deaths).toFixed(2),
    avgDamage,
    headshotRate: ((headshots / Math.max(1, kills)) * 100).toFixed(1),
  };
}

function aggregateRankedFamilyStats(
  modeStats: Record<string, RankedModeStatsSummary> | undefined,
  family: "duo" | "squad",
  label: string,
  platform?: string | null
): ProfileDashboardCardData {
  const entries = [modeStats?.[family], modeStats?.[`${family}-fpp`]].filter(
    (entry): entry is RankedModeStatsSummary => Boolean(entry)
  );

  if (entries.length === 0) {
    return {
      key: `ranked-${family}`,
      label,
      matches: 0,
      wins: 0,
      top10Rate: "0.0",
      winRate: "0.0",
      kda: "0.00",
      avgDamage: 0,
      rp: 0,
      tierName: null,
      tierImageUrl: null,
    };
  }

  const matches = entries.reduce((sum, entry) => sum + entry.matches, 0);
  const wins = entries.reduce((sum, entry) => sum + entry.wins, 0);
  const top10s = entries.reduce((sum, entry) => sum + entry.top10s, 0);
  const kills = entries.reduce((sum, entry) => sum + entry.kills, 0);
  const assists = entries.reduce((sum, entry) => sum + entry.assists, 0);
  const avgDamage = Math.round(
    entries.reduce((sum, entry) => sum + entry.avgDamage * entry.matches, 0) / Math.max(1, matches)
  );
  const bestEntry = [...entries].sort((left, right) => right.rp - left.rp || right.bestRp - left.bestRp)[0];
  const deaths = Math.max(1, matches - wins);

  return {
    key: `ranked-${family}`,
    label,
    matches,
    wins,
    top10Rate: ((top10s / Math.max(1, matches)) * 100).toFixed(1),
    winRate: ((wins / Math.max(1, matches)) * 100).toFixed(1),
    kda: ((kills + assists) / deaths).toFixed(2),
    avgDamage,
    rp: bestEntry?.rp ?? 0,
    tierName: bestEntry?.tier.name ?? null,
    tierImageUrl: bestEntry?.tier.imageUrl ?? null,
    platformRegion: platform === "kakao" ? "KAKAO" : "AS",
    leaderboardRank: bestEntry?.rank ?? null,
  };
}

function buildRecentRankTrendPoints(matches: MatchSummary[]): number[] {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  return matches
    .filter((match) => {
      if (match.queueType !== "competitive") return false;
      if (match.rankPointTotal === null) return false;
      const createdAtMs = Date.parse(match.createdAt);
      return Number.isFinite(createdAtMs) && createdAtMs >= thirtyDaysAgo;
    })
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
    .map((match) => match.rankPointTotal ?? 0)
    .filter((value) => Number.isFinite(value));
}

function resolveServerLanguage(value: string | undefined): LanguageType {
  if (value === "en" || value === "ja" || value === "zh") return value;
  return "ko";
}

const PLAYER_CACHE_TTL_MS = 20 * 60 * 1000;

function isPlayerCacheFresh(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) return false;
  return Date.now() - updatedAtMs <= PLAYER_CACHE_TTL_MS;
}

function hasBrokenMatchLabels(matches: MatchSummary[]): boolean {
  return matches.some((match) => {
    const values = [match.map, match.mode, match.queueLabel];
    const containsBrokenChar = values.some(
      (value) => typeof value === "string" && (value.includes("?") || value.includes("�"))
    );

    if (containsBrokenChar) return true;

    const looksLikeRawMap = /_Main$/i.test(match.map) || /(?:Baltic|Erangel|Desert|Savage|Tiger|Kiki|Neon)/i.test(match.map);
    const looksLikeRawMode = /^(solo|duo|squad)(-fpp)?$/i.test(match.mode) || /esports-squad-fpp/i.test(match.mode);
    const looksLikeRawQueue = /^(normal|competitive|official|ranked)$/i.test(match.queueLabel);

    return looksLikeRawMap || looksLikeRawMode || looksLikeRawQueue;
  });
}

function toCachedMatches(payload: unknown): MatchSummary[] {
  return Array.isArray(payload) ? (payload as MatchSummary[]) : [];
}

interface CachedProfileSnapshot {
  version: 1;
  platform: PubgPlatformShard;
  player: PlayerData;
  matches: MatchSummary[];
  mainWeapon: string | null;
  weaponMasteryProfile: WeaponMasteryProfile | null;
  playerStats: PubgStats | null;
  rankedStats: RankedStats | null;
  seasonOptions: SeasonOption[];
  currentSeason: CurrentSeasonInfo | null;
  seasonId: string | null;
  steamProfile: Awaited<ReturnType<typeof getSteamProfile>>;
  fetchedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRefreshFlag(raw: string | string[] | undefined): boolean {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function toCachedProfileSnapshot(
  payload: unknown,
  platform: PubgPlatformShard
): CachedProfileSnapshot | null {
  if (!isRecord(payload)) return null;
  if (payload.version !== 1 || payload.platform !== platform) return null;

  const rawPlayer = payload.player;
  if (!isRecord(rawPlayer)) return null;

  const playerId = typeof rawPlayer.id === "string" ? rawPlayer.id.trim() : "";
  const playerName = typeof rawPlayer.name === "string" ? rawPlayer.name.trim() : "";
  if (!playerId || !playerName) return null;

  const shardId =
    typeof rawPlayer.shardId === "string" && rawPlayer.shardId.trim().length > 0
      ? rawPlayer.shardId.trim()
      : platform;

  const matchIds = Array.isArray(rawPlayer.matchIds)
    ? rawPlayer.matchIds.filter((matchId): matchId is string => typeof matchId === "string" && matchId.trim().length > 0)
    : [];

  const seasonId =
    typeof payload.seasonId === "string" && payload.seasonId.trim().length > 0
      ? payload.seasonId.trim()
      : null;

  return {
    version: 1,
    platform,
    player: {
      id: playerId,
      name: playerName,
      shardId,
      matchIds,
    },
    matches: toCachedMatches(payload.matches),
    mainWeapon: typeof payload.mainWeapon === "string" && payload.mainWeapon.trim().length > 0 ? payload.mainWeapon.trim() : null,
    weaponMasteryProfile: isRecord(payload.weaponMasteryProfile)
      ? (payload.weaponMasteryProfile as unknown as WeaponMasteryProfile)
      : null,
    playerStats: isRecord(payload.playerStats) ? (payload.playerStats as unknown as PubgStats) : null,
    rankedStats: isRecord(payload.rankedStats) ? (payload.rankedStats as unknown as RankedStats) : null,
    seasonOptions: Array.isArray(payload.seasonOptions) ? (payload.seasonOptions as SeasonOption[]) : [],
    currentSeason: isRecord(payload.currentSeason)
      ? (payload.currentSeason as unknown as CurrentSeasonInfo)
      : null,
    seasonId,
    steamProfile: isRecord(payload.steamProfile)
      ? (payload.steamProfile as unknown as Awaited<ReturnType<typeof getSteamProfile>>)
      : null,
    fetchedAt: typeof payload.fetchedAt === "string" ? payload.fetchedAt : "",
  };
}

function buildCachedProfileSnapshot(params: {
  platform: PubgPlatformShard;
  player: PlayerData;
  matches: MatchSummary[];
  mainWeapon: string | null;
  weaponMasteryProfile: WeaponMasteryProfile | null;
  playerStats: PubgStats | null;
  rankedStats: RankedStats | null;
  seasonOptions: SeasonOption[];
  currentSeason: CurrentSeasonInfo | null;
  seasonId: string | null;
  steamProfile: Awaited<ReturnType<typeof getSteamProfile>>;
}): CachedProfileSnapshot {
  return {
    version: 1,
    platform: params.platform,
    player: params.player,
    matches: params.matches,
    mainWeapon: params.mainWeapon,
    weaponMasteryProfile: params.weaponMasteryProfile,
    playerStats: params.playerStats,
    rankedStats: params.rankedStats,
    seasonOptions: params.seasonOptions,
    currentSeason: params.currentSeason,
    seasonId: params.seasonId,
    steamProfile: params.steamProfile,
    fetchedAt: new Date().toISOString(),
  };
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const language = resolveServerLanguage(cookies().get("wbz-language")?.value);
  const localeText = translations[language] ?? translations.ko;
  const labels = localeText.profilePage;
  const decodedUsernameRaw = safeDecodeURIComponent(params.username);
  const decodedUsername = sanitizePlayerSearchInput(decodedUsernameRaw);
  if (!decodedUsername || !isValidPlayerSearchInput(decodedUsernameRaw)) {
    return notFound();
  }
  const selectedQueue = parseQueueFilter(searchParams?.queue);
  const rawPlatform = Array.isArray(searchParams?.platform) ? searchParams.platform[0] : searchParams?.platform;
  const requestedPlatform = sanitizePlatformShard(rawPlatform);
  const forceRefresh = parseRefreshFlag(searchParams?.refresh);
  const refreshToken = forceRefresh ? "true" : "";
  const requestedSeasonId = parseSeasonFilter(searchParams?.season);
  const requestedAccountId = parseAccountId(searchParams?.id ?? searchParams?.accountId);
  const platform = requestedPlatform;

  const cachedPlayerEntry = !forceRefresh ? await getPubgPlayerCache<unknown>(decodedUsername) : null;
  const cachedSnapshot = toCachedProfileSnapshot(cachedPlayerEntry?.statsData, platform);
  const cachedMatchesAll = cachedSnapshot?.matches ?? toCachedMatches(cachedPlayerEntry?.statsData);
  const cachedPlayer =
    cachedSnapshot?.player ??
    (cachedPlayerEntry
      ? {
          id: cachedPlayerEntry.accountId,
          name: cachedPlayerEntry.playerName || decodedUsername,
          shardId: platform,
          matchIds: [],
        }
      : null);
  const canUseFreshCache =
    Boolean(cachedSnapshot) &&
    isPlayerCacheFresh(cachedPlayerEntry?.updatedAt ?? null) &&
    !hasBrokenMatchLabels(cachedMatchesAll) &&
    (!requestedSeasonId || cachedSnapshot?.seasonId === requestedSeasonId);

  let quotaExceeded = false;
  let missingApiKey = false;
  let player: PlayerData | null = canUseFreshCache ? cachedPlayer : null;
  let playerStats: PubgStats | null = cachedSnapshot?.playerStats ?? null;
  let rankedStats: RankedStats | null = cachedSnapshot?.rankedStats ?? null;
  let seasonOptions: SeasonOption[] = cachedSnapshot?.seasonOptions ?? [];
  let currentSeason: CurrentSeasonInfo | null = cachedSnapshot?.currentSeason ?? null;
  let selectedSeasonId: string | null =
    requestedSeasonId ?? cachedSnapshot?.seasonId ?? cachedSnapshot?.currentSeason?.seasonId ?? null;
  let matchesAll: MatchSummary[] = cachedMatchesAll;
  let mainWeapon: string | null = cachedSnapshot?.mainWeapon ?? null;
  let weaponMasteryProfile: WeaponMasteryProfile | null = cachedSnapshot?.weaponMasteryProfile ?? null;
  let steamProfile: Awaited<ReturnType<typeof getSteamProfile>> = cachedSnapshot?.steamProfile ?? null;

  if (!canUseFreshCache) {
    try {
      player = requestedAccountId
        ? await getPlayerById(requestedAccountId, requestedPlatform, forceRefresh)
        : null;
      if (!player && !requestedAccountId) {
        player = await getPlayer(decodedUsername, requestedPlatform, forceRefresh);
      }
      if (!player && cachedPlayer) player = cachedPlayer;

      if (player) {
        const liveSeasonOptions = await getSeasonOptions(platform, forceRefresh);
        const liveCurrentSeason =
          liveSeasonOptions.find((season) => season.isCurrent) ?? liveSeasonOptions[0] ?? null;

        seasonOptions = liveSeasonOptions;
        currentSeason = liveCurrentSeason
          ? {
              seasonId: liveCurrentSeason.seasonId,
              seasonNumber: liveCurrentSeason.seasonNumber,
              label: liveCurrentSeason.label,
            }
          : null;
        selectedSeasonId = requestedSeasonId ?? currentSeason?.seasonId ?? null;

        const [liveMatches, livePlayerStats, liveRankedStats, liveWeaponMasteryProfile, liveSteamProfile] = await Promise.all([
          getMatches(player.id, player.matchIds, 50, "all", platform, forceRefresh, selectedSeasonId),
          getPlayerStats(player.id, platform, forceRefresh, selectedSeasonId),
          getRankedStats(player.id, platform, forceRefresh, selectedSeasonId),
          getPlayerWeaponMasteryProfile(player.id, platform, forceRefresh),
          platform === "steam" ? getSteamProfile(player.name) : Promise.resolve(null),
        ]);

        matchesAll = liveMatches;
        playerStats = livePlayerStats;
        rankedStats = liveRankedStats;
        weaponMasteryProfile = liveWeaponMasteryProfile;
        mainWeapon = liveWeaponMasteryProfile?.mainWeapon ?? null;
        steamProfile = liveSteamProfile;

        const upsertResult = await upsertPubgPlayerCacheWithResult({
          playerName: player.name,
          accountId: player.id,
          statsData: buildCachedProfileSnapshot({
            platform,
            player,
            matches: liveMatches,
            mainWeapon: liveWeaponMasteryProfile?.mainWeapon ?? null,
            weaponMasteryProfile: liveWeaponMasteryProfile,
            playerStats: livePlayerStats,
            rankedStats: liveRankedStats,
            seasonOptions,
            currentSeason,
            seasonId: selectedSeasonId,
            steamProfile: liveSteamProfile,
          }),
        });
        if (!upsertResult.ok) {
          console.error("DB 저장 실패:", upsertResult.error);
        }
      }
    } catch (error) {
      if (isPubgApiQuotaExceededError(error)) {
        quotaExceeded = true;
      } else if (isPubgApiKeyMissingError(error)) {
        missingApiKey = true;
      } else {
        throw error;
      }
    }
  }

  if ((quotaExceeded || missingApiKey) && cachedPlayer) {
    player = cachedPlayer;
    matchesAll = cachedMatchesAll;
    playerStats = cachedSnapshot?.playerStats ?? playerStats;
    rankedStats = cachedSnapshot?.rankedStats ?? rankedStats;
    seasonOptions = cachedSnapshot?.seasonOptions ?? seasonOptions;
    currentSeason = cachedSnapshot?.currentSeason ?? currentSeason;
    selectedSeasonId = requestedSeasonId ?? cachedSnapshot?.seasonId ?? currentSeason?.seasonId ?? selectedSeasonId;
    mainWeapon = cachedSnapshot?.mainWeapon ?? mainWeapon;
    weaponMasteryProfile = cachedSnapshot?.weaponMasteryProfile ?? weaponMasteryProfile;
    steamProfile = cachedSnapshot?.steamProfile ?? steamProfile;
    quotaExceeded = false;
    missingApiKey = false;
  }

  if (quotaExceeded) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-6 py-8 text-center">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{labels.quotaErrorTitle}</h1>
          <p className="text-sm text-amber-100 mb-5">
            {labels.quotaErrorBody}
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-wbz-gold px-4 py-2 text-sm font-black text-black hover:bg-white transition-colors"
          >
            {labels.home}
          </Link>
        </div>
      </div>
    );
  }

  if (missingApiKey) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-6 py-8 text-center">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">API Key Missing</h1>
          <p className="text-sm text-rose-100 mb-5">
            {labels.apiKeyMissingBody}
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-wbz-gold px-4 py-2 text-sm font-black text-black hover:bg-white transition-colors"
          >
            {labels.home}
          </Link>
        </div>
      </div>
    );
  }

  if (!player) {
    return notFound();
  }

  const selectedSeasonOption = seasonOptions.find((season) => season.seasonId === selectedSeasonId) ?? null;
  const selectedSeasonLabel = selectedSeasonOption?.label ?? currentSeason?.label ?? null;
  const selectedSeasonButtonLabel = selectedSeasonLabel ?? labels.seasonButton;
  const dashboardLabels = labels.dashboardGroups;

  const matches =
    selectedQueue === "all" ? matchesAll : matchesAll.filter((match) => match.queueType === selectedQueue);
  const overviewBase = playerStats?.overview ?? buildOverviewFromMatches(matches, "all", labels.queueLabels);
  const resolvedOverview = overviewBase
    ? {
        ...overviewBase,
        modeLabel: resolveModeLabel(
          overviewBase.mode === "competitive" || overviewBase.mode === "normal" ? overviewBase.mode : "all",
          labels.queueLabels
        ),
      }
    : null;
  const resolvedRadar = buildRadarFromMatches(matches, "all", labels.radarSubjects);
  const titleBadge = buildProfileTitleBadge(resolvedOverview, matches);
  const integratedTeammates = buildIntegratedTeammates(matches, player.name);
  const hitboxAnalysis = buildHitboxAnalysis(resolvedOverview, matches, weaponMasteryProfile);
  const recentRankTrendPoints = buildRecentRankTrendPoints(matches);
  const pastSeasonBadges = buildMockPastSeasonBadges(currentSeason, rankedStats, platform);
  const rankedCards: ProfileDashboardCardData[] = [
    aggregateRankedFamilyStats(rankedStats?.modeStats, "duo", dashboardLabels.ranked.duo, platform),
    aggregateRankedFamilyStats(rankedStats?.modeStats, "squad", dashboardLabels.ranked.squad, platform),
  ];
  const normalCards: ProfileDashboardCardData[] = [
    aggregateModeFamilyStats(playerStats?.modeStats, "solo", dashboardLabels.normal.solo),
    aggregateModeFamilyStats(playerStats?.modeStats, "duo", dashboardLabels.normal.duo),
    aggregateModeFamilyStats(playerStats?.modeStats, "squad", dashboardLabels.normal.squad),
  ];

  const profileHrefBase = `/profile/${encodeURIComponent(player.name)}`;
  const buildProfileHref = (queue: MatchQueueFilter = "all", seasonId: string | null = selectedSeasonId): string => {
    const query = new URLSearchParams();
    query.set("platform", platform);
    query.set("id", player.id);
    if (queue !== "all") query.set("queue", queue);
    if (seasonId) query.set("season", seasonId);
    return `${profileHrefBase}?${query.toString()}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="container mx-auto max-w-[1680px] px-4 py-8 md:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col">
          <header className="mb-6 w-full">
            <ProfileHeader
              username={player.name}
              overview={resolvedOverview}
              tierName={rankedStats?.tier.name ?? null}
              tierImageUrl={rankedStats?.tier.imageUrl ?? null}
              mainWeapon={mainWeapon}
              steamProfile={steamProfile}
              platform={platform}
              refreshToken={refreshToken}
              seasonLabel={selectedSeasonLabel}
              seasonId={selectedSeasonId}
              titleBadge={titleBadge}
              pastSeasons={pastSeasonBadges}
              seasonSelector={
                <ProfileSeasonSelector
                  seasonOptions={seasonOptions}
                  selectedSeasonId={selectedSeasonId}
                  selectedQueue={selectedQueue}
                  platform={platform}
                  playerName={player.name}
                  accountId={player.id}
                />
              }
            />
          </header>

          <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
            <aside className="flex w-full min-w-0 shrink-0 flex-col gap-4 lg:w-[320px]">
              <div className="w-full overflow-hidden rounded-3xl border border-gray-200/80 bg-white/90 p-4 text-[13px] shadow-[0_20px_70px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-white/10 dark:bg-dark-surface/95 dark:shadow-[0_24px_90px_-50px_rgba(251,191,36,0.14)]">
                <ActivityHeatmap matches={matches} compact />
              </div>
              <RankTrendWidget
                points={recentRankTrendPoints}
                currentRp={rankedStats?.rp ?? 0}
                bestRp={rankedStats?.bestRp ?? 0}
                platformRegion={platform === "kakao" ? "KAKAO" : "AS"}
                leaderboardRank={rankedStats?.modeStats?.squad?.rank ?? rankedStats?.modeStats?.["squad-fpp"]?.rank ?? null}
              />
              <div className="w-full overflow-hidden text-[13px]">
                <ProfileInsightCard overview={resolvedOverview} compact />
              </div>
              <div className="w-full overflow-hidden text-[13px]">
                <StatRadar data={resolvedRadar} compact />
              </div>
              <div className="w-full overflow-hidden text-[13px]">
                <HitboxAnalysisCard analysis={hitboxAnalysis} compact />
              </div>
              <div className="w-full overflow-hidden text-[13px]">
                <IntegratedTeammatesPanel teammates={integratedTeammates} compact />
              </div>
            </aside>

            <section className="flex w-full min-w-0 flex-1 flex-col gap-6">
              <AllInOneProfileDashboard rankedCards={rankedCards} normalCards={normalCards} />

              <ProfileMainTabs
                matchHistoryNode={
                  <>
                    <div className="relative z-10 mb-4 rounded-3xl border border-gray-200/80 bg-white/90 p-6 shadow-[0_20px_70px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-white/10 dark:bg-dark-surface/95 dark:shadow-[0_24px_90px_-50px_rgba(251,191,36,0.14)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-wbz-mute">{labels.queueType}</div>
                        <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1 dark:border-white/15 dark:bg-white/5">
                          <Link
                            href={buildProfileHref("all")}
                            className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap ${
                              selectedQueue === "all"
                                ? "bg-wbz-gold text-black"
                                : "text-wbz-mute hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            {labels.all}
                          </Link>
                          <Link
                            href={buildProfileHref("normal")}
                            className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap ${
                              selectedQueue === "normal"
                                ? "bg-wbz-gold text-black"
                                : "text-wbz-mute hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            {labels.normal}
                          </Link>
                          <Link
                            href={buildProfileHref("competitive")}
                            className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap ${
                              selectedQueue === "competitive"
                                ? "bg-wbz-gold text-black"
                                : "text-wbz-mute hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            {labels.competitive}
                          </Link>
                        </div>
                      </div>
                    </div>

                    <MatchHistory
                      matches={matches}
                      accountId={player.id}
                      playerName={player.name}
                      platform={platform}
                      refreshToken={refreshToken}
                    />
                  </>
                }
                weaponStatsNode={<WeaponStatsTable weapons={weaponMasteryProfile?.weapons || []} />}
                encountersNode={
                  <EncounterTrackerPanel
                    matches={matches}
                    accountId={player.id}
                    playerName={player.name}
                    platform={platform}
                    refreshToken={refreshToken}
                  />
                }
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
