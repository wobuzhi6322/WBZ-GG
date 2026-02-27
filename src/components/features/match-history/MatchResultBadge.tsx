import { useLanguage } from "@/context/LanguageContext";
import type { MatchStatus, TeamImpactBadge } from "@/components/features/match-history/types";
import { getStatusClass } from "@/components/features/match-history/utils";

interface MatchResultBadgeProps {
  result: string;
  status: MatchStatus;
  teamImpactBadge: TeamImpactBadge | null;
  date: string;
}

const IMPACT_BADGE_CLASS: Record<TeamImpactBadge, string> = {
  CARRY: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50",
  ACE: "bg-purple-500/20 text-purple-400 border border-purple-500/50",
};

export function MatchResultBadge({
  result,
  status,
  teamImpactBadge,
  date,
}: MatchResultBadgeProps) {
  const { t } = useLanguage();
  const statusText =
    status === "win"
      ? t.matchHistory.status.win
      : status === "top10"
        ? t.matchHistory.status.top10
        : t.matchHistory.status.lose;

  return (
    <div className="min-w-0 flex flex-col items-start justify-center gap-1">
      <div className="text-[20px] leading-none font-black text-gray-900 dark:text-gray-100 whitespace-nowrap">{result}</div>
      <div
        className={`inline-flex w-fit px-1.5 py-0.5 rounded-full border text-[9px] font-black whitespace-nowrap ${getStatusClass(status)}`}
      >
        {statusText}
      </div>
      {teamImpactBadge ? (
        <div
          className={`inline-flex w-fit items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black whitespace-nowrap ${IMPACT_BADGE_CLASS[teamImpactBadge]}`}
        >
          {teamImpactBadge}
        </div>
      ) : null}
      <div className="pt-0.5 text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{date}</div>
    </div>
  );
}
