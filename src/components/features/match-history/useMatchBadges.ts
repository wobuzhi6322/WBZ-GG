import { useMemo } from "react";
import type { MatchItem, TeamImpactBadge } from "@/components/features/match-history/types";
import { getComputedTeamImpactBadge } from "@/components/features/match-history/utils";

interface UseMatchBadgesInput {
  match: MatchItem;
  sortedMatches: MatchItem[];
  absoluteIndex: number;
}

interface MatchBadgeState {
  teamImpactBadge: TeamImpactBadge | null;
  isCompetitiveQueue: boolean;
  rankPointDeltaLabel: string;
  rankPointDeltaClass: string;
}

export function useMatchBadges({
  match,
  sortedMatches,
  absoluteIndex,
}: UseMatchBadgesInput): MatchBadgeState {
  return useMemo(() => {
    const isCompetitiveQueue = match.queueType === "competitive";
    const currentRankPointTotal =
      typeof match.rankPointTotal === "number" ? match.rankPointTotal : null;
    let previousCompetitiveRankPointTotal: number | null = null;

    if (isCompetitiveQueue) {
      for (let cursor = absoluteIndex + 1; cursor < sortedMatches.length; cursor += 1) {
        const previousMatch = sortedMatches[cursor];
        if (previousMatch.queueType !== "competitive") continue;
        if (typeof previousMatch.rankPointTotal === "number") {
          previousCompetitiveRankPointTotal = previousMatch.rankPointTotal;
          break;
        }
      }
    }

    let rankPointDelta: number | null = null;
    if (
      isCompetitiveQueue &&
      currentRankPointTotal !== null &&
      previousCompetitiveRankPointTotal !== null
    ) {
      rankPointDelta = Math.round(currentRankPointTotal - previousCompetitiveRankPointTotal);
    } else if (isCompetitiveQueue && typeof match.rankPointDelta === "number") {
      rankPointDelta = match.rankPointDelta;
    }

    const normalizedRankPointDelta =
      typeof rankPointDelta === "number" ? rankPointDelta : 0;
    const hasDelta = isCompetitiveQueue && rankPointDelta !== null && rankPointDelta !== 0;
    const rankPointDeltaLabel = hasDelta
      ? `${normalizedRankPointDelta > 0 ? "+" : ""}${normalizedRankPointDelta}점`
      : "-";
    const rankPointDeltaClass = !hasDelta
      ? "text-gray-400"
      : normalizedRankPointDelta > 0
        ? "text-green-500"
        : "text-red-500";

    return {
      teamImpactBadge: match.teamImpactBadge ?? getComputedTeamImpactBadge(match),
      isCompetitiveQueue,
      rankPointDeltaLabel,
      rankPointDeltaClass,
    };
  }, [absoluteIndex, match, sortedMatches]);
}
