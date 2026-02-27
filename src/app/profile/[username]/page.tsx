import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import ProfileHeader from "@/components/features/ProfileHeader";
import StatRadar from "@/components/features/StatRadar";
import MatchHistory from "@/components/features/MatchHistory";
import RecentTeammatesPanel from "@/components/features/RecentTeammatesPanel";
import RankedStatsTable from "@/components/features/RankedStatsTable";
import TierProgressGraph from "@/components/features/TierProgressGraph";
import AITacticalCoach from "@/components/features/AITacticalCoach";
import {
  getCurrentSeasonInfo,
  getMatches,
  getPlayer,
  getPlayerById,
  getPlayerStats,
  getRankedStats,
  getSeasonOptions,
  isPubgApiKeyMissingError,
  isPubgApiQuotaExceededError,
  sanitizePlatformShard,
} from "@/lib/pubg";
import type { MatchQueueFilter, MatchSummary, PubgStats } from "@/lib/pubg";
import { getSteamProfile } from "@/lib/steam";
import type { LanguageType } from "@/data/locales";
import {
  isValidPlayerSearchInput,
  safeDecodeURIComponent,
  sanitizeAccountId,
  sanitizePlayerSearchInput,
  sanitizeSeasonId,
} from "@/lib/requestValidation";

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

function resolveModeLabel(queue: MatchQueueFilter): string {
  if (queue === "competitive") return "경쟁전";
  if (queue === "normal") return "일반전";
  return "전체";
}

function buildOverviewFromMatches(matches: MatchSummary[], queue: MatchQueueFilter): PubgStats["overview"] | null {
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
    modeLabel: resolveModeLabel(queue),
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
  queue: MatchQueueFilter
): Array<{ subject: string; A: number; fullMark: number }> {
  const scopedMatches =
    queue === "all" ? matches : matches.filter((match) => match.queueType === queue);
  if (scopedMatches.length === 0) {
    return [
      { subject: "생존력", A: 0, fullMark: 150 },
      { subject: "교전력", A: 0, fullMark: 150 },
      { subject: "지원력", A: 0, fullMark: 150 },
      { subject: "정밀도", A: 0, fullMark: 150 },
      { subject: "안정성", A: 0, fullMark: 150 },
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
    { subject: "생존력", A: score(top10Rate, 0.7), fullMark: 150 },
    { subject: "교전력", A: score(avgKills, 5), fullMark: 150 },
    { subject: "지원력", A: score(avgAssists, 3), fullMark: 150 },
    { subject: "정밀도", A: score(avgHeadshotRate, 0.4), fullMark: 150 },
    { subject: "안정성", A: score((avgDamage / 400 + avgSurvival / 1200) / 2, 1), fullMark: 150 },
  ];
}

function resolveServerLanguage(value: string | undefined): LanguageType {
  if (value === "en" || value === "ja" || value === "zh") return value;
  return "ko";
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const language = resolveServerLanguage(cookies().get("wbz-language")?.value);
  const labels =
    language === "en" || language === "ja" || language === "zh"
      ? {
          quotaErrorTitle: "API Quota Error",
          quotaErrorBody: "PUBG API request quota exceeded. Please try again later.",
          apiKeyMissingBody: "PUBG_API_KEY is not configured in server environment variables.",
          home: "Back to Home",
          seasonSelect: "Ranked Season",
          seasonLoadFail: "Failed to load season data.",
          archived: "Past Seasons",
          selectedSeason: "Selected Season",
          seasonButton: "Select Ranked Season",
          queueType: "Match Queue",
          all: "All",
          normal: "Normal",
          competitive: "Ranked",
        }
      : {
          quotaErrorTitle: "API할당량 오류",
          quotaErrorBody: "PUBG API 호출 한도를 초과했습니다. 잠시 후 다시 검색해 주세요.",
          apiKeyMissingBody: "서버 환경변수에 PUBG_API_KEY가 설정되지 않았습니다.",
          home: "홈으로 돌아가기",
          seasonSelect: "경쟁전 시즌 선택",
          seasonLoadFail: "시즌 데이터를 불러오지 못했습니다.",
          archived: "과거 시즌",
          selectedSeason: "선택 시즌",
          seasonButton: "경쟁전 시즌 선택",
          queueType: "전적 유형",
          all: "전체",
          normal: "일반전",
          competitive: "경쟁전",
        };
  const decodedUsernameRaw = safeDecodeURIComponent(params.username);
  const decodedUsername = sanitizePlayerSearchInput(decodedUsernameRaw);
  if (!decodedUsername || !isValidPlayerSearchInput(decodedUsernameRaw)) {
    return notFound();
  }
  const selectedQueue = parseQueueFilter(searchParams?.queue);
  const rawPlatform = Array.isArray(searchParams?.platform) ? searchParams.platform[0] : searchParams?.platform;
  const requestedPlatform = sanitizePlatformShard(rawPlatform);
  const rawRefresh = Array.isArray(searchParams?.refresh) ? searchParams.refresh[0] : searchParams?.refresh;
  const refreshToken = typeof rawRefresh === "string" && rawRefresh.trim().length > 0 ? rawRefresh.trim() : "";
  const forceRefresh = refreshToken.length > 0;
  const requestedSeasonId = parseSeasonFilter(searchParams?.season);
  const requestedAccountId = parseAccountId(searchParams?.id ?? searchParams?.accountId);
  const platform = requestedPlatform;
  let quotaExceeded = false;
  let missingApiKey = false;
  let player = null as Awaited<ReturnType<typeof getPlayer>>;
  try {
    player = requestedAccountId
      ? await getPlayerById(requestedAccountId, requestedPlatform, forceRefresh)
      : null;
    if (!player && !requestedAccountId) {
      player = await getPlayer(decodedUsername, requestedPlatform, forceRefresh);
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

  const [seasonOptions, currentSeason] = await Promise.all([
    getSeasonOptions(platform, 64, forceRefresh),
    getCurrentSeasonInfo(platform, forceRefresh),
  ]);

  const availableSeasonIds = new Set(seasonOptions.map((season) => season.seasonId));
  const currentSeasonInList = seasonOptions.find((season) => season.isCurrent) ?? null;
  const selectedSeasonId =
    requestedSeasonId && availableSeasonIds.has(requestedSeasonId)
      ? requestedSeasonId
      : (currentSeasonInList?.seasonId ?? seasonOptions[0]?.seasonId ?? null);

  const selectedSeasonOption = seasonOptions.find((season) => season.seasonId === selectedSeasonId) ?? null;
  const selectedSeasonLabel = selectedSeasonOption?.label ?? currentSeason?.label ?? null;
  const selectedSeasonButtonLabel = selectedSeasonLabel ?? labels.seasonButton;
  const featuredSeasonOptions = seasonOptions.slice(0, 3);
  const archivedSeasonOptions = seasonOptions.slice(3);

  const [playerStats, rankedStats, matches, steamProfile] = await Promise.all([
    getPlayerStats(player.id, platform, forceRefresh, selectedSeasonId),
    getRankedStats(player.id, platform, forceRefresh, selectedSeasonId),
    getMatches(player.id, player.matchIds, 120, selectedQueue, platform, forceRefresh, selectedSeasonId),
    platform === "steam" ? getSteamProfile(player.name) : Promise.resolve(null),
  ]);
  const resolvedOverview = playerStats?.overview ?? buildOverviewFromMatches(matches, selectedQueue);
  const resolvedRadar = playerStats?.radar?.length
    ? playerStats.radar
    : buildRadarFromMatches(matches, selectedQueue);

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
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <ProfileHeader
        username={player.name}
        overview={resolvedOverview}
        tierName={rankedStats?.tier.name ?? null}
        tierImageUrl={rankedStats?.tier.imageUrl ?? null}
        steamProfile={steamProfile}
        platform={platform}
        refreshToken={refreshToken}
        seasonLabel={selectedSeasonLabel}
        seasonId={selectedSeasonId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-8">
        <div className="lg:col-span-3 space-y-8">
          <StatRadar data={resolvedRadar} />
          <RecentTeammatesPanel matches={matches} platform={platform} />
          <RankedStatsTable stats={rankedStats} />
          <TierProgressGraph
            matches={matches}
            tierName={rankedStats?.tier.name ?? null}
            currentRp={rankedStats?.rp ?? null}
          />
          <AITacticalCoach
            overview={playerStats?.overview ?? null}
            matches={matches}
            tierName={rankedStats?.tier.name ?? null}
          />
        </div>

        <div className="lg:col-span-9">
          <div className="mb-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3">
            <div className="text-xs text-wbz-mute mb-2">{labels.seasonSelect}</div>
            {seasonOptions.length === 0 ? (
              <div className="text-[11px] text-wbz-mute">{labels.seasonLoadFail}</div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {featuredSeasonOptions.map((season) => {
                  const active = selectedSeasonId === season.seasonId;
                  return (
                    <Link
                      key={season.seasonId}
                      href={buildProfileHref(selectedQueue, season.seasonId)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition-colors whitespace-nowrap ${
                        active
                          ? "bg-cyan-300/20 text-cyan-100 border-cyan-300/50"
                          : "border-gray-300 dark:border-white/15 text-wbz-mute hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white/35"
                      }`}
                    >
                      {season.label}
                    </Link>
                  );
                })}

                {archivedSeasonOptions.length > 0 && (
                  <details className="group relative">
                    <summary className="list-none cursor-pointer rounded-lg border border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5 px-2.5 py-1.5 text-xs font-bold text-gray-900 dark:text-white inline-flex items-center gap-1.5 hover:border-gray-400 dark:hover:border-white/30 whitespace-nowrap">
                      <span>{labels.archived}</span>
                      <span className="text-xs text-wbz-mute transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="absolute right-0 z-20 mt-2 w-52 max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-dark-surface p-1.5 shadow-2xl">
                      {archivedSeasonOptions.map((season) => {
                        const active = selectedSeasonId === season.seasonId;
                        return (
                          <Link
                            key={season.seasonId}
                            href={buildProfileHref(selectedQueue, season.seasonId)}
                            className={`block rounded-md px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                              active
                                ? "bg-cyan-300/20 text-cyan-100"
                                : "text-wbz-mute hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            {season.label}
                          </Link>
                        );
                      })}
                    </div>
                  </details>
                )}

                <div className="ml-auto text-[10px] text-wbz-mute whitespace-nowrap">
                  {labels.selectedSeason}: <span className="text-gray-900 dark:text-white font-semibold">{selectedSeasonButtonLabel}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-wbz-mute">{labels.queueType}</div>
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-1">
                <Link
                  href={buildProfileHref("all")}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors whitespace-nowrap ${
                    selectedQueue === "all" ? "bg-wbz-gold text-black" : "text-wbz-mute hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {labels.all}
                </Link>
                <Link
                  href={buildProfileHref("normal")}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors whitespace-nowrap ${
                    selectedQueue === "normal" ? "bg-wbz-gold text-black" : "text-wbz-mute hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {labels.normal}
                </Link>
                <Link
                  href={buildProfileHref("competitive")}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors whitespace-nowrap ${
                    selectedQueue === "competitive" ? "bg-wbz-gold text-black" : "text-wbz-mute hover:text-gray-900 dark:hover:text-white"
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
        </div>
      </div>
    </div>
  );
}
