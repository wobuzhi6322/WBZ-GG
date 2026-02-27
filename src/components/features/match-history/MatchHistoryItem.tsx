import { motion } from "framer-motion";
import { MapPinned } from "lucide-react";
import { MatchResultBadge } from "@/components/features/match-history/MatchResultBadge";
import { MatchStatsGrid } from "@/components/features/match-history/MatchStatsGrid";
import { TeammateList } from "@/components/features/match-history/TeammateList";
import { WeaponInfo } from "@/components/features/match-history/WeaponInfo";
import { useLanguage } from "@/context/LanguageContext";
import { MATCH_HISTORY_GRID_TEMPLATE } from "@/components/features/match-history/layout";
import type { MatchBotStatsItem, MatchItem, PlatformType } from "@/components/features/match-history/types";
import { useMatchBadges } from "@/components/features/match-history/useMatchBadges";
import { buildLineupMembers, getMatchMmrLevel, getMmrTextClass, type MmrLevel } from "@/components/features/match-history/utils";

interface MatchHistoryItemProps {
  match: MatchItem;
  index: number;
  absoluteIndex: number;
  sortedMatches: MatchItem[];
  botStats: MatchBotStatsItem | null;
  isBotStatsLoading: boolean;
  accountId?: string;
  playerName?: string;
  platform: PlatformType;
  onOpenDetail: () => void;
}

const ROW_CLASS = `grid grid-cols-1 items-center ${MATCH_HISTORY_GRID_TEMPLATE} gap-2 lg:gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/5`;

export function MatchHistoryItem({
  match,
  index,
  absoluteIndex,
  sortedMatches,
  botStats,
  isBotStatsLoading,
  accountId,
  playerName,
  platform,
  onOpenDetail,
}: MatchHistoryItemProps) {
  const { t, language } = useLanguage();
  const { teamImpactBadge } = useMatchBadges({ match, sortedMatches, absoluteIndex });
  const mmrLevel = getMatchMmrLevel(match, botStats, isBotStatsLoading);
  const mmrClass = getMmrTextClass(mmrLevel);
  const mmrLabel = getMmrLabel(language, mmrLevel);

  const members = buildLineupMembers(match, accountId, playerName);
  const displayedMembers = members.slice(0, 4);
  const hiddenMemberCount = Math.max(0, members.length - displayedMembers.length);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.012 }} className={ROW_CLASS}>
      <MatchResultBadge
        result={match.result}
        status={match.status}
        teamImpactBadge={teamImpactBadge}
        date={match.date}
      />

      <div className="min-w-0 flex flex-col items-center justify-center text-center">
        <div className="text-[13px] font-black text-gray-900 dark:text-gray-100 leading-tight truncate">{match.map}</div>
        <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 leading-tight truncate">
          {match.queueLabel ? `${match.queueLabel} · ${match.mode}` : match.mode}
        </div>
      </div>

      <WeaponInfo primaryWeapon={match.primaryWeapon} />

      <MatchStatsGrid
        kills={match.kills}
        damage={match.damage}
        dbnos={match.dbnos}
        totalDistanceKm={match.totalDistanceKm}
        timeSurvivedSeconds={match.timeSurvivedSeconds}
        timeFallback={match.time}
        mmrLabel={mmrLabel}
        mmrClass={mmrClass}
        longestKillMeters={match.longestKillMeters}
      />

      <div className="min-w-0 flex flex-col justify-center">
        <TeammateList
          matchId={match.id}
          members={displayedMembers}
          hiddenMemberCount={hiddenMemberCount}
          botStats={botStats}
          accountId={accountId}
          playerName={playerName}
          platform={platform}
        />
      </div>

      <div className="min-w-0 flex items-center justify-center">
        <button
          type="button"
          onClick={onOpenDetail}
          className="h-7 min-w-[46px] inline-flex items-center justify-center gap-1 px-1 rounded-md border border-gray-300 dark:border-white/20 text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-400 dark:hover:border-white/40 whitespace-nowrap"
        >
          <MapPinned className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" />
          {t.matchHistory.headers.detail}
        </button>
      </div>
    </motion.div>
  );
}

function getMmrLabel(language: "ko" | "en" | "ja" | "zh", mmrLevel: MmrLevel): string {
  if (language === "en") {
    if (mmrLevel === "high") return "MMR High";
    if (mmrLevel === "mid") return "MMR Mid";
    return "MMR Low";
  }

  if (language === "ja") {
    if (mmrLevel === "high") return "MMR 高";
    if (mmrLevel === "mid") return "MMR 中";
    return "MMR 低";
  }

  if (language === "zh") {
    if (mmrLevel === "high") return "MMR 高";
    if (mmrLevel === "mid") return "MMR 中";
    return "MMR 低";
  }

  if (mmrLevel === "high") return "MMR 높음";
  if (mmrLevel === "mid") return "MMR 중간";
  return "MMR 낮음";
}
