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
  const { t, language } = useLanguage();
  const text = t.rankingPage;

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [warning, setWarning] = useState("");
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(
    async (forceRefresh = false) => {
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
    },
    [text.apiFail, text.loadFail],
  );

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

    const normalizedName = entry.name.replace(/\s*\([^)]*\)\s*$/, "").trim();
    router.push(`/profile/${encodeURIComponent(normalizedName || entry.name)}?${query.toString()}`);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-dark-surface md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
              <Trophy className="h-6 w-6 text-wbz-gold" />
              {text.title}
            </h1>
            <p className="mt-1 text-xs text-wbz-mute">{text.subtitle}</p>
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
          <span className="ml-2 text-cyan-800/90 dark:text-cyan-200/90">
            {text.season}: {seasonId ?? "-"}
          </span>
          <span className="ml-2 text-cyan-800/90 dark:text-cyan-200/90">
            {text.synced}: {formatDateTime(fetchedAt, language)}
          </span>
        </div>

        {warning && (
          <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {warning}
          </div>
        )}

        {loading ? (
          <div className="flex h-56 items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-dark-surface">
            <Loader2 className="h-6 w-6 animate-spin text-wbz-gold" />
            <span className="ml-2 text-xs text-wbz-mute">{text.loading}</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <table className="w-full min-w-[880px] text-left">
              <thead>
                <tr className="bg-gray-50 text-xs text-wbz-mute dark:bg-white/5">
                  <th className="w-16 px-3 py-3 text-center">{text.columns.rank}</th>
                  <th className="px-3 py-3">{text.columns.player}</th>
                  <th className="px-3 py-3 text-center">{text.columns.rp}</th>
                  <th className="px-3 py-3 text-center">{text.columns.kda}</th>
                  <th className="px-3 py-3 text-center">{text.columns.winRate}</th>
                  <th className="px-3 py-3 text-center">{text.columns.kills}</th>
                  <th className="px-3 py-3 text-center">{text.columns.wins}</th>
                  <th className="px-3 py-3 text-center">{text.columns.games}</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-900 dark:text-white">
                {entries.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.region}-${entry.name}`}
                    onClick={() => handleOpenProfile(entry)}
                    className="cursor-pointer border-t border-gray-200 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5"
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
