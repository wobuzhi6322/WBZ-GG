import { MAP_INTEL_MAPS } from "@/data/mapIntelMaps";
import type {
  MatchBlueZoneState,
  LeaderboardEntry,
  LeaderboardResponse,
  MatchDetailPayload,
  MatchKillActor,
  MatchKillLogEntry,
  MatchQueueFilter,
  MatchResponse,
  MatchRoutePoint,
  MatchSummary,
  PlayerEntity,
  ProParticipantRow,
  TelemetryCharacter,
  TelemetryEvent,
  TierInfo,
  UnknownRecord,
} from "@/entities/pubg/types";

const MODE_LABELS: Record<string, string> = {
  solo: "솔로",
  "solo-fpp": "솔로 (FPP)",
  duo: "듀오",
  "duo-fpp": "듀오 (FPP)",
  squad: "스쿼드",
  "squad-fpp": "스쿼드 (FPP)",
  "esports-squad-fpp": "e스포츠 스쿼드 (FPP)",
};

const MAP_LABELS: Record<string, string> = {
  Erangel_Main: "에란겔",
  Desert_Main: "미라마",
  Savage_Main: "사녹",
  DihorOtok_Main: "비켄디",
  Baltic_Main: "비켄디",
  Summerland_Main: "카라킨",
  Chimera_Main: "파라모",
  Tiger_Main: "태이고",
  Kiki_Main: "데스톤",
  Neon_Main: "론도",
  Heaven_Main: "헤이븐",
  Range_Main: "훈련장",
};

const MAP_INTEL_ID_BY_RAW_MAP: Record<string, string> = {
  Erangel_Main: "Baltic",
  Desert_Main: "Desert",
  Savage_Main: "Savage",
  DihorOtok_Main: "DihorOtok",
  Baltic_Main: "DihorOtok",
  Summerland_Main: "Summerland",
  Chimera_Main: "Chimera",
  Tiger_Main: "Tiger",
  Kiki_Main: "Kiki",
};

const PRIMARY_WEAPON_KEYS = [
  "mostDamageWeapon",
  "damageDealtMostDamageWeapon",
  "damageCausedMostDamageWeapon",
  "mostDamageWeaponName",
  "weaponMain",
  "weaponName",
  "killingWeapon",
  "topWeapon",
  "weaponUsedMost",
  "primaryWeapon",
  "mainWeapon",
] as const;

const WEAPON_NAME_OVERRIDES: Record<string, string> = {
  AKM: "AKM",
  AUG: "AUG",
  BerylM762: "Beryl M762",
  BIZONPP19: "PP-19 Bizon",
  DP28: "DP-28",
  G36C: "G36C",
  Kar98k: "Kar98k",
  M16A4: "M16A4",
  M249: "M249",
  M416: "M416",
  Mini14: "Mini 14",
  MK12: "Mk12",
  MK14: "Mk14",
  MosinNagant: "Mosin Nagant",
  QBU88: "QBU",
  QBZ95: "QBZ",
  SKS: "SKS",
  SLR: "SLR",
  UMP45: "UMP45",
  VSS: "VSS",
  Win94: "Win94",
};

export function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function toPercent(part: number, total: number): string {
  return ((part / Math.max(1, total)) * 100).toFixed(1);
}

export function formatModeLabel(mode: string): string {
  return MODE_LABELS[mode] ?? mode;
}

export function normalizeQueueType(rawMatchType: string): MatchSummary["queueType"] {
  const value = rawMatchType.trim().toLowerCase();
  if (value === "official") return "normal";
  if (value === "competitive") return "competitive";
  return "other";
}

export function formatQueueLabel(queueType: MatchSummary["queueType"]): string {
  if (queueType === "normal") return "일반전";
  if (queueType === "competitive") return "경쟁전";
  return "기타";
}

export function isQueueMatch(queueType: MatchSummary["queueType"], filter: MatchQueueFilter): boolean {
  if (filter === "all") return true;
  return queueType === filter;
}

export function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function pickFirstFiniteValue(stats: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const resolved = readFiniteNumber(stats[key]);
    if (resolved !== null) return resolved;
  }
  return null;
}

export function normalizeWeaponName(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return "-";

  const withoutPrefix = trimmed
    .replace(/^Item_Weapon_/i, "")
    .replace(/^Item_/i, "")
    .replace(/^Weap/i, "")
    .replace(/^Weapon_/i, "")
    .replace(/_C$/i, "")
    .replace(/_A$/i, "");

  const token = withoutPrefix.split("_").pop()?.trim() ?? "";
  if (!token) return "-";
  const lowerToken = token.toLowerCase();
  if (lowerToken === "none" || lowerToken === "unknown" || lowerToken === "null") return "-";
  if (WEAPON_NAME_OVERRIDES[token]) return WEAPON_NAME_OVERRIDES[token];

  const withNumericSpacing = token.replace(/([A-Za-z])(\d)/g, "$1 $2").replace(/(\d)([A-Za-z])/g, "$1 $2");
  return withNumericSpacing || token;
}

export function resolvePrimaryWeaponFromStats(stats: UnknownRecord): string {
  for (const key of PRIMARY_WEAPON_KEYS) {
    const rawValue = stats[key];
    if (typeof rawValue !== "string") continue;
    const normalized = normalizeWeaponName(rawValue);
    if (normalized !== "-") return normalized;
  }

  for (const [key, rawValue] of Object.entries(stats)) {
    if (typeof rawValue !== "string") continue;
    const lowerKey = key.toLowerCase();
    if (!lowerKey.includes("weapon")) continue;
    const normalized = normalizeWeaponName(rawValue);
    if (normalized !== "-") return normalized;
  }

  for (const rawValue of Object.values(stats)) {
    if (typeof rawValue !== "string") continue;
    if (!/(item_weapon_|weapon_|^weap)/i.test(rawValue)) continue;
    const normalized = normalizeWeaponName(rawValue);
    if (normalized !== "-") return normalized;
  }

  return "-";
}

export function extractTotalDistanceKm(stats: UnknownRecord): number {
  const walkDistance = pickFirstFiniteValue(stats, ["walkDistance"]) ?? 0;
  const rideDistance = pickFirstFiniteValue(stats, ["rideDistance"]) ?? 0;
  const swimDistance = pickFirstFiniteValue(stats, ["swimDistance"]) ?? 0;
  const totalMeters = walkDistance + rideDistance + swimDistance;
  const totalKm = totalMeters / 1000;
  return Number.isFinite(totalKm) && totalKm > 0 ? Number(totalKm.toFixed(2)) : 0;
}

export function extractLongestKillMeters(stats: UnknownRecord): number | null {
  const longestKill = pickFirstFiniteValue(stats, ["longestKill"]);
  if (longestKill === null || longestKill <= 0) return null;
  return Math.floor(longestKill);
}

export function extractDbnos(stats: UnknownRecord): number {
  const dbno = pickFirstFiniteValue(stats, ["dBNOs", "DBNOs", "dbnos", "knockouts"]) ?? 0;
  return Math.max(0, Math.round(dbno));
}

export function extractCompetitiveRankPointTotal(stats: UnknownRecord): number | null {
  const currentCandidates = [
    "currentRankPoint",
    "currentRankPoints",
    "rankPoint",
    "rankPoints",
    "competitiveRankPoint",
    "mmr",
  ];
  const currentValue = pickFirstFiniteValue(stats, currentCandidates);
  if (currentValue === null) return null;
  return Math.round(currentValue);
}

export function extractCompetitiveRankPointDelta(stats: UnknownRecord): number | null {
  const deltaCandidates = [
    "rankPointDelta",
    "rankPointsDelta",
    "rankPointsChange",
    "rpDelta",
    "mmrDelta",
    "competitiveRankPointDelta",
    "rankingPointDelta",
  ];
  const directValue = pickFirstFiniteValue(stats, deltaCandidates);
  if (directValue !== null) return Math.round(directValue);
  const previousCandidates = [
    "previousRankPoint",
    "previousRankPoints",
    "preRankPoint",
    "preRankPoints",
    "lastRankPoint",
    "beforeRankPoint",
    "startRankPoint",
  ];

  const currentValue = extractCompetitiveRankPointTotal(stats);
  const previousValue = pickFirstFiniteValue(stats, previousCandidates);
  if (currentValue === null || previousValue === null) return null;
  return Math.round(currentValue - previousValue);
}

export function formatMapName(raw: string): string {
  if (!raw) return "알 수 없는 맵";
  if (MAP_LABELS[raw]) return MAP_LABELS[raw];

  const key = raw.toLowerCase();
  if (key.includes("erangel")) return "에란겔";
  if (key.includes("desert")) return "미라마";
  if (key.includes("savage")) return "사녹";
  if (key.includes("vikendi") || key.includes("dihor")) return "비켄디";
  if (key.includes("kiki")) return "데스톤";
  if (key.includes("neon")) return "론도";
  if (key.includes("tiger")) return "태이고";
  if (key.includes("summer")) return "카라킨";
  if (key.includes("chimera")) return "파라모";
  if (key.includes("heaven")) return "헤이븐";
  return raw;
}

export function formatDuration(seconds: number): string {
  const minute = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${minute}분 ${sec.toString().padStart(2, "0")}초`;
}

export function formatMatchDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function resolveMapDetail(rawMapName: string): MatchDetailPayload["map"] {
  const mapId = MAP_INTEL_ID_BY_RAW_MAP[rawMapName] ?? null;
  const mapDefinition = mapId ? MAP_INTEL_MAPS.find((map) => map.id === mapId) ?? null : null;

  return {
    rawName: rawMapName,
    label: formatMapName(rawMapName),
    mapId: mapDefinition?.id ?? null,
    sizeKm: mapDefinition?.sizeKm ?? null,
    imageUrl: mapDefinition?.imageUrl ?? null,
  };
}

export function parseActor(raw: unknown): MatchKillActor | null {
  if (!raw || typeof raw !== "object") return null;
  const actor = raw as TelemetryCharacter;
  const accountId = typeof actor.accountId === "string" ? actor.accountId : null;
  const name =
    typeof actor.name === "string" && actor.name.trim().length > 0
      ? actor.name.trim()
      : accountId && accountId.trim().length > 0
        ? accountId.trim()
        : "UNKNOWN";

  const normalizedAccountId = accountId?.toLowerCase() ?? "";
  const actorType: MatchKillActor["actorType"] = normalizedAccountId.startsWith("ai.") || normalizedAccountId.startsWith("bot.")
    ? "bot"
    : normalizedAccountId.startsWith("account.")
      ? "player"
      : "unknown";

  return {
    accountId,
    name,
    teamId: typeof actor.teamId === "number" && Number.isFinite(actor.teamId) ? actor.teamId : null,
    actorType,
    isBot: actorType === "bot",
  };
}

export function isSameActor(actor: MatchKillActor | null, accountId?: string, playerName?: string): boolean {
  if (!actor) return false;
  if (accountId && actor.accountId === accountId) return true;
  if (playerName && actor.name.toLowerCase() === playerName.toLowerCase()) return true;
  return false;
}

export function parseLocation(event: TelemetryEvent): { x: number; y: number } | null {
  const candidates = [event.victim?.location, event.killer?.location, event.finisher?.location, event.attacker?.location, event.location];
  for (const location of candidates) {
    if (!location) continue;
    const x = Number(location.x);
    const y = Number(location.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
  }
  return null;
}

export function toMapPercent(
  x: number,
  y: number,
  sizeKm: number | null
): { xPercent: number | null; yPercent: number | null } {
  if (!sizeKm || !Number.isFinite(sizeKm) || sizeKm <= 0) {
    return { xPercent: null, yPercent: null };
  }

  const mapLengthInGameUnits = sizeKm * 1000 * 100;
  if (mapLengthInGameUnits <= 0) {
    return { xPercent: null, yPercent: null };
  }

  const xPercent = clamp((x / mapLengthInGameUnits) * 100, 0, 100);
  const yPercent = clamp((y / mapLengthInGameUnits) * 100, 0, 100);
  return { xPercent, yPercent };
}

export function extractTelemetryUrl(match: MatchResponse): string | null {
  const included = Array.isArray(match.included) ? match.included : [];

  for (const item of included) {
    if (item?.type !== "asset") continue;
    const urlCandidate =
      typeof item.attributes?.URL === "string"
        ? item.attributes.URL
        : typeof item.attributes?.url === "string"
          ? item.attributes.url
          : null;

    if (urlCandidate && urlCandidate.startsWith("http")) {
      return urlCandidate;
    }
  }

  return null;
}

export function getPlayerNameFromMatch(match: MatchResponse, accountId: string): string | null {
  const included = Array.isArray(match.included) ? match.included : [];
  for (const item of included) {
    if (item?.type !== "participant") continue;
    const stats = item.attributes?.stats;
    if (!stats || typeof stats !== "object") continue;
    const statsRecord = stats as UnknownRecord;
    if (statsRecord.playerId !== accountId) continue;
    const name = typeof statsRecord.name === "string" ? statsRecord.name.trim() : "";
    if (name.length > 0) return name;
  }
  return null;
}

export function normalizeKillLogs(
  matchId: string,
  mapSizeKm: number | null,
  events: TelemetryEvent[],
  accountId?: string,
  matchStartedAt?: string
): MatchKillLogEntry[] {
  const logs: MatchKillLogEntry[] = [];
  const baseTimestamp = parseTimestamp(matchStartedAt);

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const eventType = event?._T ?? "";
    if (eventType !== "LogPlayerKill" && eventType !== "LogPlayerKillV2") continue;

    const killer = parseActor(event.killer ?? event.finisher ?? event.attacker ?? null);
    const victim = parseActor(event.victim ?? null);
    const location = parseLocation(event);
    const { xPercent, yPercent } = location
      ? toMapPercent(location.x, location.y, mapSizeKm)
      : { xPercent: null, yPercent: null };

    logs.push({
      id: `${matchId}-${index}`,
      time: typeof event._D === "string" ? event._D : "",
      elapsedSec: (() => {
        const eventTs = parseTimestamp(typeof event._D === "string" ? event._D : "");
        if (!eventTs || !baseTimestamp || eventTs < baseTimestamp) return null;
        return Math.floor((eventTs - baseTimestamp) / 1000);
      })(),
      killer,
      victim,
      damageType:
        typeof event.damageTypeCategory === "string" && event.damageTypeCategory.length > 0
          ? event.damageTypeCategory
          : "Unknown",
      causer:
        typeof event.damageCauserName === "string" && event.damageCauserName.length > 0
          ? event.damageCauserName
          : "Unknown",
      x: location ? Number(location.x.toFixed(1)) : null,
      y: location ? Number(location.y.toFixed(1)) : null,
      xPercent: xPercent === null ? null : Number(xPercent.toFixed(4)),
      yPercent: yPercent === null ? null : Number(yPercent.toFixed(4)),
      isPlayerDeath: Boolean(accountId && victim?.accountId === accountId),
    });
  }

  return logs;
}

export function normalizeRoutePoints(
  matchId: string,
  mapSizeKm: number | null,
  events: TelemetryEvent[],
  accountId?: string,
  teammateAccountIds: Set<string> = new Set(),
  teammateNames: Set<string> = new Set(),
  matchStartedAt?: string
): MatchRoutePoint[] {
  const points: MatchRoutePoint[] = [];
  const baseTimestamp = parseTimestamp(matchStartedAt);
  let positionEventIndex = 0;

  for (const event of events) {
    if (event?._T !== "LogPlayerPosition") continue;
    if (event.common?.isGame !== undefined && Number(event.common.isGame) !== 1) continue;

    const actor = event.character ?? null;
    if (!actor || typeof actor !== "object") continue;

    const location = actor.location;
    if (!location) continue;
    const x = readFiniteNumber(location.x);
    const y = readFiniteNumber(location.y);
    if (x === null || y === null) continue;

    const actorAccountId = typeof actor.accountId === "string" && actor.accountId.trim().length > 0
      ? actor.accountId.trim()
      : null;
    const actorName = typeof actor.name === "string" && actor.name.trim().length > 0
      ? actor.name.trim()
      : actorAccountId ?? "UNKNOWN";
    const teamId = typeof actor.teamId === "number" && Number.isFinite(actor.teamId) ? actor.teamId : null;
    const actorNameKey = actorName.toLowerCase();
    const isSelf =
      Boolean(accountId && actorAccountId && actorAccountId === accountId) ||
      Boolean(accountId && !actorAccountId && actorNameKey === String(accountId).toLowerCase());
    const isTeammate =
      !isSelf &&
      (Boolean(actorAccountId && teammateAccountIds.has(actorAccountId)) || teammateNames.has(actorNameKey));

    const { xPercent, yPercent } = toMapPercent(x, y, mapSizeKm);
    const eventTime = typeof event._D === "string" ? event._D : "";
    const eventTs = parseTimestamp(eventTime);
    const elapsedSec =
      eventTs && baseTimestamp && eventTs >= baseTimestamp
        ? Math.floor((eventTs - baseTimestamp) / 1000)
        : null;

    points.push({
      id: `${matchId}-route-${positionEventIndex}`,
      time: eventTime,
      elapsedSec,
      actorAccountId,
      actorName,
      teamId,
      isSelf,
      isTeammate,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      xPercent: xPercent === null ? null : Number(xPercent.toFixed(4)),
      yPercent: yPercent === null ? null : Number(yPercent.toFixed(4)),
    });
    positionEventIndex += 1;
  }

  return points;
}

export function normalizeBlueZoneStates(
  matchId: string,
  mapSizeKm: number | null,
  events: TelemetryEvent[],
  matchStartedAt?: string
): MatchBlueZoneState[] {
  const states: MatchBlueZoneState[] = [];
  const baseTimestamp = parseTimestamp(matchStartedAt);
  let index = 0;

  for (const event of events) {
    if (event?._T !== "LogGameStatePeriodic") continue;
    const state = event.gameState;
    if (!state || typeof state !== "object") continue;
    const position = state.safetyZonePosition;
    if (!position || typeof position !== "object") continue;

    const x = readFiniteNumber(position.x);
    const y = readFiniteNumber(position.y);
    const radius = readFiniteNumber(state.safetyZoneRadius);
    if (x === null || y === null || radius === null || radius <= 0) continue;

    const { xPercent, yPercent } = toMapPercent(x, y, mapSizeKm);
    const eventTime = typeof event._D === "string" ? event._D : "";
    const eventTs = parseTimestamp(eventTime);
    const elapsedSec =
      eventTs && baseTimestamp && eventTs >= baseTimestamp
        ? Math.floor((eventTs - baseTimestamp) / 1000)
        : null;

    states.push({
      id: `${matchId}-blue-${index}`,
      time: eventTime,
      elapsedSec,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      radius: Number(radius.toFixed(1)),
      xPercent: xPercent === null ? null : Number(xPercent.toFixed(4)),
      yPercent: yPercent === null ? null : Number(yPercent.toFixed(4)),
    });
    index += 1;
  }

  return states;
}

export function pickPrimaryMode(
  modeStats: Record<string, UnknownRecord> | undefined
): { mode: string; stats: UnknownRecord } | null {
  if (!modeStats) return null;

  const preferredOrder = [
    "squad-fpp",
    "squad",
    "duo-fpp",
    "duo",
    "solo-fpp",
    "solo",
    "esports-squad-fpp",
  ];

  const validEntries = Object.entries(modeStats).filter(([, stats]) => {
    return safeNumber(stats?.roundsPlayed) > 0;
  });

  if (validEntries.length === 0) return null;

  for (const mode of preferredOrder) {
    const stats = modeStats[mode];
    if (stats && safeNumber(stats.roundsPlayed) > 0) {
      return { mode, stats };
    }
  }

  const [mode, stats] = validEntries.sort((a, b) => {
    return safeNumber(b[1].roundsPlayed) - safeNumber(a[1].roundsPlayed);
  })[0];

  return { mode, stats };
}

export function extractSeasonNumber(seasonId: string): number | null {
  const normalized = seasonId.trim();
  if (!normalized) return null;

  const patterns = [
    /(?:^|[^a-z0-9])s(\d{1,3})(?:$|[^a-z0-9])/i,
    /(?:pc|xbox|psn)-\d{4}-(\d{1,3})$/i,
    /(?:^|[^a-z0-9])season[-_]?(\d{1,3})(?:$|[^a-z0-9])/i,
    /(\d{1,3})$/,
  ];

  for (const pattern of patterns) {
    const matched = normalized.match(pattern);
    if (!matched) continue;
    const parsed = Number.parseInt(matched[1], 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

export function buildSeasonLabel(seasonId: string, seasonNumber: number | null): string {
  if (seasonNumber !== null) {
    if (seasonNumber >= 3 && seasonNumber <= 6) return `생존 시즌 ${seasonNumber}`;
    if (seasonNumber >= 7) return `경쟁전 시즌 ${seasonNumber}`;
    return `시즌 ${seasonNumber}`;
  }
  return seasonId;
}

export function parseMatchIds(player: PlayerEntity | null): string[] {
  if (!player?.relationships?.matches?.data) return [];
  return player.relationships.matches.data
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));
}

export function getTierFromRp(rp: number): TierInfo {
  if (!Number.isFinite(rp) || rp <= 0) {
    return {
      name: "언랭크",
      color: "text-zinc-300",
      border: "border-zinc-400",
      colorHex: "#a1a1aa",
      imageUrl: "/ranks/unranked.jpg",
    };
  }

  if (rp < 1500) {
    return {
      name: "브론즈",
      color: "text-amber-600",
      border: "border-amber-600",
      colorHex: "#d97706",
      imageUrl: "/ranks/bronze.jpg",
    };
  }
  if (rp < 2000) {
    return {
      name: "실버",
      color: "text-slate-300",
      border: "border-slate-300",
      colorHex: "#cbd5e1",
      imageUrl: "/ranks/silver.jpg",
    };
  }
  if (rp < 2500) {
    return {
      name: "골드",
      color: "text-yellow-400",
      border: "border-yellow-400",
      colorHex: "#facc15",
      imageUrl: "/ranks/gold.jpg",
    };
  }
  if (rp < 3000) {
    return {
      name: "플레티넘",
      color: "text-cyan-400",
      border: "border-cyan-400",
      colorHex: "#22d3ee",
      imageUrl: "/ranks/platinum.jpg",
    };
  }
  if (rp < 3400) {
    return {
      name: "크리스탈",
      color: "text-sky-300",
      border: "border-sky-300",
      colorHex: "#7dd3fc",
      imageUrl: "/ranks/crystal.jpg",
    };
  }
  if (rp < 3800) {
    return {
      name: "다이아몬드",
      color: "text-blue-400",
      border: "border-blue-400",
      colorHex: "#60a5fa",
      imageUrl: "/ranks/diamond.jpg",
    };
  }
  if (rp < 4300) {
    return {
      name: "마스터",
      color: "text-purple-400",
      border: "border-purple-400",
      colorHex: "#c084fc",
      imageUrl: "/ranks/master.jpg",
    };
  }
  return {
    name: "서바이버",
    color: "text-rose-400",
    border: "border-rose-400",
    colorHex: "#fb7185",
    imageUrl: "/ranks/survivor.png",
  };
}

export function normalizeLeaderboardEntries(data: LeaderboardResponse | null, limit: number): LeaderboardEntry[] {
  if (!data?.included?.length) return [];

  const entries = data.included.map((player) => {
    const stats = player.attributes?.stats ?? {};
    const kills = safeNumber(stats.kills);
    const assists = safeNumber(stats.assists);
    const deaths = safeNumber(stats.deaths);
    const wins = safeNumber(stats.wins);
    const games = safeNumber(stats.games);
    const winRatioCandidate = Number((stats as Record<string, unknown>).winRatio);
    const computedWinRate = (wins / Math.max(1, games)) * 100;
    const winRate = Number.isFinite(winRatioCandidate) && winRatioCandidate > 0 ? winRatioCandidate : computedWinRate;

    return {
      rank: safeNumber(player.attributes?.rank),
      name: player.attributes?.name ?? "Unknown",
      accountId: typeof player.id === "string" && player.id.trim().length > 0 ? player.id.trim() : null,
      rp: safeNumber(stats.rankPoints),
      kills,
      wins,
      games,
      winRate: Number(winRate.toFixed(2)),
      kda: ((kills + assists) / Math.max(1, deaths)).toFixed(2),
    };
  });

  return entries
    .sort((a, b) => {
      if (a.rank === b.rank) return b.rp - a.rp;
      if (a.rank === 0) return 1;
      if (b.rank === 0) return -1;
      return a.rank - b.rank;
    })
    .slice(0, limit);
}

export function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function pickLatestDateIso(current: string, candidate: string): string {
  if (!current) return candidate;
  if (!candidate) return current;
  return parseTimestamp(candidate) > parseTimestamp(current) ? candidate : current;
}

export function extractTeamTagFromName(name: string): string | null {
  const token = name.trim().split(/[_\s-]/)[0] ?? "";
  if (token.length < 2 || token.length > 8) return null;
  if (!/[A-Za-z]/.test(token)) return null;
  if (!/^[A-Za-z0-9]+$/.test(token)) return null;
  return token.toUpperCase();
}

export function resolveProTeamLabel(participants: ProParticipantRow[], fallbackTeamId: number | null): string {
  const counts = new Map<string, number>();

  for (const participant of participants) {
    const tag = extractTeamTagFromName(participant.name);
    if (!tag) continue;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  const primaryTag = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  if (primaryTag) return primaryTag;
  if (fallbackTeamId !== null) return `TEAM-${fallbackTeamId}`;
  return "TEAM-UNKNOWN";
}

export function resolvePrimaryTeamLabel(labels: Map<string, number>): string {
  const top = Array.from(labels.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  return top ?? "-";
}

export function toProParticipantRow(item: NonNullable<MatchResponse["included"]>[number]): ProParticipantRow | null {
  if (item.type !== "participant") return null;
  const participantId = typeof item.id === "string" ? item.id : "";
  const stats = item.attributes?.stats;
  if (!participantId || !stats || typeof stats !== "object") return null;

  const statsRecord = stats as UnknownRecord;
  const name = typeof statsRecord.name === "string" ? statsRecord.name.trim() : "";
  if (!name) return null;

  const teamIdRaw = safeNumber(statsRecord.teamId);
  return {
    participantId,
    accountId: typeof statsRecord.playerId === "string" ? statsRecord.playerId : null,
    name,
    teamId: teamIdRaw > 0 ? teamIdRaw : null,
    kills: safeNumber(statsRecord.kills),
    assists: safeNumber(statsRecord.assists),
    damage: safeNumber(statsRecord.damageDealt),
    winPlace: safeNumber(statsRecord.winPlace),
    deathType: typeof statsRecord.deathType === "string" ? statsRecord.deathType : "",
  };
}
