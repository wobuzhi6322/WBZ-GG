export type PubgPlatformShard = "steam" | "kakao";

export type LeaderboardMode = "solo" | "duo" | "squad" | "solo-fpp" | "duo-fpp" | "squad-fpp";
export type LeaderboardRegion = "pc-as" | "pc-krjp" | "pc-sea" | "pc-kakao" | "pc-na" | "pc-eu" | "pc-oc" | "pc-sa";

export type MatchQueueFilter = "all" | "normal" | "competitive";
export type UnknownRecord = Record<string, unknown>;

export interface JsonApiList<T> {
  data: T[];
}

export interface JsonApiObject<T> {
  data: T;
}

export interface SeasonItem {
  id: string;
  attributes?: {
    isCurrentSeason?: boolean;
  };
}

export interface PlayerEntity {
  id: string;
  attributes?: {
    name?: string;
    shardId?: string;
  };
  relationships?: {
    matches?: {
      data?: Array<{ id?: string }>;
    };
  };
}

export interface SeasonStatsResponse {
  data?: {
    attributes?: {
      gameModeStats?: Record<string, UnknownRecord>;
    };
  };
}

export interface RankedStatsResponse {
  data?: {
    attributes?: {
      rankedGameModeStats?: Record<string, UnknownRecord>;
    };
  };
}

export interface LeaderboardResponse {
  included?: Array<{
    id?: string;
    attributes?: {
      rank?: number;
      name?: string;
      stats?: {
        rankPoints?: number;
        kills?: number;
        wins?: number;
        assists?: number;
        deaths?: number;
        games?: number;
        winRatio?: number;
      };
    };
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  accountId: string | null;
  rp: number;
  kills: number;
  wins: number;
  games: number;
  winRate: number;
  kda: string;
}

export interface LeaderboardSnapshot {
  entries: LeaderboardEntry[];
  mode: string;
  sourceShard: string | null;
  seasonId: string | null;
  triedShards: string[];
  fetchedAt: string;
  warning: string | null;
}

export interface CurrentSeasonInfo {
  seasonId: string;
  seasonNumber: number | null;
  label: string;
}

export interface SeasonOption {
  seasonId: string;
  seasonNumber: number | null;
  label: string;
  isCurrent: boolean;
}

export interface MatchResponse {
  data?: {
    id?: string;
    attributes?: {
      mapName?: string;
      gameMode?: string;
      matchType?: string;
      seasonState?: string;
      createdAt?: string;
      duration?: number;
    };
    relationships?: {
      assets?: {
        data?: Array<{ id?: string; type?: string }>;
      };
    };
  };
  included?: Array<{
    id?: string;
    type?: string;
    attributes?: {
      stats?: UnknownRecord;
      won?: string;
      URL?: string;
      url?: string;
    };
    relationships?: {
      participants?: {
        data?: Array<{ id?: string; type?: string }>;
      };
    };
  }>;
}

export interface TelemetryCharacter {
  accountId?: string;
  name?: string;
  teamId?: number;
  location?: {
    x?: number;
    y?: number;
    z?: number;
  };
}

export interface TelemetryEvent {
  _T?: string;
  _D?: string;
  common?: {
    isGame?: number;
  };
  character?: TelemetryCharacter | null;
  gameState?: {
    safetyZonePosition?: {
      x?: number;
      y?: number;
      z?: number;
    };
    safetyZoneRadius?: number;
  };
  killer?: TelemetryCharacter | null;
  victim?: TelemetryCharacter | null;
  finisher?: TelemetryCharacter | null;
  attacker?: TelemetryCharacter | null;
  location?: {
    x?: number;
    y?: number;
    z?: number;
  };
  damageTypeCategory?: string;
  damageCauserName?: string;
}

export interface PlayerData {
  id: string;
  name: string;
  shardId: string;
  matchIds: string[];
}

export interface TierInfo {
  name: string;
  color: string;
  border: string;
  colorHex: string;
  imageUrl: string;
}

export interface PubgStats {
  overview: {
    mode: string;
    modeLabel: string;
    matchesPlayed: number;
    wins: number;
    top10s: number;
    kills: number;
    damageDealt: number;
    assists: number;
    dbnos: number;
    timeSurvived: number;
    kda: string;
    avgDamage: number;
    winRate: string;
  };
  radar: {
    subject: string;
    A: number;
    fullMark: number;
  }[];
}

export interface RankedStats {
  rp: number;
  bestRp: number;
  tier: TierInfo;
  matches: number;
  wins: number;
  kda: string;
  avgDmg: number;
  winRate: string;
  mode: string;
  modeLabel: string;
}

export interface MatchSummary {
  id: string;
  map: string;
  mode: string;
  queueType: "normal" | "competitive" | "other";
  queueLabel: string;
  seasonId: string | null;
  result: string;
  placement: number;
  primaryWeapon: string;
  kills: number;
  damage: number;
  dbnos: number;
  totalDistanceKm: number;
  longestKillMeters: number | null;
  assists: number;
  headshots: number;
  time: string;
  timeSurvivedSeconds: number;
  createdAt: string;
  date: string;
  status: "win" | "top10" | "lose";
  teamImpactBadge: "CARRY" | "ACE" | null;
  rankPointTotal: number | null;
  rankPointDelta: number | null;
  rankPointDeltaSource: "live" | "total-diff" | null;
  teammates: MatchTeammateSummary[];
}

export interface MatchFetchResult {
  matches: MatchSummary[];
  quotaLimited: boolean;
  requestedLimit: number;
  fetchedRawCount: number;
}

export interface MatchTeammateSummary {
  accountId: string | null;
  name: string;
  teamId: number | null;
  kills: number;
  assists: number;
  damage: number;
  headshots: number;
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

export interface MatchBotKillSummary {
  matchId: string;
  totalKills: number;
  botKills: number;
  playerKills: number;
  unknownKills: number;
  playerBotKills?: Record<string, number>;
}

export interface TournamentItem {
  id?: string;
}

export interface TournamentListResponse {
  data?: TournamentItem[];
}

export interface TournamentSummaryResponse {
  data?: {
    id?: string;
    relationships?: {
      matches?: {
        data?: Array<{ id?: string }>;
      };
    };
  };
  included?: Array<{
    id?: string;
    type?: string;
    attributes?: {
      createdAt?: string;
    };
  }>;
}

export interface ProLeaderboardPlayerEntry {
  rank: number;
  name: string;
  accountId: string | null;
  teamTag: string;
  matches: number;
  wins: number;
  top4: number;
  kills: number;
  assists: number;
  deaths: number;
  kda: string;
  avgDamage: number;
  avgPlacement: number;
  winRate: number;
  lastMatchAt: string;
}

export interface ProLeaderboardTeamMember {
  name: string;
  matches: number;
  kills: number;
  avgDamage: number;
}

export interface ProLeaderboardTeamEntry {
  rank: number;
  teamKey: string;
  teamLabel: string;
  teamId: number | null;
  matches: number;
  wins: number;
  top4: number;
  kills: number;
  avgDamage: number;
  avgPlacement: number;
  winRate: number;
  roster: ProLeaderboardTeamMember[];
  lastMatchAt: string;
}

export interface ProLeaderboardSnapshot {
  tournamentId: string | null;
  tournamentLabel: string | null;
  sourceShard: string;
  matchesAnalyzed: number;
  fetchedAt: string;
  warning: string | null;
  players: ProLeaderboardPlayerEntry[];
  teams: ProLeaderboardTeamEntry[];
}

export interface ProParticipantRow {
  participantId: string;
  accountId: string | null;
  name: string;
  teamId: number | null;
  kills: number;
  assists: number;
  damage: number;
  winPlace: number;
  deathType: string;
}

export interface ProPlayerAccumulator {
  key: string;
  name: string;
  matches: number;
  wins: number;
  top4: number;
  kills: number;
  assists: number;
  deaths: number;
  damage: number;
  placementTotal: number;
  lastMatchAt: string;
  teamLabels: Map<string, number>;
}

export interface ProTeamMemberAccumulator {
  key: string;
  name: string;
  matches: number;
  kills: number;
  damage: number;
}

export interface ProTeamAccumulator {
  key: string;
  teamLabel: string;
  teamId: number | null;
  matches: number;
  wins: number;
  top4: number;
  kills: number;
  damage: number;
  placementTotal: number;
  lastMatchAt: string;
  roster: Map<string, ProTeamMemberAccumulator>;
}
