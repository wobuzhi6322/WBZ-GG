"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Trophy } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { LanguageType } from "@/data/locales";

type RegionBadge = "KAKAO" | "AS" | "SEA" | "NA" | "EU" | "SA" | "RU";

interface LeaderboardEntry {
  rank: number;
  name: string;
  accountId?: string | null;
  rp: number;
  kills: number;
  wins: number;
  games: number;
  winRate: number;
  kda: string;
  region: RegionBadge;
}

interface LeaderboardPayload {
  entries: LeaderboardEntry[];
  warning: string | null;
  seasonId: string | null;
  fetchedAt: string;
}

function formatDateTime(value: string, language: LanguageType): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const locale =
    language === "ko" ? "ko-KR" : language === "ja" ? "ja-JP" : language === "zh" ? "zh-CN" : "en-US";
  return date.toLocaleString(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getRankingText(language: LanguageType) {
  if (language === "en") {
    return {
      title: "Global Leaderboard",
      subtitle: "TPP Ranked Squad Combined TOP 100 (KAKAO, AS, NA, EU, SEA)",
      refresh: "Refresh",
      headerLine: "GLOBAL / TPP Ranked Squad / TOP 100",
      season: "Season",
      synced: "Synced",
      loading: "Loading leaderboard data...",
      loadFail: "Failed to load leaderboard data.",
      apiFail: "Failed to connect to leaderboard API.",
      noData: "No global leaderboard data available.",
      rank: "Rank",
      player: "Player",
      rp: "RP",
      kda: "KDA",
      winRate: "Win Rate",
      kills: "Kills",
      wins: "Wins",
      games: "Games",
    };
  }

  if (language === "ja") {
    return {
      title: "グローバルリーダーボード",
      subtitle: "TPPランクスクワッド統合 TOP 100 (KAKAO, AS, NA, EU, SEA)",
      refresh: "更新",
      headerLine: "GLOBAL / TPP ランクスクワッド / TOP 100",
      season: "シーズン",
      synced: "同期",
      loading: "リーダーボードを読み込み中...",
      loadFail: "ランキングデータを読み込めませんでした。",
      apiFail: "ランキングAPIへの接続に失敗しました。",
      noData: "表示できるグローバルランキングがありません。",
      rank: "順位",
      player: "プレイヤー",
      rp: "RP",
      kda: "KDA",
      winRate: "勝率",
      kills: "キル",
      wins: "勝利",
      games: "試合",
    };
  }

  if (language === "zh") {
    return {
      title: "全球排行榜",
      subtitle: "TPP 竞技小队综合 TOP 100 (KAKAO, AS, NA, EU, SEA)",
      refresh: "刷新",
      headerLine: "GLOBAL / TPP 竞技小队 / TOP 100",
      season: "赛季",
      synced: "同步",
      loading: "正在加载排行榜数据...",
      loadFail: "无法加载排行榜数据。",
      apiFail: "连接排行榜 API 失败。",
      noData: "暂无可显示的全球排行榜数据。",
      rank: "排名",
      player: "玩家",
      rp: "RP",
      kda: "KDA",
      winRate: "胜率",
      kills: "击杀",
      wins: "吃鸡",
      games: "场次",
    };
  }

  return {
    title: "글로벌 리더보드",
    subtitle: "TPP 경쟁전 스쿼드 통합 TOP 100 (KAKAO, AS, NA, EU, SEA)",
    refresh: "새로고침",
    headerLine: "GLOBAL / TPP 스쿼드 경쟁전 / TOP 100",
    season: "시즌",
    synced: "동기화",
    loading: "랭킹 데이터를 불러오는 중...",
    loadFail: "랭킹 데이터를 불러오지 못했습니다.",
    apiFail: "랭킹 API 연결에 실패했습니다.",
    noData: "표시할 글로벌 랭킹 데이터가 없습니다.",
    rank: "순위",
    player: "플레이어",
    rp: "RP",
    kda: "KDA",
    winRate: "승률",
    kills: "킬",
    wins: "치킨",
    games: "경기",
  };
}

function getRegionBadgeClass(region: string): string {
  switch (region) {
    case "KAKAO":
      return "bg-yellow-400 text-black";
    case "AS":
      return "bg-blue-600 text-white";
    case "SEA":
      return "bg-emerald-500 text-white";
    case "NA":
      return "bg-red-500 text-white";
    case "EU":
      return "bg-purple-600 text-white";
    case "SA":
    case "RU":
      return "bg-gray-600 text-white";
    default:
      return "bg-gray-600 text-white";
  }
}

export default function RankingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = getRankingText(language);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [warning, setWarning] = useState<string>("");
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRanking = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setWarning("");

    try {
      const params = new URLSearchParams();
      if (forceRefresh) {
        params.set("refresh", `${Date.now()}`);
      }

      const endpoint = params.size > 0 ? `/api/leaderboard?${params.toString()}` : "/api/leaderboard";
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = (await response.json()) as LeaderboardPayload;

      setEntries(Array.isArray(payload.entries) ? payload.entries.slice(0, 100) : []);
      setSeasonId(payload.seasonId ?? null);
      setFetchedAt(payload.fetchedAt ?? "");
      setWarning(payload.warning ?? "");

      if (!response.ok && !payload.warning) {
        setWarning(text.loadFail);
      }
    } catch (error) {
      console.error("Ranking fetch failed:", error);
      setEntries([]);
      setWarning(text.apiFail);
    } finally {
      setLoading(false);
    }
  }, [text.apiFail, text.loadFail]);

  useEffect(() => {
    fetchRanking(false);
  }, [fetchRanking]);

  const handleOpenProfile = (entry: LeaderboardEntry): void => {
    const platform = entry.region === "KAKAO" ? "kakao" : "steam";
    const query = new URLSearchParams({
      platform,
      queue: "competitive",
    });

    if (entry.accountId && entry.accountId.trim().length > 0) {
      query.set("id", entry.accountId.trim());
    }

    const normalizedName = entry.name.replace(/\s*\(듀오\)\s*$/, "").trim();
    router.push(`/profile/${encodeURIComponent(normalizedName || entry.name)}?${query.toString()}`);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
              <Trophy className="h-6 w-6 text-wbz-gold" />
              {text.title}
            </h1>
            <p className="mt-1 text-xs text-wbz-mute">
              {text.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchRanking(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-wbz-gold/40 bg-wbz-gold/10 px-3 py-2 text-xs font-black text-wbz-gold transition-colors hover:bg-wbz-gold hover:text-black"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {text.refresh}
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-[11px] text-cyan-900 dark:text-cyan-100">
          {text.headerLine}
          <span className="ml-2 text-cyan-800/90 dark:text-cyan-200/90">{text.season}: {seasonId ?? "-"}</span>
          <span className="ml-2 text-cyan-800/90 dark:text-cyan-200/90">{text.synced}: {formatDateTime(fetchedAt, language)}</span>
        </div>

        {warning && (
          <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {warning}
          </div>
        )}

        {loading ? (
          <div className="flex h-56 items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface">
            <Loader2 className="h-6 w-6 animate-spin text-wbz-gold" />
            <span className="ml-2 text-xs text-wbz-mute">{text.loading}</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <table className="w-full min-w-[880px] text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 text-xs text-wbz-mute">
                  <th className="w-16 px-3 py-3 text-center">{text.rank}</th>
                  <th className="px-3 py-3">{text.player}</th>
                  <th className="px-3 py-3 text-center">{text.rp}</th>
                  <th className="px-3 py-3 text-center">{text.kda}</th>
                  <th className="px-3 py-3 text-center">{text.winRate}</th>
                  <th className="px-3 py-3 text-center">{text.kills}</th>
                  <th className="px-3 py-3 text-center">{text.wins}</th>
                  <th className="px-3 py-3 text-center">{text.games}</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-900 dark:text-white">
                {entries.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.region}-${entry.name}`}
                    onClick={() => handleOpenProfile(entry)}
                    className="cursor-pointer border-t border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <td className="px-3 py-3 text-center font-black text-wbz-gold">{entry.rank}</td>
                    <td className="px-3 py-3 font-bold">
                      <span className="inline-flex items-center gap-2">
                        {entry.name}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${getRegionBadgeClass(entry.region)}`}>
                          [{entry.region}]
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-black text-cyan-300">{entry.rp.toLocaleString()}</td>
                    <td className="px-3 py-3 text-center font-mono">{entry.kda}</td>
                    <td className="px-3 py-3 text-center">{entry.winRate.toFixed(1)}%</td>
                    <td className="px-3 py-3 text-center">{entry.kills}</td>
                    <td className="px-3 py-3 text-center">{entry.wins}</td>
                    <td className="px-3 py-3 text-center">{entry.games}</td>
                  </tr>
                ))}

                {entries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-wbz-mute">
                      {text.noData}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
