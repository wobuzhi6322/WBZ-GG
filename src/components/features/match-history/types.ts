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

export interface MatchKillActor {
  accountId: string | null;
  name: string;
  teamId: number | null;
  actorType: "player" | "bot" | "unknown";
  isBot: boolean;
}

export interface MatchKillLogEntry {
  id: string;
  time: string;
  elapsedSec: number | null;
  killer: MatchKillActor | null;
  victim: MatchKillActor | null;
  damageType: string;
  causer: string;
  x: number | null;
  y: number | null;
  xPercent: number | null;
  yPercent: number | null;
  isPlayerDeath: boolean;
}

export interface MatchRoutePoint {
  id: string;
  time: string;
  elapsedSec: number | null;
  actorAccountId: string | null;
  actorName: string;
  teamId: number | null;
  isSelf: boolean;
  isTeammate: boolean;
  x: number | null;
  y: number | null;
  xPercent: number | null;
  yPercent: number | null;
}

export interface MatchBlueZoneState {
  id: string;
  time: string;
  elapsedSec: number | null;
  x: number | null;
  y: number | null;
  radius: number | null;
  xPercent: number | null;
  yPercent: number | null;
}

export interface MatchDetailPayload {
  matchId: string;
  map: {
    rawName: string;
    label: string;
    mapId: string | null;
    sizeKm: number | null;
    imageUrl: string | null;
  };
  modeLabel: string;
  createdAt: string;
  durationSec: number | null;
  totalKillEvents: number;
  playerName: string | null;
  playerDeath: MatchKillLogEntry | null;
  killLogs: MatchKillLogEntry[];
  routePoints: MatchRoutePoint[];
  blueZoneStates: MatchBlueZoneState[];
  sourceTelemetryUrl: string | null;
}

export interface MatchBotStatsResponse {
  accountId: string;
  items: MatchBotStatsItem[];
  failedMatchIds?: string[];
  fetchedAt: string;
}

export interface MiniMapMarker {
  id: string;
  elapsedSec: number | null;
  xPercent: number;
  yPercent: number;
  active: boolean;
  tone: "death" | "kill" | "teamKill" | "neutral";
}

export interface MatchHistoryProps {
  matches: MatchItem[];
  accountId?: string;
  playerName?: string;
  platform?: PlatformType;
  refreshToken?: string;
}

export type StatusFilter = "all" | MatchItem["status"];
export type SortKey = "latest" | "kills" | "damage" | "placement";
export type DetailLogFilter = "all" | "myCombat" | "myKills" | "myDeath";
export type PageSizeOption = 10 | 20;
