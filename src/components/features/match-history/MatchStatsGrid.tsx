import type { ReactNode } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { formatDistanceKm, formatDuration, formatLongestKillMeters } from "@/components/features/match-history/utils";

interface MatchStatsGridProps {
  kills: number;
  damage: number;
  dbnos?: number;
  totalDistanceKm?: number;
  timeSurvivedSeconds?: number;
  timeFallback: string;
  mmrLabel: string;
  mmrClass: string;
  longestKillMeters?: number | null;
}

function StatCell({
  value,
  label,
  extra,
}: {
  value: string | number;
  label: string;
  extra?: ReactNode;
}) {
  return (
    <div className="min-w-0 flex flex-col items-center justify-center text-center">
      <div className="text-[14px] text-gray-900 dark:text-gray-100 font-black whitespace-nowrap">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</div>
      {extra}
    </div>
  );
}

export function MatchStatsGrid({
  kills,
  damage,
  dbnos,
  totalDistanceKm,
  timeSurvivedSeconds,
  timeFallback,
  mmrLabel,
  mmrClass,
  longestKillMeters,
}: MatchStatsGridProps) {
  const { t } = useLanguage();
  const survivedTime =
    typeof timeSurvivedSeconds === "number" ? formatDuration(timeSurvivedSeconds) : timeFallback;

  return (
    <>
      <StatCell value={kills} label={t.matchHistory.headers.kills} />
      <StatCell value={damage.toLocaleString()} label={t.matchHistory.headers.damage} />
      <StatCell value={dbnos ?? 0} label="DBNO" />
      <StatCell value={formatDistanceKm(totalDistanceKm)} label={t.matchHistory.headers.distance} />
      <StatCell
        value={survivedTime}
        label={t.matchHistory.headers.survival}
        extra={<div className={`mt-0.5 text-xs whitespace-nowrap ${mmrClass}`}>{mmrLabel}</div>}
      />
      <StatCell value={formatLongestKillMeters(longestKillMeters)} label={t.matchHistory.headers.snipe} />
    </>
  );
}
