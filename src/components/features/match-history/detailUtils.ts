import type {
  DetailLogFilter,
  MatchBlueZoneState,
  MatchDetailPayload,
  MatchItem,
  MatchKillActor,
  MatchRoutePoint,
  SortKey,
} from "@/components/features/match-history/types";
import type { MapIntelDefinition } from "@/data/mapIntelMaps";
import type { MatchHistoryUi } from "@/components/features/match-history/i18n";
import { getIconPath, getWeaponInfo } from "@/lib/telemetryAssets";

export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampPanOffset(
  panX: number,
  panY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  if (zoom <= 1 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { x: 0, y: 0 };
  }

  const maxX = (viewportWidth * (zoom - 1)) / 2;
  const maxY = (viewportHeight * (zoom - 1)) / 2;
  return {
    x: clampValue(panX, -maxX, maxX),
    y: clampValue(panY, -maxY, maxY),
  };
}

export function resolveMiniMapTileZoom(map: MapIntelDefinition, zoomLevel: number): number {
  const minZoom = map.tileMinZoom;
  const maxZoom = map.tileMaxZoom;
  if (maxZoom <= minZoom) return minZoom;

  const normalizedZoom = clampValue((zoomLevel - 1) / 2, 0, 1);
  return minZoom + Math.round(normalizedZoom * (maxZoom - minZoom));
}

export function formatTelemetryTime(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("ko-KR", { hour12: false });
}

export function formatMeters(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${Math.round(value / 100)}m`;
}

export function parseCreatedAt(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortMatches(items: MatchItem[], sortKey: SortKey): MatchItem[] {
  const copied = [...items];
  copied.sort((a, b) => {
    if (sortKey === "latest") return parseCreatedAt(b.createdAt) - parseCreatedAt(a.createdAt);
    if (sortKey === "kills") return b.kills - a.kills || b.damage - a.damage;
    if (sortKey === "damage") return b.damage - a.damage || b.kills - a.kills;
    return (a.placement ?? 999) - (b.placement ?? 999);
  });
  return copied;
}

export function isMyActor(actor: MatchKillActor | null, accountId?: string, playerName?: string): boolean {
  if (!actor) return false;
  if (accountId && actor.accountId === accountId) return true;
  if (playerName && actor.name.toLowerCase() === playerName.toLowerCase()) return true;
  return false;
}

export function getQuadrantLabel(xPercent: number | null, yPercent: number | null): "NW" | "NE" | "SW" | "SE" | null {
  if (xPercent === null || yPercent === null) return null;
  if (xPercent < 50 && yPercent < 50) return "NW";
  if (xPercent >= 50 && yPercent < 50) return "NE";
  if (xPercent < 50 && yPercent >= 50) return "SW";
  return "SE";
}

export function getActorTypeLabel(actor: MatchKillActor | null, language: "ko" | "en" | "ja" | "zh"): string {
  if (!actor) {
    return language === "en" ? "Unknown" : language === "ja" ? "不明" : language === "zh" ? "未知" : "알 수 없음";
  }
  if (actor.actorType === "bot") {
    return language === "en" ? "Bot" : language === "ja" ? "Bot" : language === "zh" ? "机器人" : "봇";
  }
  if (actor.actorType === "player") {
    return language === "en" ? "Player" : language === "ja" ? "プレイヤー" : language === "zh" ? "玩家" : "유저";
  }
  return language === "en" ? "Unknown" : language === "ja" ? "不明" : language === "zh" ? "未知" : "알 수 없음";
}

export function getActorTypeClass(actor: MatchKillActor | null): string {
  if (!actor) return "border-white/20 bg-white/10 text-wbz-mute";
  if (actor.actorType === "bot") return "border-amber-300/50 bg-amber-500/10 text-amber-200";
  if (actor.actorType === "player") return "border-cyan-300/50 bg-cyan-500/10 text-cyan-200";
  return "border-white/20 bg-white/10 text-wbz-mute";
}

export function filterDetailLogs(
  detailFilter: DetailLogFilter,
  selectedDetail: MatchDetailPayload | null,
  playerCombatLogs: MatchDetailPayload["killLogs"],
  myKillLogs: MatchDetailPayload["killLogs"],
  myDeathLogs: MatchDetailPayload["killLogs"],
) {
  if (!selectedDetail) return [];
  if (detailFilter === "myCombat") return playerCombatLogs;
  if (detailFilter === "myKills") return myKillLogs;
  if (detailFilter === "myDeath") return myDeathLogs;
  return selectedDetail.killLogs;
}

export function buildReplayDuration(detail: MatchDetailPayload | null): number {
  if (!detail) return 0;

  const values: number[] = [];
  if (typeof detail.durationSec === "number" && Number.isFinite(detail.durationSec)) {
    values.push(Math.max(0, Math.round(detail.durationSec)));
  }

  for (const log of detail.killLogs) {
    if (typeof log.elapsedSec === "number" && Number.isFinite(log.elapsedSec)) {
      values.push(Math.max(0, Math.round(log.elapsedSec)));
    }
  }

  for (const point of detail.routePoints ?? []) {
    if (typeof point.elapsedSec === "number" && Number.isFinite(point.elapsedSec)) {
      values.push(Math.max(0, Math.round(point.elapsedSec)));
    }
  }

  for (const state of detail.blueZoneStates ?? []) {
    if (typeof state.elapsedSec === "number" && Number.isFinite(state.elapsedSec)) {
      values.push(Math.max(0, Math.round(state.elapsedSec)));
    }
  }

  return values.length ? Math.max(...values) : 0;
}

export function buildCauserBadgeText(causer: string): string | null {
  const norm = causer.toLowerCase();

  if (norm.includes("bluezone") || norm.includes("groggy")) return "[기절/블루존]";
  if (norm.includes("falling")) return "[낙사/충돌]";
  if (
    norm.includes("vehicle") ||
    norm.includes("uaz") ||
    norm.includes("dacia") ||
    norm.includes("buggy") ||
    norm.includes("motorcycle") ||
    norm.includes("mirado") ||
    norm.includes("pony") ||
    norm.includes("pickup") ||
    norm.includes("rhib") ||
    norm.includes("aquarail") ||
    norm.includes("pg117")
  ) {
    return "[차량 사고]";
  }
  if (norm.includes("punch") || norm.includes("melee")) return "[주먹/근접]";
  if (norm.includes("drown")) return "[익사]";
  if (norm.includes("redzone")) return "[레드존]";
  if (norm.includes("bleed") || norm.includes("deathdrop")) return "[출혈/추락]";
  if (
    norm.includes("explosion") ||
    norm.includes("grenade") ||
    norm.includes("molotov") ||
    norm.includes("c4") ||
    norm.includes("panzerfaust")
  ) {
    return null;
  }
  return null;
}

export function buildCauserFallback(causer: string, ui: MatchHistoryUi): string {
  if (!causer || causer === "Unknown" || causer === "-") {
    return `[${ui.unknown}]`;
  }
  return `[${causer}]`;
}

export function getCauserImage(causer: string): string {
  return getIconPath(causer, "weapon");
}

export function getPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export function summarizeTeam(selectedMatch: MatchItem | null) {
  if (!selectedMatch) return null;

  const teammateKills = selectedMatch.teammates.reduce((sum, teammate) => sum + teammate.kills, 0);
  const teammateDamage = selectedMatch.teammates.reduce((sum, teammate) => sum + teammate.damage, 0);
  const sortedTeammates = [...selectedMatch.teammates].sort((a, b) => b.kills - a.kills || b.damage - a.damage);

  return {
    memberCount: selectedMatch.teammates.length + 1,
    teamKills: selectedMatch.kills + teammateKills,
    teamDamage: selectedMatch.damage + teammateDamage,
    topTeammate: sortedTeammates[0] ?? null,
  };
}

export function getFirstCombatLog(logs: MatchDetailPayload["killLogs"]) {
  if (logs.length === 0) return null;
  const copied = [...logs].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  return copied[0] ?? null;
}

export function getWeaponBreakdown(
  myKillLogs: MatchDetailPayload["killLogs"],
  filteredDetailLogs: MatchDetailPayload["killLogs"],
  unknownLabel: string,
) {
  const targetLogs = myKillLogs.length > 0 ? myKillLogs : filteredDetailLogs;
  const map = new Map<string, number>();
  for (const log of targetLogs) {
    const weaponInfo = getWeaponInfo(log.causer);
    const key = weaponInfo.name || unknownLabel;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([weapon, count]) => ({ weapon, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function getZoneBreakdown(
  playerCombatLogs: MatchDetailPayload["killLogs"],
  filteredDetailLogs: MatchDetailPayload["killLogs"],
) {
  const targetLogs = playerCombatLogs.length > 0 ? playerCombatLogs : filteredDetailLogs;
  const map = new Map<string, number>();
  for (const log of targetLogs) {
    const zone = getQuadrantLabel(log.xPercent, log.yPercent);
    if (!zone) continue;
    map.set(zone, (map.get(zone) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildTeammateIdentity(selectedMatch: MatchItem | null) {
  const accountIds = new Set<string>();
  const names = new Set<string>();
  const teamIds = new Set<number>();
  if (!selectedMatch) return { accountIds, names, teamIds };

  for (const teammate of selectedMatch.teammates) {
    if (teammate.accountId && teammate.accountId.trim().length > 0) {
      accountIds.add(teammate.accountId.trim());
    }
    if (teammate.name && teammate.name.trim().length > 0) {
      names.add(teammate.name.trim().toLowerCase());
    }
    if (typeof teammate.teamId === "number" && Number.isFinite(teammate.teamId)) {
      teamIds.add(teammate.teamId);
    }
  }

  return { accountIds, names, teamIds };
}

export function getPageInfoText(
  language: "ko" | "en" | "ja" | "zh",
  pageSize: number,
  pageInfo: string,
): string {
  if (language === "en") return `${pageSize} matches per page · ${pageInfo}`;
  if (language === "ja") return `1ページ ${pageSize}試合 · ${pageInfo}`;
  if (language === "zh") return `每页 ${pageSize} 场 · ${pageInfo}`;
  return `페이지당 ${pageSize}경기 · ${pageInfo}`;
}
