"use client";

import { motion } from "framer-motion";
import { Crown, Loader2, RefreshCw, ShieldAlert, Sparkles, Trophy } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { LanguageType } from "@/data/locales";
import { PRO_TEAM_REGION_LABELS, type ProTeamRegion, getProTeamProfile } from "@/data/proTeamProfiles";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type OfficialMode = "squad";
type LeaderboardRegion = "pc-as";
type BoardView = "official" | "daekkoller" | "pro";
type DaekkollerMode = "normal" | "competitive";

interface OfficialEntry {
  rank: number;
  name: string;
  accountId?: string | null;
  rp: number;
  kills: number;
  wins: number;
  games: number;
  winRate: number;
  kda: string;
}

interface DaekkollerEntry {
  rank: number;
  name: string;
  score: number;
  avgPlacement: number;
  avgKills: number;
  avgDamage: number;
  avgSurvivalSec: number;
  sampleMatches: number;
  maps: string[];
}

interface DaekkollerPayload {
  category: string;
  mode: DaekkollerMode;
  title: string;
  updatedAt: string;
  entries: DaekkollerEntry[];
}

interface ProPlayerEntry {
  rank: number;
  name: string;
  accountId?: string | null;
  teamTag: string;
  matches: number;
  wins: number;
  top4: number;
  kills: number;
  assists: number;
  deaths: number;
  kda: string;
  avgDamage: number;
  avgPlacement: number;
  winRate: number;
  lastMatchAt: string;
}

interface ProTeamMember {
  name: string;
  matches: number;
  kills: number;
  avgDamage: number;
}

interface ProTeamEntry {
  rank: number;
  teamKey: string;
  teamLabel: string;
  teamId: number | null;
  matches: number;
  wins: number;
  top4: number;
  kills: number;
  avgDamage: number;
  avgPlacement: number;
  winRate: number;
  roster: ProTeamMember[];
  lastMatchAt: string;
}

interface ProPayload {
  tournamentId: string | null;
  tournamentLabel: string | null;
  sourceShard: string;
  matchesAnalyzed: number;
  fetchedAt: string;
  warning: string | null;
  players: ProPlayerEntry[];
  teams: ProTeamEntry[];
}

interface RegionalHighlightPlayer {
  rank: number;
  name: string;
  kills: number;
  wins: number;
  games: number;
  winRate: number;
}

interface RegionalHighlight {
  region: string;
  label: string;
  sourceShard: string | null;
  entryCount: number;
  warning: string | null;
  topWinRate: RegionalHighlightPlayer | null;
  topKills: RegionalHighlightPlayer | null;
}

interface LeaderboardPayload {
  entries: OfficialEntry[];
  mode: string;
  region?: string;
  sourceShard: string | null;
  seasonId: string | null;
  triedShards: string[];
  fetchedAt: string;
  warning: string | null;
  apiSetup?: {
    required: boolean;
    guideUrl: string;
    steps?: string[];
  };
  serverStatus?: {
    requestedRegion: string;
    activeShard: string | null;
    fallbackUsed: boolean;
    apiKeyConfigured: boolean;
  };
  daekkoller: DaekkollerPayload | null;
  pro: ProPayload | null;
  regionalHighlights?: RegionalHighlight[];
}

const FIXED_OFFICIAL_MODE: OfficialMode = "squad";
const FIXED_REGION: LeaderboardRegion = "pc-as";
const FIXED_REGION_LABEL = "아시아 (KR/JP 통합)";

const DAEKKOLLER_MODE_OPTIONS: Array<{ key: DaekkollerMode; label: string }> = [
  { key: "normal", label: "일반전" },
  { key: "competitive", label: "경쟁전" },
];

const PRO_REGION_OPTIONS: ProTeamRegion[] = ["korea", "china", "sea", "other"];

function parseKda(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toLocaleCode(language: LanguageType): string {
  switch (language) {
    case "ko":
      return "ko-KR";
    case "ja":
      return "ja-JP";
    case "zh":
      return "zh-CN";
    default:
      return "en-US";
  }
}

function formatDateTime(value: string, language: LanguageType): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(toLocaleCode(language), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function survivalLabel(seconds: number): string {
  const minute = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${minute}분 ${sec}초`;
}

function modeToKoreanLabel(mode: string): string {
  switch (mode) {
    case "solo":
      return "솔로";
    case "duo":
      return "듀오";
    case "squad":
      return "스쿼드";
    case "solo-fpp":
      return "솔로 FPP";
    case "duo-fpp":
      return "듀오 FPP";
    case "squad-fpp":
      return "스쿼드 FPP";
    default:
      return mode.toUpperCase();
  }
}

const REGION_LABEL_KO_MAP: Record<string, string> = {
  "ASIA (KR/JP merged)": "아시아 (KR/JP 통합)",
  ASIA: "아시아",
  SEA: "동남아",
  KAKAO: "카카오",
  NA: "북미",
  EU: "유럽",
  OC: "오세아니아",
  SA: "남미",
};

function toKoreanRegionLabel(label: string): string {
  const normalized = label.trim();
  return REGION_LABEL_KO_MAP[normalized] ?? normalized;
}

export default function LeaderboardTable() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [view, setView] = useState<BoardView>("official");
  const [daekkollerMode, setDaekkollerMode] = useState<DaekkollerMode>("normal");
  const [proRegion, setProRegion] = useState<ProTeamRegion>("korea");
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const officialMode = FIXED_OFFICIAL_MODE;
  const region = FIXED_REGION;

  const fetchLeaderboard = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setFetchError("");

    try {
      const params = new URLSearchParams({
        mode: officialMode,
        region,
        limit: "50",
        daekkollerMode,
        includeDaekkoller: "true",
        includeRegionalHighlights: "true",
        includePro: "true",
      });
      if (forceRefresh) {
        params.set("refresh", `${Date.now()}`);
      }
      const response = await fetch(
        `/api/leaderboard?${params.toString()}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as LeaderboardPayload;
      setPayload(data);

      if (!response.ok) {
        setFetchError(data.warning ?? "리더보드 요청에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      setPayload(null);
      setFetchError("리더보드 API 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [officialMode, region, daekkollerMode]);

  useEffect(() => {
    fetchLeaderboard(false);
  }, [fetchLeaderboard]);

  const officialEntries = useMemo(() => payload?.entries ?? [], [payload?.entries]);
  const daekkollerEntries = useMemo(() => payload?.daekkoller?.entries ?? [], [payload?.daekkoller?.entries]);
  const proPayload = useMemo(() => payload?.pro ?? null, [payload?.pro]);
  const proPlayerEntries = useMemo(() => proPayload?.players ?? [], [proPayload?.players]);
  const proTeamEntries = useMemo(() => proPayload?.teams ?? [], [proPayload?.teams]);

  const filteredProPlayerEntries = useMemo(() => {
    return proPlayerEntries.filter((entry) => getProTeamProfile(entry.teamTag).region === proRegion);
  }, [proPlayerEntries, proRegion]);

  const filteredProTeamEntries = useMemo(() => {
    return proTeamEntries.filter((team) => getProTeamProfile(team.teamLabel).region === proRegion);
  }, [proTeamEntries, proRegion]);

  const regionalHighlights = useMemo(() => payload?.regionalHighlights ?? [], [payload?.regionalHighlights]);

  const daekkollerNameSet = useMemo(() => {
    return new Set(daekkollerEntries.map((entry) => entry.name));
  }, [daekkollerEntries]);

  const officialInsights = useMemo(() => {
    if (officialEntries.length === 0) return null;

    const avgKda =
      officialEntries.reduce((sum, player) => sum + parseKda(player.kda), 0) / Math.max(1, officialEntries.length);
    const topFragger = [...officialEntries].sort((a, b) => b.kills - a.kills)[0];
    const topWinRate = [...officialEntries].sort((a, b) => b.winRate - a.winRate || b.games - a.games || a.rank - b.rank)[0];
    const matchedCount = officialEntries.filter((entry) => daekkollerNameSet.has(entry.name)).length;

    return {
      avgKda,
      topFragger,
      topWinRate,
      matchedCount,
    };
  }, [officialEntries, daekkollerNameSet]);

  const daekkollerInsights = useMemo(() => {
    if (daekkollerEntries.length === 0) return null;
    const best = daekkollerEntries[0];
    const avgDamage =
      daekkollerEntries.reduce((sum, entry) => sum + entry.avgDamage, 0) / Math.max(1, daekkollerEntries.length);
    const avgSurvival =
      daekkollerEntries.reduce((sum, entry) => sum + entry.avgSurvivalSec, 0) / Math.max(1, daekkollerEntries.length);

    return {
      best,
      avgDamage,
      avgSurvival,
    };
  }, [daekkollerEntries]);

  const proInsights = useMemo(() => {
    if (!proPayload || filteredProPlayerEntries.length === 0) return null;

    const topPlayer = filteredProPlayerEntries[0];
    const topTeam = filteredProTeamEntries[0] ?? null;
    const avgKda =
      filteredProPlayerEntries.reduce((sum, player) => sum + parseKda(player.kda), 0) /
      Math.max(1, filteredProPlayerEntries.length);

    return {
      topPlayer,
      topTeam,
      avgKda,
      matchesAnalyzed: proPayload.matchesAnalyzed,
      tournamentLabel: proPayload.tournamentLabel ?? proPayload.tournamentId ?? "-",
    };
  }, [proPayload, filteredProPlayerEntries, filteredProTeamEntries]);

  const handleRowClick = (username: string, accountId?: string | null) => {
    const query = new URLSearchParams({
      platform: "steam",
      queue: "competitive",
    });
    if (accountId && accountId.trim().length > 0) {
      query.set("id", accountId.trim());
    }
    router.push(`/profile/${encodeURIComponent(username)}?${query.toString()}`);
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-dark-surface border border-white/5 rounded-xl">
        <Loader2 className="w-8 h-8 text-wbz-gold animate-spin" />
        <span className="ml-2 text-wbz-mute text-xs">실시간 리더보드 불러오는 중...</span>
      </div>
    );
  }

  const serverStatus = payload?.serverStatus;

  return (
    <div className="bg-dark-surface border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
      <div className="p-5 border-b border-white/5 bg-dark-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-wbz-gold" />
            {t.leaderboard.title}
            <span className="text-wbz-mute text-xs font-mono py-1 px-2 bg-white/5 rounded">실시간</span>
          </h2>

          <button
            type="button"
            onClick={() => fetchLeaderboard(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-wbz-gold hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setView("official")}
            className={`px-3 py-1.5 rounded-full text-xs font-black border ${
              view === "official"
                ? "bg-wbz-gold text-black border-wbz-gold"
                : "bg-white/5 text-wbz-mute border-white/10 hover:border-white/30"
            }`}
          >
            공식
          </button>
          <button
            type="button"
            onClick={() => setView("daekkoller")}
            className={`px-3 py-1.5 rounded-full text-xs font-black border ${
              view === "daekkoller"
                ? "bg-orange-400 text-black border-orange-400"
                : "bg-white/5 text-wbz-mute border-white/10 hover:border-white/30"
            }`}
          >
            대꼴러
          </button>
          <button
            type="button"
            onClick={() => setView("pro")}
            className={`px-3 py-1.5 rounded-full text-xs font-black border ${
              view === "pro"
                ? "bg-cyan-300 text-black border-cyan-300"
                : "bg-white/5 text-wbz-mute border-white/10 hover:border-white/30"
            }`}
          >
            프로
          </button>
        </div>

        {view === "official" ? (
          <div className="mb-3 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[11px] text-cyan-100 font-bold">
            STEAM / {FIXED_REGION_LABEL} / TPP 경쟁전 / 상위 50
          </div>
        ) : view === "daekkoller" ? (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {DAEKKOLLER_MODE_OPTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setDaekkollerMode(item.key)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                  daekkollerMode === item.key
                    ? "border-orange-300 text-orange-200 bg-orange-400/10"
                    : "border-white/10 text-wbz-mute bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[11px] text-cyan-100 font-bold">
            공식 대회 프로 보드 / 선수 + 팀
          </div>
        )}

        {view === "pro" && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {PRO_REGION_OPTIONS.map((regionKey) => (
              <button
                key={regionKey}
                type="button"
                onClick={() => setProRegion(regionKey)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                  proRegion === regionKey
                    ? "border-cyan-300 text-cyan-100 bg-cyan-400/10"
                    : "border-white/10 text-wbz-mute bg-white/5"
                }`}
              >
                {PRO_TEAM_REGION_LABELS[regionKey]}
              </button>
            ))}
          </div>
        )}

        {view === "official" && officialInsights && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] text-wbz-mute">평균 KDA</div>
              <div className="text-sm font-black text-white">{officialInsights.avgKda.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] text-wbz-mute">최다 킬</div>
              <div className="text-xs font-bold text-white truncate">
                {officialInsights.topFragger.name} ({officialInsights.topFragger.kills})
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] text-wbz-mute">최고 승률</div>
              <div className="text-xs font-bold text-white truncate">
                {officialInsights.topWinRate.name} ({officialInsights.topWinRate.winRate.toFixed(1)}%)
              </div>
            </div>
            <div className="rounded-lg border border-orange-300/30 bg-orange-400/10 p-2.5">
              <div className="text-[10px] text-orange-200">대꼴러 조건 충족 인원</div>
              <div className="text-sm font-black text-white">{officialInsights.matchedCount}</div>
            </div>
          </div>
        )}

        {view === "official" && regionalHighlights.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] text-wbz-mute font-bold mb-2">지역별 상위 플레이어</div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {regionalHighlights.map((highlight) => (
                <div key={highlight.region} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <div className="text-[11px] font-black text-wbz-gold mb-1">{toKoreanRegionLabel(highlight.label)}</div>
                  <div className="text-[11px] text-wbz-mute">
                    최고 승률:
                    <span className="text-white font-bold ml-1">
                      {highlight.topWinRate
                        ? `${highlight.topWinRate.name} (${highlight.topWinRate.winRate.toFixed(1)}%)`
                        : "-"}
                    </span>
                  </div>
                  <div className="text-[11px] text-wbz-mute">
                    최다 킬:
                    <span className="text-white font-bold ml-1">
                      {highlight.topKills ? `${highlight.topKills.name} (${highlight.topKills.kills})` : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "daekkoller" && daekkollerInsights && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border border-orange-300/30 bg-orange-400/10 p-2.5">
              <div className="text-[10px] text-orange-200">#1</div>
              <div className="text-xs font-bold text-white truncate">{daekkollerInsights.best.name}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] text-wbz-mute">평균 딜량</div>
              <div className="text-sm font-black text-white">{Math.round(daekkollerInsights.avgDamage)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] text-wbz-mute">평균 생존</div>
              <div className="text-sm font-black text-white">{survivalLabel(daekkollerInsights.avgSurvival)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] text-wbz-mute">표본 수</div>
              <div className="text-sm font-black text-white">{daekkollerEntries.length}</div>
            </div>
          </div>
        )}

        {view === "pro" && proInsights && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border border-cyan-300/30 bg-cyan-400/10 p-2.5">
              <div className="text-[10px] text-cyan-200">대회</div>
              <div className="text-xs font-bold text-white truncate">{proInsights.tournamentLabel}</div>
              <div className="text-[10px] text-cyan-100/80 mt-0.5">{PRO_TEAM_REGION_LABELS[proRegion]}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] text-wbz-mute">상위 선수</div>
              <div className="text-xs font-bold text-white truncate">{proInsights.topPlayer.name}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] text-wbz-mute">상위 팀</div>
              <div className="text-xs font-bold text-white truncate inline-flex items-center gap-1.5">
                {proInsights.topTeam ? (
                  <>
                    <Image
                      src={getProTeamProfile(proInsights.topTeam.teamLabel).iconUrl}
                      alt={`${proInsights.topTeam.teamLabel} icon`}
                      width={16}
                      height={16}
                      className="h-4 w-4 rounded object-cover border border-white/20"
                      unoptimized
                    />
                    {getProTeamProfile(proInsights.topTeam.teamLabel).displayName}
                  </>
                ) : (
                  "-"
                )}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] text-wbz-mute">분석 경기 수</div>
              <div className="text-sm font-black text-white">{proInsights.matchesAnalyzed}</div>
            </div>
          </div>
        )}

        <div className="mt-3 text-[11px] text-wbz-mute flex flex-wrap items-center gap-2">
          <span>
            플랫폼: <span className="text-white font-mono">STEAM</span>
          </span>
          <span>
            모드: <span className="text-white font-mono">{modeToKoreanLabel(officialMode)}</span>
          </span>
          <span>
            요청: <span className="text-white font-mono">{serverStatus?.requestedRegion ?? FIXED_REGION}</span>
          </span>
          <span>
            실제 샤드: <span className="text-white font-mono">{payload?.sourceShard ?? "-"}</span>
          </span>
          <span>
            폴백 사용: <span className="text-white font-mono">{serverStatus?.fallbackUsed ? "예" : "아니오"}</span>
          </span>
          <span>
            API 키:{" "}
            <span className="text-white font-mono">
              {serverStatus?.apiKeyConfigured ? "설정됨" : "없음"}
            </span>
          </span>
          <span>
            시즌: <span className="font-mono text-white">{payload?.seasonId ?? "-"}</span>
          </span>
          <span>
            동기화: <span className="font-mono text-white">{payload ? formatDateTime(payload.fetchedAt, language) : "-"}</span>
          </span>
        </div>
      </div>

      {fetchError && (
        <div className="mx-4 mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span className="font-black">리더보드 경고</span>
          </div>
          <p>{fetchError}</p>
          {payload?.apiSetup?.required && payload.apiSetup.guideUrl && (
            <a
              href={payload.apiSetup.guideUrl}
              target="_blank"
              rel="noreferrer"
              className="text-wbz-gold hover:underline font-bold"
            >
              PUBG API 가이드 열기
            </a>
          )}
        </div>
      )}

      <div className="overflow-x-auto mt-4">
        {view === "official" && (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-xs text-wbz-mute uppercase tracking-wider">
                <th className="p-4 w-16 text-center">{t.leaderboard.columns.rank}</th>
                <th className="p-4">{t.leaderboard.columns.operator}</th>
                <th className="p-4 text-center">{t.leaderboard.columns.rp}</th>
                <th className="p-4 text-center">{t.leaderboard.columns.kd}</th>
                <th className="p-4 text-center">승률</th>
                <th className="p-4 text-center">킬</th>
                <th className="p-4 text-center">치킨</th>
              </tr>
            </thead>
            <tbody className="text-white text-sm">
              {officialEntries.map((player, index) => (
                <motion.tr
                  key={`${player.rank}-${player.name}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleRowClick(player.name, player.accountId)}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="p-4 text-center font-black text-wbz-gold">{player.rank}</td>
                  <td className="p-4 font-bold">
                    <span className="inline-flex items-center gap-2">
                      {player.name}
                      {daekkollerNameSet.has(player.name) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-400/50 text-orange-200">
                          대꼴러
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-4 text-center font-black text-cyan-300">{player.rp.toLocaleString()}</td>
                  <td className="p-4 text-center font-mono">{player.kda}</td>
                  <td className="p-4 text-center">{player.winRate.toFixed(1)}%</td>
                  <td className="p-4 text-center">{player.kills}</td>
                  <td className="p-4 text-center">{player.wins}</td>
                </motion.tr>
              ))}
              {officialEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-wbz-mute">
                    현재 모드/지역의 공식 리더보드 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {view === "daekkoller" && (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-xs text-wbz-mute uppercase tracking-wider">
                <th className="p-4 w-16 text-center">#</th>
                <th className="p-4">플레이어</th>
                <th className="p-4 text-center">점수</th>
                <th className="p-4 text-center">평균 순위</th>
                <th className="p-4 text-center">평균 딜량</th>
                <th className="p-4 text-center">평균 생존</th>
              </tr>
            </thead>
            <tbody className="text-white text-sm">
              {daekkollerEntries.map((entry, index) => (
                <motion.tr
                  key={`${entry.rank}-${entry.name}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleRowClick(entry.name)}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="p-4 text-center font-black text-orange-300">
                    {entry.rank <= 3 ? <Crown className="w-4 h-4 inline-block mr-1 text-yellow-300" /> : null}
                    {entry.rank}
                  </td>
                  <td className="p-4 font-bold inline-flex items-center gap-2">
                    {entry.name}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-400/50 text-orange-200">
                      <Sparkles className="w-3 h-3 inline-block mr-1" />
                      대꼴러
                    </span>
                  </td>
                  <td className="p-4 text-center font-black text-orange-200">{entry.score.toFixed(2)}</td>
                  <td className="p-4 text-center">{entry.avgPlacement.toFixed(1)}</td>
                  <td className="p-4 text-center">{entry.avgDamage.toFixed(1)}</td>
                  <td className="p-4 text-center">{survivalLabel(entry.avgSurvivalSec)}</td>
                </motion.tr>
              ))}
              {daekkollerEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-wbz-mute">
                    대꼴러 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {view === "pro" && (
          <div className="space-y-4 p-4">
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-xs text-wbz-mute uppercase tracking-wider">
                    <th className="p-3 w-14 text-center">#</th>
                    <th className="p-3">플레이어</th>
                    <th className="p-3">팀</th>
                    <th className="p-3 text-center">KDA</th>
                    <th className="p-3 text-center">평균 딜량</th>
                    <th className="p-3 text-center">치킨</th>
                    <th className="p-3 text-center">경기 수</th>
                  </tr>
                </thead>
                <tbody className="text-white text-sm">
                  {filteredProPlayerEntries.map((entry, index) => (
                    <motion.tr
                      key={`pro-player-${entry.rank}-${entry.name}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleRowClick(entry.name, entry.accountId)}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="p-3 text-center font-black text-cyan-200">{entry.rank}</td>
                      <td className="p-3 font-bold">{entry.name}</td>
                      <td className="p-3">
                        {(() => {
                          const teamProfile = getProTeamProfile(entry.teamTag);
                          return (
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                              <Image
                                src={teamProfile.iconUrl}
                                alt={`${teamProfile.tag} icon`}
                                width={20}
                                height={20}
                                className="h-5 w-5 rounded-md object-cover border border-white/20"
                                loading="lazy"
                                unoptimized
                              />
                              <span className="text-xs font-bold text-cyan-100">{teamProfile.tag}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-center font-mono">{entry.kda}</td>
                      <td className="p-3 text-center">{entry.avgDamage}</td>
                      <td className="p-3 text-center">{entry.wins}</td>
                      <td className="p-3 text-center">{entry.matches}</td>
                    </motion.tr>
                  ))}
                  {filteredProPlayerEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-wbz-mute">
                        선택한 지역의 프로 선수 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProTeamEntries.map((team) => {
                const teamProfile = getProTeamProfile(team.teamLabel);
                return (
                  <article key={team.teamKey} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Image
                          src={teamProfile.iconUrl}
                          alt={`${teamProfile.displayName} logo`}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-lg object-cover border border-white/20 flex-shrink-0"
                          loading="lazy"
                          unoptimized
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-black text-cyan-200 truncate">
                            #{team.rank} {teamProfile.displayName}
                          </div>
                          <div className="text-[11px] text-wbz-mute truncate">TAG {teamProfile.tag}</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-wbz-mute text-right">
                        승률 {team.winRate.toFixed(1)}%<br />평균 순위 #{team.avgPlacement.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-[11px] text-wbz-mute mb-2">
                      {team.matches}경기 · {team.wins}치킨 · {team.kills}킬 · 탑4 {team.top4}
                    </div>
                    <div className="rounded-lg border border-white/10 bg-dark-surface overflow-hidden">
                      <div className="px-2.5 py-1.5 text-[10px] text-cyan-200 font-bold border-b border-white/10">
                        로스터
                      </div>
                      <div className="divide-y divide-white/5">
                        {team.roster.map((member) => (
                          <div key={`${team.teamKey}-${member.name}`} className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-white truncate">{member.name}</span>
                            <span className="text-wbz-mute font-mono">{member.kills}킬 / {member.avgDamage}딜</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
              {filteredProTeamEntries.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-wbz-mute">
                  선택한 지역의 팀 데이터가 없습니다.
                </div>
              )}
            </div>

            {proPayload?.warning && (
              <div className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-3 text-xs text-amber-100">
                {proPayload.warning}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

