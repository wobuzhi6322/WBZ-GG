"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import type { MatchSummary, PubgPlatformShard } from "@/entities/pubg/types";

interface RecentTeammatesPanelProps {
  matches: MatchSummary[];
  platform?: PubgPlatformShard;
  minSharedGames?: number;
  maxRows?: number;
}

interface TeammateAggregate {
  key: string;
  name: string;
  sharedGames: number;
}

function getTeammateKey(accountId: string | null, name: string): string {
  if (accountId && accountId.trim().length > 0) {
    return `id:${accountId.trim()}`;
  }
  return `name:${name.trim().toLowerCase()}`;
}

function buildPlayerProfileHref(name: string, platform: PubgPlatformShard): string {
  const params = new URLSearchParams();
  params.set("platform", platform);
  return `/profile/${encodeURIComponent(name)}?${params.toString()}`;
}

export default function RecentTeammatesPanel({
  matches,
  platform = "steam",
  minSharedGames = 2,
  maxRows = 10,
}: RecentTeammatesPanelProps) {
  const { language } = useLanguage();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoTimestamp = sixMonthsAgo.getTime();

  const recentMatches = matches.filter((match) => {
    const timestamp = Date.parse(match.createdAt ?? "");
    return Number.isFinite(timestamp) && timestamp >= sixMonthsAgoTimestamp;
  });

  const teammateMap = new Map<string, TeammateAggregate>();

  for (const match of recentMatches) {
    for (const teammate of match.teammates) {
      const name = teammate.name?.trim();
      if (!name) continue;

      const key = getTeammateKey(teammate.accountId, name);
      const current = teammateMap.get(key);
      if (!current) {
        teammateMap.set(key, {
          key,
          name,
          sharedGames: 1,
        });
        continue;
      }
      current.sharedGames += 1;
    }
  }

  const rows = Array.from(teammateMap.values())
    .filter((entry) => entry.sharedGames >= minSharedGames)
    .sort((a, b) => {
      if (b.sharedGames !== a.sharedGames) return b.sharedGames - a.sharedGames;
      return a.name.localeCompare(b.name, "ko");
    })
    .slice(0, maxRows);

  const labels =
    language === "en"
      ? {
          title: "Recent Teammates",
          period: "Last 6 months",
          empty: `No teammates played together ${minSharedGames}+ times in the last 6 months.`,
          withCount: (count: number) => `${count} matches`,
        }
      : language === "ja"
        ? {
            title: "最近一緒にプレイしたメンバー",
            period: "直近6か月",
            empty: `直近6か月で${minSharedGames}回以上一緒にプレイしたメンバーはいません。`,
            withCount: (count: number) => `${count}試合`,
          }
        : language === "zh"
          ? {
              title: "最近同队玩家",
              period: "最近6个月",
              empty: `最近6个月内没有与您同队达到${minSharedGames}场以上的玩家。`,
              withCount: (count: number) => `同队${count}场`,
            }
          : {
              title: "최근 함께한 플레이어",
              period: "최근 6개월",
              empty: `최근 6개월 전적에서 ${minSharedGames}판 이상 함께한 팀원이 없습니다.`,
              withCount: (count: number) => `${count}판 같이 함`,
            };

  return (
    <section className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-gray-900 dark:text-white">{labels.title}</h3>
        <span className="text-[10px] text-wbz-mute">{labels.period}</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-[11px] text-wbz-mute">{labels.empty}</p>
      ) : (
        <div className="mt-1 divide-y divide-gray-200 dark:divide-white/5">
          {rows.map((row) => (
            <Link
              key={row.key}
              href={buildPlayerProfileHref(row.name, platform)}
              className="flex items-center justify-between gap-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-white/5 px-1 rounded"
            >
              <span className="truncate text-gray-900 dark:text-white">{row.name}</span>
              <span className="shrink-0 text-[10px] text-wbz-mute">{labels.withCount(row.sharedGames)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
