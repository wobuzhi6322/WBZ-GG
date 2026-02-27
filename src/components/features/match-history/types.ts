export type PlatformType = "steam" | "kakao";
export type MatchQueueType = "normal" | "competitive" | "other";
export type MatchStatus = "win" | "top10" | "lose";
export type TeamImpactBadge = "CARRY" | "ACE";

export interface MatchTeammateItem {
  accountId: string | null;
  name: string;
  teamId: number | null;
  kills: number;
  assists: number;
  damage: number;
  headshots: number;
}

export interface MatchItem {
  id: string;
  map: string;
  mode: string;
  queueType?: MatchQueueType;
  queueLabel?: string;
  seasonId?: string | null;
  result: string;
  placement?: number;
  primaryWeapon?: string;
  kills: number;
  damage: number;
  dbnos?: number;
  totalDistanceKm?: number;
  longestKillMeters?: number | null;
  assists: number;
  headshots: number;
  time: string;
  timeSurvivedSeconds?: number;
  createdAt: string;
  date: string;
  status: MatchStatus;
  teamImpactBadge?: TeamImpactBadge | null;
  rankPointTotal?: number | null;
  rankPointDelta?: number | null;
  rankPointDeltaSource?: "live" | "total-diff" | null;
  teammates: MatchTeammateItem[];
}

export interface MatchBotStatsItem {
  matchId: string;
  totalKills: number;
  botKills: number;
  playerKills: number;
  unknownKills: number;
  playerBotKills?: Record<string, number>;
}

export interface LineupMember {
  accountId: string | null;
  name: string;
  kills: number;
  isSelf: boolean;
}
