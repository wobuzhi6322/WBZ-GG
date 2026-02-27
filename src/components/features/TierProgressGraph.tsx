"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { MatchSummary } from "@/entities/pubg/types";

interface TierProgressGraphProps {
  matches: MatchSummary[];
  tierName: string | null;
  currentRp: number | null;
}

interface Point {
  x: number;
  y: number;
}

function toPercentY(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  const ratio = (value - min) / (max - min);
  return 100 - ratio * 100;
}

export default function TierProgressGraph({ matches, tierName, currentRp }: TierProgressGraphProps) {
  const { language } = useLanguage();

  const competitiveMatches = matches
    .filter((match) => match.queueType === "competitive" && typeof match.rankPointDelta === "number")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(-20);

  const labels =
    language === "en"
      ? {
          title: "Tier Graph",
          unranked: "Unranked",
          noData: "No competitive RP delta data found.",
          recent: "Recent",
          matches: "matches RP",
          base: "Current RP",
          baseline: "0 baseline",
        }
      : language === "ja"
        ? {
            title: "ティアグラフ",
            unranked: "アンランク",
            noData: "競争戦RP増減データがありません。",
            recent: "直近",
            matches: "試合 RP",
            base: "現在 RP",
            baseline: "0基準 変動",
          }
        : language === "zh"
          ? {
              title: "段位图表",
              unranked: "未定级",
              noData: "没有竞技RP增减数据。",
              recent: "最近",
              matches: "场 RP",
              base: "当前 RP",
              baseline: "0 基准波动",
            }
          : {
              title: "티어 그래프",
              unranked: "언랭크",
              noData: "경쟁전 RP 증감 데이터가 있는 경기가 없습니다.",
              recent: "최근",
              matches: "경기 RP",
              base: "현재 RP",
              baseline: "0점 기준 변동",
            };

  if (competitiveMatches.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4">
        <div className="text-xs text-wbz-mute">{labels.title}</div>
        <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">{tierName ?? labels.unranked}</div>
        <div className="text-[11px] text-wbz-mute mt-1">{labels.noData}</div>
      </div>
    );
  }

  const cumulativeValues: number[] = [];
  let cumulative = 0;
  for (const match of competitiveMatches) {
    cumulative += match.rankPointDelta ?? 0;
    cumulativeValues.push(cumulative);
  }

  const minValue = Math.min(0, ...cumulativeValues);
  const maxValue = Math.max(0, ...cumulativeValues);
  const totalDelta = cumulativeValues[cumulativeValues.length - 1] ?? 0;

  const points: Point[] = cumulativeValues.map((value, index) => {
    const x = competitiveMatches.length === 1 ? 50 : (index / (competitiveMatches.length - 1)) * 100;
    const y = toPercentY(value, minValue, maxValue);
    return { x, y };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const strokeClass = totalDelta >= 0 ? "text-emerald-500 dark:text-emerald-300" : "text-rose-500 dark:text-rose-300";
  const rpText = typeof currentRp === "number" ? currentRp.toLocaleString() : "-";
  const deltaText = `${totalDelta > 0 ? "+" : ""}${totalDelta}`;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs text-wbz-mute">{labels.title}</div>
          <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{tierName ?? labels.unranked}</div>
        </div>
        <div className={`text-xs font-black ${strokeClass}`}>
          {labels.recent} {competitiveMatches.length}
          {labels.matches} {deltaText}
        </div>
      </div>

      <div className="mt-3 h-28 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 px-2 py-2">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(148,163,184,0.45)" strokeDasharray="2 2" />
          <polyline
            points={polyline}
            fill="none"
            stroke={totalDelta >= 0 ? "#34d399" : "#fb7185"}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point, index) => (
            <circle
              key={`rp-point-${index}`}
              cx={point.x}
              cy={point.y}
              r={1.6}
              fill={totalDelta >= 0 ? "#34d399" : "#fb7185"}
            />
          ))}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-wbz-mute">
        <span>
          {labels.base}: {rpText}
        </span>
        <span>{labels.baseline}</span>
      </div>
    </div>
  );
}

