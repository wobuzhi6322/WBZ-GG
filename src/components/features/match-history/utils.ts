import type { LineupMember, MatchBotStatsItem, MatchItem, MatchStatus, PlatformType, TeamImpactBadge } from "@/components/features/match-history/types";

export type MmrLevel = "low" | "mid" | "high";
export type BotStatStatus = "ready" | "loading" | "failed";

export function getStatusClass(status: MatchStatus): string {
  if (status === "win") return "border-amber-300/50 bg-amber-300/20 text-gray-900 dark:text-gray-100";
  if (status === "top10") return "border-cyan-300/60 bg-cyan-400/20 text-gray-900 dark:text-gray-100";
  return "border-gray-300 dark:border-white/15 bg-transparent text-gray-900 dark:text-gray-100";
}

export function formatDuration(seconds: number): string {
  const minute = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${minute}m ${sec.toString().padStart(2, "0")}s`;
}

export function formatDistanceKm(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "-";
  return `${value.toFixed(2)}km`;
}

export function formatLongestKillMeters(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "-";
  return `${Math.floor(value)}m`;
}

function buildBotKillLookupKeys(accountId: string | null | undefined, name: string | null | undefined): string[] {
  const keys: string[] = [];
  if (accountId && accountId.trim().length > 0) {
    keys.push(`id:${accountId.trim()}`);
  }
  if (name && name.trim().length > 0) {
    keys.push(`name:${name.trim().toLowerCase()}`);
  }
  return keys;
}

export function resolvePlayerBotKills(
  botStats: MatchBotStatsItem | null,
  accountId: string | null | undefined,
  name: string | null | undefined
): number | null {
  if (!botStats?.playerBotKills) return null;
  for (const key of buildBotKillLookupKeys(accountId, name)) {
    const value = botStats.playerBotKills[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return null;
}

export function getBotKillLabel(
  botKills: number | null | undefined,
  status: BotStatStatus = "ready"
): string {
  if (status === "loading") return "봇 집계중";
  if (status === "failed") return "봇 집계실패";
  return typeof botKills === "number" && botKills > 0 ? `봇${botKills}` : "봇X";
}

export function formatKillLabelWithBot(
  kills: number,
  botKills: number | null | undefined,
  status: BotStatStatus = "ready"
): string {
  return `${kills}킬(${getBotKillLabel(botKills, status)})`;
}

export function buildPlayerProfileHref(name: string, platform: PlatformType): string {
  const params = new URLSearchParams();
  params.set("platform", platform);
  return `/profile/${encodeURIComponent(name)}?${params.toString()}`;
}

export function getMatchMmrLevel(
  match: MatchItem,
  botStats: MatchBotStatsItem | null,
  isBotStatsLoading: boolean
): MmrLevel {
  if (match.queueType === "competitive") {
    if (match.kills >= 3 || match.damage >= 300 || (match.placement ?? 99) <= 8) return "high";
    if (match.kills >= 1 || match.damage >= 180 || (match.placement ?? 99) <= 20) return "mid";
    return "low";
  }

  if (!botStats) {
    if (isBotStatsLoading) return "mid";
    if (match.kills >= 4 || match.damage >= 280) return "high";
    if (match.kills >= 2 || match.damage >= 170) return "mid";
    return "low";
  }

  const playerKills = Math.max(0, botStats.playerKills);
  const botRatio = botStats.botKills / Math.max(1, match.kills);
  if (playerKills >= 3 && botRatio <= 0.3) return "high";
  if (playerKills >= 1 || botRatio <= 0.55) return "mid";
  return "low";
}

export function getMmrTextClass(mmrLevel: MmrLevel): string {
  if (mmrLevel === "high") return "text-red-500 dark:text-red-400";
  if (mmrLevel === "mid") return "text-amber-500 dark:text-yellow-400";
  return "text-blue-500 dark:text-blue-400";
}

export function getComputedTeamImpactBadge(match: MatchItem): TeamImpactBadge | null {
  const placement = typeof match.placement === "number" ? match.placement : null;
  if (!placement || placement <= 0) return null;

  const myScore = match.kills + match.damage;
  const topMateScore = match.teammates.reduce((max, teammate) => {
    return Math.max(max, teammate.kills + teammate.damage);
  }, 0);
  if (myScore < topMateScore) return null;
  return placement <= 3 ? "CARRY" : "ACE";
}

export function buildLineupMembers(
  match: MatchItem,
  accountId: string | undefined,
  playerName: string | undefined
): LineupMember[] {
  const selfDisplayName = playerName?.trim() || "나";
  const memberSeen = new Set<string>();

  return [
    {
      accountId: accountId ?? null,
      name: selfDisplayName,
      kills: match.kills,
      isSelf: true,
    },
    ...match.teammates.map((teammate) => ({
      accountId: teammate.accountId,
      name: teammate.name,
      kills: teammate.kills,
      isSelf: false,
    })),
  ].filter((member) => {
    const trimmedName = member.name.trim();
    if (!trimmedName) return false;
    const key =
      member.accountId && member.accountId.trim().length > 0
        ? `id:${member.accountId.trim()}`
        : `name:${trimmedName.toLowerCase()}`;
    if (memberSeen.has(key)) return false;
    memberSeen.add(key);
    return true;
  });
}
