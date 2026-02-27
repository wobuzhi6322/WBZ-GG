"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Filter,
  Loader2,
  ShieldX,
  X,
} from "lucide-react";
import { MatchHistoryItem } from "@/components/features/match-history/MatchHistoryItem";
import { MATCH_HISTORY_GRID_TEMPLATE } from "@/components/features/match-history/layout";
import type { MatchBotStatsItem, MatchItem, PlatformType } from "@/components/features/match-history/types";
import { formatKillLabelWithBot } from "@/components/features/match-history/utils";
import { useLanguage } from "@/context/LanguageContext";
import { MAP_INTEL_MAPS, MapIntelDefinition } from "@/data/mapIntelMaps";

interface MatchKillActor {
  accountId: string | null;
  name: string;
  teamId: number | null;
  actorType: "player" | "bot" | "unknown";
  isBot: boolean;
}

interface MatchKillLogEntry {
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

interface MatchRoutePoint {
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

interface MatchBlueZoneState {
  id: string;
  time: string;
  elapsedSec: number | null;
  x: number | null;
  y: number | null;
  radius: number | null;
  xPercent: number | null;
  yPercent: number | null;
}

interface MatchDetailPayload {
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

interface MatchBotStatsResponse {
  accountId: string;
  items: MatchBotStatsItem[];
  failedMatchIds?: string[];
  fetchedAt: string;
}

interface MiniMapMarker {
  id: string;
  elapsedSec: number | null;
  xPercent: number;
  yPercent: number;
  active: boolean;
  tone: "death" | "kill" | "teamKill" | "neutral";
}

interface MatchHistoryProps {
  matches: MatchItem[];
  accountId?: string;
  playerName?: string;
  platform?: PlatformType;
  refreshToken?: string;
}

type StatusFilter = "all" | MatchItem["status"];
type SortKey = "latest" | "kills" | "damage" | "placement";
type DetailLogFilter = "all" | "myCombat" | "myKills" | "myDeath";

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampPanOffset(
  panX: number,
  panY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number
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

function resolveMiniMapTileZoom(map: MapIntelDefinition, zoomLevel: number): number {
  const minZoom = map.tileMinZoom;
  const maxZoom = map.tileMaxZoom;
  if (maxZoom <= minZoom) return minZoom;

  const normalizedZoom = clampValue((zoomLevel - 1) / 2, 0, 1);
  return minZoom + Math.round(normalizedZoom * (maxZoom - minZoom));
}

function formatTelemetryTime(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("ko-KR", { hour12: false });
}

function formatMeters(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${Math.round(value / 100)}m`;
}

function parseCreatedAt(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortMatches(items: MatchItem[], sortKey: SortKey): MatchItem[] {
  const copied = [...items];
  copied.sort((a, b) => {
    if (sortKey === "latest") return parseCreatedAt(b.createdAt) - parseCreatedAt(a.createdAt);
    if (sortKey === "kills") return b.kills - a.kills || b.damage - a.damage;
    if (sortKey === "damage") return b.damage - a.damage || b.kills - a.kills;
    return (a.placement ?? 999) - (b.placement ?? 999);
  });
  return copied;
}

function isMyActor(actor: MatchKillActor | null, accountId?: string, playerName?: string): boolean {
  if (!actor) return false;
  if (accountId && actor.accountId === accountId) return true;
  if (playerName && actor.name.toLowerCase() === playerName.toLowerCase()) return true;
  return false;
}

function getQuadrantLabel(xPercent: number | null, yPercent: number | null): "NW" | "NE" | "SW" | "SE" | null {
  if (xPercent === null || yPercent === null) return null;
  if (xPercent < 50 && yPercent < 50) return "NW";
  if (xPercent >= 50 && yPercent < 50) return "NE";
  if (xPercent < 50 && yPercent >= 50) return "SW";
  return "SE";
}

function getActorTypeLabel(actor: MatchKillActor | null, language: "ko" | "en" | "ja" | "zh"): string {
  const unknown =
    language === "en" ? "Unknown" : language === "ja" ? "不明" : language === "zh" ? "未知" : "미확인";
  const bot = language === "en" ? "Bot" : language === "ja" ? "ボット" : language === "zh" ? "机器人" : "봇";
  const player =
    language === "en" ? "Player" : language === "ja" ? "プレイヤー" : language === "zh" ? "玩家" : "유저";
  if (!actor) return unknown;
  if (actor.actorType === "bot") return bot;
  if (actor.actorType === "player") return player;
  return unknown;
}

function getActorTypeClass(actor: MatchKillActor | null): string {
  if (!actor) return "border-white/20 bg-white/10 text-wbz-mute";
  if (actor.actorType === "bot") return "border-amber-300/50 bg-amber-500/10 text-amber-200";
  if (actor.actorType === "player") return "border-cyan-300/50 bg-cyan-500/10 text-cyan-200";
  return "border-white/20 bg-white/10 text-wbz-mute";
}

export default function MatchHistory({
  matches,
  accountId,
  playerName,
  platform = "steam",
  refreshToken = "",
}: MatchHistoryProps) {
  const { t, language } = useLanguage();
  const ui = useMemo(() => {
    if (language === "en") {
      return {
        noRecent: "No recent match history.",
        noFiltered: "No matches match the current filter.",
        pageInfo: "15 matches per page · last 6 months",
        prev: "Prev",
        next: "Next",
        detailTitle: "Match Detail",
        loadingTelemetry: "Analyzing match telemetry...",
        noDetail: "No match detail data.",
        teamTitle: "Teammates",
        soloNotice: "Solo match or no teammate information.",
        teamMembers: "Team Members",
        teamKills: "Team Kills",
        teamDamage: "Team Damage",
        firstCombat: "First Combat",
        botKills: "Bot Kills",
        playerKills: "Player Kills",
        unknownKills: "Unknown Kills",
        events: "Events",
        memberUnit: "",
        ace: "Ace",
        myDeathLog: "My Death Log",
        unknown: "Unknown",
        pause: "Pause",
        play: "Play",
        selectedEvent: "Selected Event",
        mapOptions: "Map Overlay Options",
        bluezone: "Bluezone",
        route: "Route",
        allLog: "All",
        myCombat: "My Combat",
        myKills: "My Kills",
        myDeaths: "My Deaths",
        noLogs: "No logs for this filter.",
        weaponUsage: "Weapon Usage",
        noWeaponLogs: "No weapon logs.",
        hitZone: "Combat Zone",
        noLocationLogs: "No location logs.",
        mapOverlayUnsupported: "This map does not support detailed overlay.",
        miniMapZoomOut: "Minimap zoom out",
        miniMapZoomIn: "Minimap zoom in",
        miniMapGuide: "Wheel zoom / drag to move",
        zoneLabels: { NW: "North-West", NE: "North-East", SW: "South-West", SE: "South-East" } as const,
      };
    }
    if (language === "ja") {
      return {
        noRecent: "最近のマッチ履歴がありません。",
        noFiltered: "現在のフィルターに一致する試合がありません。",
        pageInfo: "1ページ15試合 · 直近6か月",
        prev: "前へ",
        next: "次へ",
        detailTitle: "詳細戦績",
        loadingTelemetry: "マッチテレメトリ分析中...",
        noDetail: "マッチ詳細データがありません。",
        teamTitle: "一緒にプレイしたチーム",
        soloNotice: "ソロプレイ、またはチーム情報がありません。",
        teamMembers: "チーム人数",
        teamKills: "チームキル",
        teamDamage: "チームダメージ",
        firstCombat: "初回交戦",
        botKills: "ボットキル",
        playerKills: "プレイヤーキル",
        unknownKills: "不明キル",
        events: "イベント",
        memberUnit: "名",
        ace: "エース",
        myDeathLog: "自分の死亡ログ",
        unknown: "不明",
        pause: "一時停止",
        play: "再生",
        selectedEvent: "選択イベント",
        mapOptions: "マップ表示オプション",
        bluezone: "ブルーゾーン",
        route: "移動ルート",
        allLog: "全体",
        myCombat: "自分の交戦",
        myKills: "自分のキル",
        myDeaths: "自分のデス",
        noLogs: "該当ログがありません。",
        weaponUsage: "武器使用頻度",
        noWeaponLogs: "集計可能なログがありません。",
        hitZone: "交戦ヒートゾーン",
        noLocationLogs: "位置ログがありません。",
        mapOverlayUnsupported: "このマップは詳細オーバーレイに対応していません。",
        miniMapZoomOut: "ミニマップ縮小",
        miniMapZoomIn: "ミニマップ拡大",
        miniMapGuide: "ホイールで拡大/縮小、ドラッグで移動",
        zoneLabels: { NW: "北西", NE: "北東", SW: "南西", SE: "南東" } as const,
      };
    }
    if (language === "zh") {
      return {
        noRecent: "暂无最近比赛记录。",
        noFiltered: "没有符合当前筛选条件的比赛。",
        pageInfo: "每页15场 · 最近6个月",
        prev: "上一页",
        next: "下一页",
        detailTitle: "详细战绩",
        loadingTelemetry: "正在分析比赛遥测数据...",
        noDetail: "暂无比赛详细数据。",
        teamTitle: "同队玩家",
        soloNotice: "单排或无队友信息。",
        teamMembers: "队伍人数",
        teamKills: "队伍击杀",
        teamDamage: "队伍伤害",
        firstCombat: "首次交战",
        botKills: "机器人击杀",
        playerKills: "玩家击杀",
        unknownKills: "未知击杀",
        events: "事件",
        memberUnit: "人",
        ace: "王牌",
        myDeathLog: "我的死亡日志",
        unknown: "未知",
        pause: "暂停",
        play: "播放",
        selectedEvent: "选中事件",
        mapOptions: "地图显示选项",
        bluezone: "蓝圈",
        route: "移动路线",
        allLog: "全部",
        myCombat: "我的交战",
        myKills: "我的击杀",
        myDeaths: "我的死亡",
        noLogs: "没有符合条件的日志。",
        weaponUsage: "武器使用频率",
        noWeaponLogs: "没有可统计日志。",
        hitZone: "交战热区",
        noLocationLogs: "没有位置日志。",
        mapOverlayUnsupported: "当前地图不支持详细叠加层。",
        miniMapZoomOut: "小地图缩小",
        miniMapZoomIn: "小地图放大",
        miniMapGuide: "滚轮缩放，拖拽移动",
        zoneLabels: { NW: "西北", NE: "东北", SW: "西南", SE: "东南" } as const,
      };
    }
    return {
      noRecent: "최근 매치 기록이 없습니다.",
      noFiltered: "현재 필터 조건과 일치하는 매치가 없습니다.",
      pageInfo: "페이지당 15경기 · 최근 6개월 전적",
      prev: "이전",
      next: "다음",
      detailTitle: "세부 전적",
      loadingTelemetry: "매치 텔레메트리 분석 중...",
      noDetail: "매치 상세 데이터가 없습니다.",
      teamTitle: "같이 플레이한 팀원",
      soloNotice: "단독 플레이 또는 팀원 정보가 없습니다.",
      teamMembers: "팀 인원",
      teamKills: "팀 총 킬",
      teamDamage: "팀 총 딜",
      firstCombat: "첫 교전",
      botKills: "봇 킬",
      playerKills: "유저 킬",
      unknownKills: "미확인 킬",
      events: "이벤트",
      memberUnit: "명",
      ace: "에이스",
      myDeathLog: "내 사망 로그",
      unknown: "알 수 없음",
      pause: "일시정지",
      play: "재생",
      selectedEvent: "선택 이벤트",
      mapOptions: "맵 표시 옵션",
      bluezone: "자기장(Bluezone)",
      route: "이동 동선(Route)",
      allLog: "전체",
      myCombat: "내 교전",
      myKills: "내 킬",
      myDeaths: "내 데스",
      noLogs: "해당 조건의 로그가 없습니다.",
      weaponUsage: "무기 사용 빈도",
      noWeaponLogs: "집계 가능한 로그가 없습니다.",
      hitZone: "교전 히트존",
      noLocationLogs: "위치 로그가 없습니다.",
      mapOverlayUnsupported: "현재 맵은 상세 지도 오버레이를 지원하지 않습니다.",
      miniMapZoomOut: "미니맵 축소",
      miniMapZoomIn: "미니맵 확대",
      miniMapGuide: "휠 확대/축소, 드래그 이동",
      zoneLabels: { NW: "북서", NE: "북동", SW: "남서", SE: "남동" } as const,
    };
  }, [language]);
  const PAGE_SIZE = 15;
  const BOT_STATS_BATCH_SIZE = 4;
  const [mapFilter, setMapFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [activeKillId, setActiveKillId] = useState<string | null>(null);
  const [detailLogFilter, setDetailLogFilter] = useState<DetailLogFilter>("all");
  const [detailCache, setDetailCache] = useState<Record<string, MatchDetailPayload>>({});
  const [botStatsByMatchId, setBotStatsByMatchId] = useState<Record<string, MatchBotStatsItem>>({});
  const [botStatsLoadingByMatchId, setBotStatsLoadingByMatchId] = useState<Record<string, boolean>>({});
  const [botStatsFailedByMatchId, setBotStatsFailedByMatchId] = useState<Record<string, boolean>>({});
  const [showRoute, setShowRoute] = useState(true);
  const [showBlueZone, setShowBlueZone] = useState(true);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);
  const [replayTimeSec, setReplayTimeSec] = useState(0);

  const sixMonthsAgoTimestamp = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return date.getTime();
  }, []);

  const sixMonthMatches = useMemo(() => {
    const filtered = matches.filter((match) => parseCreatedAt(match.createdAt) >= sixMonthsAgoTimestamp);
    return sortMatches(filtered, "latest");
  }, [matches, sixMonthsAgoTimestamp]);

  const mapOptions = useMemo(() => Array.from(new Set(sixMonthMatches.map((match) => match.map))), [sixMonthMatches]);
  const modeOptions = useMemo(() => Array.from(new Set(sixMonthMatches.map((match) => match.mode))).slice(0, 8), [sixMonthMatches]);

  useEffect(() => {
    if (mapFilter !== "all" && !mapOptions.includes(mapFilter)) setMapFilter("all");
  }, [mapFilter, mapOptions]);

  useEffect(() => {
    if (modeFilter !== "all" && !modeOptions.includes(modeFilter)) setModeFilter("all");
  }, [modeFilter, modeOptions]);

  const filteredMatches = useMemo(() => {
    return sixMonthMatches.filter((match) => {
      if (mapFilter !== "all" && match.map !== mapFilter) return false;
      if (modeFilter !== "all" && match.mode !== modeFilter) return false;
      if (statusFilter !== "all" && match.status !== statusFilter) return false;
      return true;
    });
  }, [sixMonthMatches, mapFilter, modeFilter, statusFilter]);

  const sortedMatches = useMemo(() => sortMatches(filteredMatches, sortKey), [filteredMatches, sortKey]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedMatches.length / PAGE_SIZE)), [sortedMatches.length, PAGE_SIZE]);

  const visibleMatches = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedMatches.slice(start, start + PAGE_SIZE);
  }, [sortedMatches, currentPage, PAGE_SIZE]);

  useEffect(() => {
    if (!refreshToken) return;
    setDetailCache({});
    setBotStatsByMatchId({});
    setBotStatsLoadingByMatchId({});
    setBotStatsFailedByMatchId({});
  }, [refreshToken]);

  useEffect(() => {
    if (!accountId || visibleMatches.length === 0) return;

    const pendingMatchIds = visibleMatches
      .map((match) => match.id)
      .filter(
        (matchId) =>
          !botStatsByMatchId[matchId] &&
          !botStatsLoadingByMatchId[matchId] &&
          !botStatsFailedByMatchId[matchId]
      );

    if (pendingMatchIds.length === 0) return;
    const batchMatchIds = pendingMatchIds.slice(0, BOT_STATS_BATCH_SIZE);

    let cancelled = false;

    setBotStatsLoadingByMatchId((prev) => {
      const next = { ...prev };
      for (const matchId of batchMatchIds) {
        next[matchId] = true;
      }
      return next;
    });

    const query = new URLSearchParams({
      accountId,
      matchIds: batchMatchIds.join(","),
    });
    query.set("platform", platform);
    if (refreshToken) query.set("refresh", refreshToken);

    fetch(`/api/match-bot-stats?${query.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as MatchBotStatsResponse | { error?: string };
        if (!response.ok) {
          throw new Error((payload as { error?: string }).error ?? "Bot stats fetch failed");
        }
        if (cancelled) return;

        const items = Array.isArray((payload as MatchBotStatsResponse).items)
          ? (payload as MatchBotStatsResponse).items
          : [];

        setBotStatsByMatchId((prev) => {
          const next = { ...prev };
          for (const item of items) {
            next[item.matchId] = item;
          }
          return next;
        });

        const failedMatchIds: string[] = Array.isArray((payload as MatchBotStatsResponse).failedMatchIds)
          ? ((payload as MatchBotStatsResponse).failedMatchIds as string[])
          : [];
        if (failedMatchIds.length > 0) {
          setBotStatsFailedByMatchId((prev) => {
            const next = { ...prev };
            for (const matchId of failedMatchIds) {
              next[matchId] = true;
            }
            return next;
          });
        }
      })
      .catch((error) => {
        console.error(error);
        if (cancelled) return;
        setBotStatsFailedByMatchId((prev) => {
          const next = { ...prev };
          for (const matchId of batchMatchIds) {
            next[matchId] = true;
          }
          return next;
        });
      })
      .finally(() => {
        if (cancelled) return;
        setBotStatsLoadingByMatchId((prev) => {
          const next = { ...prev };
          for (const matchId of batchMatchIds) {
            delete next[matchId];
          }
          return next;
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    accountId,
    visibleMatches,
    botStatsByMatchId,
    botStatsFailedByMatchId,
    botStatsLoadingByMatchId,
    platform,
    refreshToken,
  ]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [mapFilter, modeFilter, statusFilter, sortKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectedDetail = selectedMatch ? detailCache[selectedMatch.id] ?? null : null;

  const teammateIdentity = useMemo(() => {
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
  }, [selectedMatch]);

  const replayDurationSec = useMemo(() => {
    if (!selectedDetail) return 0;
    const values: number[] = [];
    if (typeof selectedDetail.durationSec === "number" && Number.isFinite(selectedDetail.durationSec)) {
      values.push(Math.max(0, Math.round(selectedDetail.durationSec)));
    }
    for (const log of selectedDetail.killLogs) {
      if (typeof log.elapsedSec === "number" && Number.isFinite(log.elapsedSec)) {
        values.push(Math.max(0, Math.round(log.elapsedSec)));
      }
    }
    for (const point of selectedDetail.routePoints ?? []) {
      if (typeof point.elapsedSec === "number" && Number.isFinite(point.elapsedSec)) {
        values.push(Math.max(0, Math.round(point.elapsedSec)));
      }
    }
    for (const state of selectedDetail.blueZoneStates ?? []) {
      if (typeof state.elapsedSec === "number" && Number.isFinite(state.elapsedSec)) {
        values.push(Math.max(0, Math.round(state.elapsedSec)));
      }
    }
    return values.length ? Math.max(...values) : 0;
  }, [selectedDetail]);

  useEffect(() => {
    setReplayTimeSec(0);
    setIsReplayPlaying(false);
  }, [selectedMatch?.id]);

  useEffect(() => {
    if (!isReplayPlaying || replayDurationSec <= 0) return;
    const timer = window.setInterval(() => {
      setReplayTimeSec((prev) => {
        const next = Math.min(replayDurationSec, prev + 1);
        return next;
      });
    }, 220);
    return () => window.clearInterval(timer);
  }, [isReplayPlaying, replayDurationSec]);

  useEffect(() => {
    if (replayDurationSec <= 0) return;
    if (replayTimeSec >= replayDurationSec && isReplayPlaying) {
      setIsReplayPlaying(false);
    }
  }, [replayTimeSec, replayDurationSec, isReplayPlaying]);

  const playerCombatLogs = useMemo(() => {
    if (!selectedDetail) return [];
    return selectedDetail.killLogs.filter(
      (log) => isMyActor(log.killer, accountId, playerName) || isMyActor(log.victim, accountId, playerName)
    );
  }, [selectedDetail, accountId, playerName]);

  const myKillLogs = useMemo(() => playerCombatLogs.filter((log) => isMyActor(log.killer, accountId, playerName)), [playerCombatLogs, accountId, playerName]);
  const myDeathLogs = useMemo(() => playerCombatLogs.filter((log) => isMyActor(log.victim, accountId, playerName)), [playerCombatLogs, accountId, playerName]);
  const myBotKillLogs = useMemo(() => myKillLogs.filter((log) => log.victim?.actorType === "bot"), [myKillLogs]);
  const myPlayerKillLogs = useMemo(() => myKillLogs.filter((log) => log.victim?.actorType === "player"), [myKillLogs]);
  const myUnknownKillLogs = useMemo(
    () => Math.max(0, myKillLogs.length - myBotKillLogs.length - myPlayerKillLogs.length),
    [myKillLogs.length, myBotKillLogs.length, myPlayerKillLogs.length]
  );

  const selectedKillValueLabel = useMemo(() => {
    if (!selectedMatch) return "0";
    return formatKillLabelWithBot(selectedMatch.kills, myBotKillLogs.length);
  }, [selectedMatch, myBotKillLogs.length]);

  const selectedTeamSummary = useMemo(() => {
    if (!selectedMatch) return null;

    const teammateKills = selectedMatch.teammates.reduce((sum, teammate) => sum + teammate.kills, 0);
    const teammateDamage = selectedMatch.teammates.reduce((sum, teammate) => sum + teammate.damage, 0);
    const sortedTeammates = [...selectedMatch.teammates].sort(
      (a, b) => b.kills - a.kills || b.damage - a.damage
    );

    return {
      memberCount: selectedMatch.teammates.length + 1,
      teamKills: selectedMatch.kills + teammateKills,
      teamDamage: selectedMatch.damage + teammateDamage,
      topTeammate: sortedTeammates[0] ?? null,
    };
  }, [selectedMatch]);

  const firstCombatLog = useMemo(() => {
    if (playerCombatLogs.length === 0) return null;
    const copied = [...playerCombatLogs].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    return copied[0] ?? null;
  }, [playerCombatLogs]);

  const filteredDetailLogs = useMemo(() => {
    if (!selectedDetail) return [];
    if (detailLogFilter === "myCombat") return playerCombatLogs;
    if (detailLogFilter === "myKills") return myKillLogs;
    if (detailLogFilter === "myDeath") return myDeathLogs;
    return selectedDetail.killLogs;
  }, [selectedDetail, detailLogFilter, playerCombatLogs, myKillLogs, myDeathLogs]);

  useEffect(() => {
    if (!filteredDetailLogs.length) {
      setActiveKillId(null);
      return;
    }
    setActiveKillId((current) => (current && filteredDetailLogs.some((log) => log.id === current) ? current : filteredDetailLogs[0].id));
  }, [filteredDetailLogs]);

  const visibleKillMarkers = useMemo(() => {
    if (!selectedDetail) return [];
    return selectedDetail.killLogs.filter((log) => log.xPercent !== null && log.yPercent !== null).slice(-260);
  }, [selectedDetail]);

  const miniMapMarkers = useMemo<MiniMapMarker[]>(() => {
    return visibleKillMarkers.map((log) => {
      const myDeath = isMyActor(log.victim, accountId, playerName);
      const myKill = isMyActor(log.killer, accountId, playerName);
      const killerNameKey = log.killer?.name?.trim().toLowerCase() ?? "";
      const teamKill =
        !myKill &&
        !!log.killer &&
        (Boolean(log.killer.accountId && teammateIdentity.accountIds.has(log.killer.accountId)) ||
          (killerNameKey.length > 0 && teammateIdentity.names.has(killerNameKey)) ||
          (typeof log.killer.teamId === "number" && teammateIdentity.teamIds.has(log.killer.teamId)));
      return {
        id: `m-${log.id}`,
        elapsedSec: log.elapsedSec,
        xPercent: Number(log.xPercent ?? 0),
        yPercent: Number(log.yPercent ?? 0),
        active: activeKillId === log.id,
        tone: myDeath ? "death" : myKill ? "kill" : teamKill ? "teamKill" : "neutral",
      };
    });
  }, [visibleKillMarkers, accountId, playerName, activeKillId, teammateIdentity.accountIds, teammateIdentity.names, teammateIdentity.teamIds]);

  const selectedKillLog = useMemo(() => {
    if (!activeKillId) return null;
    return filteredDetailLogs.find((log) => log.id === activeKillId) ?? null;
  }, [filteredDetailLogs, activeKillId]);

  const weaponBreakdown = useMemo(() => {
    const targetLogs = myKillLogs.length > 0 ? myKillLogs : filteredDetailLogs;
    const map = new Map<string, number>();
    for (const log of targetLogs) {
      const key = log.causer || ui.unknown;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([weapon, count]) => ({ weapon, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [myKillLogs, filteredDetailLogs, ui.unknown]);

  const zoneBreakdown = useMemo(() => {
    const targetLogs = playerCombatLogs.length > 0 ? playerCombatLogs : filteredDetailLogs;
    const map = new Map<string, number>();
    for (const log of targetLogs) {
      const zone = getQuadrantLabel(log.xPercent, log.yPercent);
      if (!zone) continue;
      map.set(zone, (map.get(zone) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([zone, count]) => ({ zone, count })).sort((a, b) => b.count - a.count);
  }, [playerCombatLogs, filteredDetailLogs]);

  const loadMatchDetail = async (match: MatchItem) => {
    setSelectedMatch(match);
    setDetailError("");
    setDetailLogFilter("all");

    const cached = detailCache[match.id];
    if (cached) return;

    setDetailLoading(true);
    try {
      const query = new URLSearchParams({ matchId: match.id });
      if (accountId) query.set("accountId", accountId);
      query.set("platform", platform);
      if (refreshToken) query.set("refresh", refreshToken);

      const response = await fetch(`/api/match-detail?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as MatchDetailPayload | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? "Match detail fetch failed");
      }
      const normalizedPayload = payload as MatchDetailPayload;
      if (!Array.isArray(normalizedPayload.routePoints)) normalizedPayload.routePoints = [];
      if (!Array.isArray(normalizedPayload.blueZoneStates)) normalizedPayload.blueZoneStates = [];
      if (!Array.isArray(normalizedPayload.killLogs)) normalizedPayload.killLogs = [];

      setDetailCache((prev) => ({ ...prev, [match.id]: normalizedPayload }));
    } catch (error) {
      console.error(error);
      setDetailError(ui.noDetail);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!matches?.length) {
    return (
      <div className="text-wbz-mute text-center py-12 border border-gray-200 dark:border-white/10 rounded-2xl bg-white dark:bg-dark-surface">
        {ui.noRecent}
      </div>
    );
  }

  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const weaponMax = Math.max(1, ...weaponBreakdown.map((item) => item.count));
  const zoneMax = Math.max(1, ...zoneBreakdown.map((item) => item.count));
  const translateFilterOption = (value: string) => {
    if (value === "all") return t.matchHistory.filter.all;
    if (value === "latest") return t.matchHistory.filter.latest;
    if (value === "kills") return t.matchHistory.filter.kills;
    if (value === "damage") return t.matchHistory.filter.damage;
    if (value === "placement") return t.matchHistory.filter.placement;
    if (value === "win") return t.matchHistory.status.win;
    if (value === "top10") return t.matchHistory.status.top10;
    if (value === "lose") return t.matchHistory.status.lose;
    return value;
  };

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4">
          <div className="flex items-center gap-2 mb-3 text-wbz-mute"><Filter className="w-4 h-4" /><span className="text-sm font-bold">{t.matchHistory.filter.title}</span></div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <FilterSelect label={t.matchHistory.filter.map} value={mapFilter} onChange={setMapFilter} options={["all", ...mapOptions]} getOptionLabel={translateFilterOption} />
            <FilterSelect label={t.matchHistory.filter.mode} value={modeFilter} onChange={setModeFilter} options={["all", ...modeOptions]} getOptionLabel={translateFilterOption} />
            <FilterSelect label={t.matchHistory.filter.result} value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} options={["all", "win", "top10", "lose"]} getOptionLabel={translateFilterOption} />
            <FilterSelect label={t.matchHistory.filter.sort} value={sortKey} onChange={(v) => setSortKey(v as SortKey)} options={["latest", "kills", "damage", "placement"]} getOptionLabel={translateFilterOption} />
            <div className="rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 px-3 py-2.5 flex flex-col justify-center">
              <div className="text-[11px] text-wbz-mute">{t.matchHistory.filter.resultCount}</div>
              <div className="text-lg font-black text-gray-900 dark:text-white">{sortedMatches.length}</div>
              <div className="text-[10px] text-wbz-mute">{t.matchHistory.filter.page} {currentPage} / {totalPages}</div>
            </div>
          </div>
        </section>

        {sortedMatches.length === 0 ? (
          <div className="text-wbz-mute text-center py-10 border border-gray-200 dark:border-white/10 rounded-2xl bg-white dark:bg-dark-surface">{ui.noFiltered}</div>
        ) : (
          <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden">
            <div className={`hidden lg:grid ${MATCH_HISTORY_GRID_TEMPLATE} items-center gap-3 bg-gray-50 dark:bg-white/5 px-2 py-2 text-[10px] tracking-wide text-wbz-mute`}>
              <div className="min-w-0 flex items-center whitespace-nowrap">{t.matchHistory.headers.resultDate}</div>
              <div className="min-w-0 flex items-center justify-center text-center whitespace-nowrap">{t.matchHistory.headers.mapMode}</div>
              <div className="min-w-0 flex items-center justify-center text-center whitespace-nowrap">{t.matchHistory.headers.weapon}</div>
              <div className="min-w-0 flex items-center justify-center text-center whitespace-nowrap">{t.matchHistory.headers.kills}</div>
              <div className="min-w-0 flex items-center justify-center text-center whitespace-nowrap">{t.matchHistory.headers.damage}</div>
              <div className="min-w-0 flex items-center justify-center text-center whitespace-nowrap">{t.matchHistory.headers.dbno}</div>
              <div className="min-w-0 flex items-center justify-center text-center whitespace-nowrap">{t.matchHistory.headers.distance}</div>
              <div className="min-w-0 flex items-center justify-center text-center whitespace-nowrap">{t.matchHistory.headers.survival}</div>
              <div className="min-w-0 flex items-center justify-center text-center whitespace-nowrap">{t.matchHistory.headers.snipe}</div>
              <div className="min-w-0 flex items-center whitespace-nowrap">{t.matchHistory.headers.teammates}</div>
              <div className="min-w-0 flex items-center justify-center text-center whitespace-nowrap">{t.matchHistory.headers.detail}</div>
            </div>
            <div className="divide-y divide-white/5">
              {visibleMatches.map((match, idx) => (
                <MatchHistoryItem
                  key={match.id}
                  match={match}
                  index={idx}
                  absoluteIndex={pageStartIndex + idx}
                  sortedMatches={sortedMatches}
                  botStats={botStatsByMatchId[match.id] ?? null}
                  isBotStatsLoading={Boolean(botStatsLoadingByMatchId[match.id])}
                  accountId={accountId}
                  playerName={playerName}
                  platform={platform}
                  onOpenDetail={() => loadMatchDetail(match)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-gray-200 dark:border-white/10 px-3 py-2.5">
              <p className="text-[11px] text-wbz-mute">{ui.pageInfo}</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="rounded border border-gray-300 dark:border-white/15 px-2 py-1 text-[11px] text-wbz-mute disabled:opacity-40 disabled:cursor-not-allowed hover:border-cyan-300/50 hover:text-gray-900 dark:hover:text-white"
                >
                  {ui.prev}
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-7 rounded border px-2 py-1 text-[11px] font-bold ${
                      page === currentPage
                        ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-700 dark:text-cyan-100"
                        : "border-gray-300 dark:border-white/15 text-wbz-mute hover:border-cyan-300/50 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded border border-gray-300 dark:border-white/15 px-2 py-1 text-[11px] text-wbz-mute disabled:opacity-40 disabled:cursor-not-allowed hover:border-cyan-300/50 hover:text-gray-900 dark:hover:text-white"
                >
                  {ui.next}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white truncate">
                  {ui.detailTitle}: {selectedMatch.map} {selectedMatch.result}
                </h3>
                <p className="text-[11px] text-wbz-mute truncate">{selectedMatch.mode} · {selectedMatch.date}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMatch(null);
                  setDetailError("");
                  setActiveKillId(null);
                  setIsReplayPlaying(false);
                  setReplayTimeSec(0);
                }}
                className="p-2 rounded-lg border border-gray-300 dark:border-white/15 text-wbz-mute hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {detailLoading ? (
                <div className="h-52 flex items-center justify-center text-wbz-mute"><Loader2 className="w-6 h-6 animate-spin text-wbz-gold mr-2" />{ui.loadingTelemetry}</div>
              ) : detailError ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200 text-sm">{detailError}</div>
              ) : !selectedDetail ? (
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 text-wbz-mute text-sm">{ui.noDetail}</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
                    <StatCard label={t.matchHistory.headers.mapMode} value={selectedDetail.map.label} compact />
                    <StatCard label={t.matchHistory.filter.mode} value={selectedDetail.modeLabel} compact />
                    <StatCard label={t.matchHistory.filter.result} value={selectedMatch.result} compact />
                    <StatCard label={t.matchHistory.headers.kills} value={selectedKillValueLabel} compact />
                    <StatCard label={ui.botKills} value={myBotKillLogs.length > 0 ? `${myBotKillLogs.length}` : "0"} compact />
                    <StatCard label={ui.playerKills} value={String(myPlayerKillLogs.length)} compact />
                    <StatCard label={t.matchHistory.headers.damage} value={selectedMatch.damage.toLocaleString()} compact />
                    <StatCard label="HS%" value={`${(selectedMatch.kills > 0 ? (selectedMatch.headshots / selectedMatch.kills) * 100 : 0).toFixed(1)}%`} compact />
                    <StatCard label={ui.myCombat} value={String(playerCombatLogs.length)} compact />
                    <StatCard label={ui.firstCombat} value={firstCombatLog ? formatTelemetryTime(firstCombatLog.time) : "-"} compact />
                    <StatCard label={ui.teamKills} value={selectedTeamSummary ? `${selectedTeamSummary.teamKills}` : "-"} compact />
                    <StatCard label={ui.teamDamage} value={selectedTeamSummary ? selectedTeamSummary.teamDamage.toLocaleString() : "-"} compact />
                    <StatCard label={ui.unknownKills} value={String(myUnknownKillLogs)} compact />
                    <StatCard label={ui.events} value={String(selectedDetail.totalKillEvents)} compact />
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3">
                    <div className="text-[11px] text-wbz-mute mb-2">{ui.teamTitle}</div>
                    {selectedMatch.teammates.length === 0 ? (
                      <p className="text-xs text-wbz-mute">{ui.soloNotice}</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedTeamSummary && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[11px]">
                            <div className="rounded border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2 py-1.5 text-wbz-mute">
                              {ui.teamMembers}
                              <div className="text-gray-900 dark:text-white font-bold">
                                {selectedTeamSummary.memberCount}
                                {ui.memberUnit}
                              </div>
                            </div>
                            <div className="rounded border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2 py-1.5 text-wbz-mute">
                              {ui.teamKills}
                              <div className="text-gray-900 dark:text-white font-bold">{selectedTeamSummary.teamKills}</div>
                            </div>
                            <div className="rounded border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2 py-1.5 text-wbz-mute">
                              {ui.teamDamage}
                              <div className="text-gray-900 dark:text-white font-bold">{selectedTeamSummary.teamDamage.toLocaleString()}</div>
                            </div>
                            <div className="rounded border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2 py-1.5 text-wbz-mute">
                              {ui.ace}
                              <div className="text-gray-900 dark:text-white font-bold truncate">
                                {selectedTeamSummary.topTeammate ? selectedTeamSummary.topTeammate.name : "-"}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {selectedMatch.teammates.map((teammate) => (
                            <span
                              key={`detail-team-${selectedMatch.id}-${teammate.accountId ?? teammate.name}`}
                              className="inline-flex items-center gap-1 rounded border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 px-2 py-1 text-[11px] text-gray-900 dark:text-white"
                              title={`${teammate.name} · K ${teammate.kills} · D ${teammate.damage}`}
                            >
                              <span className="max-w-[160px] truncate">{teammate.name}</span>
                              <span className="text-cyan-200">K{teammate.kills}</span>
                              <span className="text-amber-200">{teammate.damage}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedDetail.playerDeath && (
                    <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm">
                      <div className="text-rose-200 font-black mb-1 inline-flex items-center gap-1.5">
                        <ShieldX className="w-4 h-4" />
                        {ui.myDeathLog}
                      </div>
                      <p className="text-rose-100 text-xs">
                        {formatTelemetryTime(selectedDetail.playerDeath.time)} / {selectedDetail.playerDeath.killer?.name ?? ui.unknown}[{getActorTypeLabel(selectedDetail.playerDeath.killer, language)}]
                        {" -> "}
                        {selectedDetail.playerDeath.victim?.name ?? ui.unknown}[{getActorTypeLabel(selectedDetail.playerDeath.victim, language)}] / {selectedDetail.playerDeath.causer}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-7 space-y-3">
                      <MatchDetailMiniMap
                        ui={ui}
                        mapId={selectedDetail.map.mapId}
                        mapSizeKm={selectedDetail.map.sizeKm}
                        imageUrl={selectedDetail.map.imageUrl}
                        label={selectedDetail.map.label}
                        markers={miniMapMarkers}
                        routePoints={selectedDetail.routePoints ?? []}
                        blueZoneStates={selectedDetail.blueZoneStates ?? []}
                        showRoute={showRoute}
                        showBlueZone={showBlueZone}
                        currentTimeSec={replayTimeSec}
                      />
                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (replayDurationSec <= 0) return;
                              setIsReplayPlaying((prev) => !prev);
                            }}
                            className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-white/20 text-xs font-bold text-gray-900 dark:text-gray-100 hover:border-cyan-300/60"
                          >
                            {isReplayPlaying ? ui.pause : ui.play}
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={Math.max(1, replayDurationSec)}
                            value={Math.min(replayTimeSec, Math.max(1, replayDurationSec))}
                            onChange={(event) => {
                              const next = Number.parseInt(event.target.value, 10);
                              setReplayTimeSec(Number.isFinite(next) ? next : 0);
                              setIsReplayPlaying(false);
                            }}
                            className="flex-1 accent-cyan-400"
                          />
                          <span className="text-[11px] text-gray-400 font-mono min-w-[90px] text-right">
                            {replayTimeSec}s / {Math.max(0, replayDurationSec)}s
                          </span>
                        </div>
                      </div>

                      {selectedKillLog && (
                        <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-3">
                          <div className="text-[11px] text-amber-200 font-bold mb-1">{ui.selectedEvent}</div>
                          <div className="text-xs text-gray-900 dark:text-white">
                            {selectedKillLog.killer?.name ?? ui.unknown}[{getActorTypeLabel(selectedKillLog.killer, language)}]
                            {" -> "}
                            {selectedKillLog.victim?.name ?? ui.unknown}[{getActorTypeLabel(selectedKillLog.victim, language)}]
                          </div>
                          <div className="text-[11px] text-wbz-mute mt-1">{formatTelemetryTime(selectedKillLog.time)} / {selectedKillLog.causer} / {selectedKillLog.damageType} / X {formatMeters(selectedKillLog.x)} Y {formatMeters(selectedKillLog.y)}</div>
                        </div>
                      )}
                    </div>

                    <div className="xl:col-span-5 space-y-3">
                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3">
                        <div className="text-[11px] text-wbz-mute mb-2">{ui.mapOptions}</div>
                        <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 mr-4">
                          <input
                            type="checkbox"
                            checked={showBlueZone}
                            onChange={(event) => setShowBlueZone(event.target.checked)}
                            className="accent-blue-400"
                          />
                          {ui.bluezone}
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={showRoute}
                            onChange={(event) => setShowRoute(event.target.checked)}
                            className="accent-emerald-400"
                          />
                          {ui.route}
                        </label>
                      </div>

                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center gap-2">
                          <FilterChip active={detailLogFilter === "all"} onClick={() => setDetailLogFilter("all")} label={`${ui.allLog} (${selectedDetail.killLogs.length})`} tone="cyan" />
                          <FilterChip active={detailLogFilter === "myCombat"} onClick={() => setDetailLogFilter("myCombat")} label={`${ui.myCombat} (${playerCombatLogs.length})`} tone="green" />
                          <FilterChip active={detailLogFilter === "myKills"} onClick={() => setDetailLogFilter("myKills")} label={`${ui.myKills} (${myKillLogs.length})`} tone="green" />
                          <FilterChip active={detailLogFilter === "myDeath"} onClick={() => setDetailLogFilter("myDeath")} label={`${ui.myDeaths} (${myDeathLogs.length})`} tone="rose" />
                        </div>

                        <div className="divide-y divide-white/5">
                          {filteredDetailLogs.length === 0 ? <div className="p-4 text-sm text-wbz-mute">{ui.noLogs}</div> : filteredDetailLogs.map((log) => (
                            <button key={log.id} type="button" onClick={() => setActiveKillId(log.id)} className={`w-full text-left px-3 py-2 hover:bg-white/5 ${activeKillId === log.id ? "bg-yellow-400/10" : ""}`}>
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-gray-900 dark:text-white font-bold inline-flex items-center gap-1.5 flex-wrap">
                                  <span>{log.killer?.name ?? ui.unknown}</span>
                                  <span className={`px-1.5 py-0.5 rounded border text-[10px] ${getActorTypeClass(log.killer)}`}>{getActorTypeLabel(log.killer, language)}</span>
                                  <span className="text-wbz-mute">-&gt;</span>
                                  <span>{log.victim?.name ?? ui.unknown}</span>
                                  <span className={`px-1.5 py-0.5 rounded border text-[10px] ${getActorTypeClass(log.victim)}`}>{getActorTypeLabel(log.victim, language)}</span>
                                </span>
                                <span className="text-wbz-mute">{formatTelemetryTime(log.time)}</span>
                              </div>
                              <div className="mt-0.5 text-[10px] text-wbz-mute">{log.causer} / {log.damageType} / X {formatMeters(log.x)} Y {formatMeters(log.y)}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3 space-y-2">
                        <div className="text-[11px] text-wbz-mute">{ui.weaponUsage}</div>
                        {weaponBreakdown.length === 0 ? <div className="text-xs text-wbz-mute">{ui.noWeaponLogs}</div> : weaponBreakdown.map((item) => <BarRow key={item.weapon} label={item.weapon} value={item.count} max={weaponMax} tone="cyan" />)}
                      </div>

                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3 space-y-2">
                        <div className="text-[11px] text-wbz-mute">{ui.hitZone}</div>
                        {zoneBreakdown.length === 0 ? <div className="text-xs text-wbz-mute">{ui.noLocationLogs}</div> : zoneBreakdown.map((item) => <BarRow key={item.zone} label={ui.zoneLabels[item.zone as keyof typeof ui.zoneLabels] ?? item.zone} value={item.count} max={zoneMax} tone="amber" />)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MatchDetailMiniMap({
  ui,
  mapId,
  mapSizeKm,
  imageUrl,
  label,
  markers,
  routePoints,
  blueZoneStates,
  showRoute,
  showBlueZone,
  currentTimeSec,
}: {
  ui: {
    mapOverlayUnsupported: string;
    miniMapZoomOut: string;
    miniMapZoomIn: string;
    miniMapGuide: string;
  };
  mapId: string | null;
  mapSizeKm: number | null;
  imageUrl: string | null;
  label: string;
  markers: MiniMapMarker[];
  routePoints: MatchRoutePoint[];
  blueZoneStates: MatchBlueZoneState[];
  showRoute: boolean;
  showBlueZone: boolean;
  currentTimeSec: number;
}) {
  const mapDefinition = useMemo(() => {
    if (!mapId) return null;
    return MAP_INTEL_MAPS.find((map) => map.id === mapId) ?? null;
  }, [mapId]);

  const hasTileSource = Boolean(mapDefinition?.tileBaseUrl);
  const effectiveMapSizeKm = mapDefinition?.sizeKm ?? mapSizeKm ?? null;
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const setViewportNode = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    setViewportEl(node);
  }, []);

  useEffect(() => {
    zoomRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    panRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setIsDragging(false);
    dragStateRef.current.active = false;
  }, [mapId]);

  const tileZoom = useMemo(() => {
    if (!mapDefinition) return 0;
    return resolveMiniMapTileZoom(mapDefinition, zoomLevel);
  }, [mapDefinition, zoomLevel]);

  const tileCount = useMemo(() => {
    if (!mapDefinition || tileZoom <= 0) return 0;
    return 2 ** tileZoom;
  }, [mapDefinition, tileZoom]);

  const visibleTileBounds = useMemo(() => {
    if (tileCount <= 0 || viewportSize.width <= 0 || viewportSize.height <= 0) {
      return {
        startX: 0,
        endX: Math.max(0, tileCount - 1),
        startY: 0,
        endY: Math.max(0, tileCount - 1),
      };
    }

    const width = viewportSize.width;
    const height = viewportSize.height;
    const worldLeft = (0 - panOffset.x - width / 2) / zoomLevel + width / 2;
    const worldRight = (width - panOffset.x - width / 2) / zoomLevel + width / 2;
    const worldTop = (0 - panOffset.y - height / 2) / zoomLevel + height / 2;
    const worldBottom = (height - panOffset.y - height / 2) / zoomLevel + height / 2;

    const minXPercent = clampValue((Math.min(worldLeft, worldRight) / width) * 100, 0, 100);
    const maxXPercent = clampValue((Math.max(worldLeft, worldRight) / width) * 100, 0, 100);
    const minYPercent = clampValue((Math.min(worldTop, worldBottom) / height) * 100, 0, 100);
    const maxYPercent = clampValue((Math.max(worldTop, worldBottom) / height) * 100, 0, 100);

    const startX = Math.max(0, Math.floor((minXPercent / 100) * tileCount) - 1);
    const endX = Math.min(tileCount - 1, Math.ceil((maxXPercent / 100) * tileCount) + 1);
    const startY = Math.max(0, Math.floor((minYPercent / 100) * tileCount) - 1);
    const endY = Math.min(tileCount - 1, Math.ceil((maxYPercent / 100) * tileCount) + 1);

    return { startX, endX, startY, endY };
  }, [tileCount, viewportSize.width, viewportSize.height, panOffset.x, panOffset.y, zoomLevel]);

  const visibleTiles = useMemo(() => {
    if (!mapDefinition || tileCount <= 0) return [];

    const sizePercent = 100 / tileCount;
    const tiles: Array<{ key: string; url: string; left: number; top: number; size: number }> = [];
    for (let y = visibleTileBounds.startY; y <= visibleTileBounds.endY; y += 1) {
      for (let x = visibleTileBounds.startX; x <= visibleTileBounds.endX; x += 1) {
        tiles.push({
          key: `${tileZoom}-${x}-${y}`,
          url: `${mapDefinition.tileBaseUrl}/${tileZoom}/${x}/${y}.webp`,
          left: x * sizePercent,
          top: y * sizePercent,
          size: sizePercent,
        });
      }
    }
    return tiles;
  }, [mapDefinition, tileCount, tileZoom, visibleTileBounds.startX, visibleTileBounds.endX, visibleTileBounds.startY, visibleTileBounds.endY]);

  const applyZoom = useCallback((delta: number, anchor?: { clientX: number; clientY: number }) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const prevZoom = zoomRef.current;
    const nextZoom = clampValue(Number((prevZoom + delta).toFixed(2)), 1, 3);
    if (nextZoom === prevZoom) return;

    const prevPan = panRef.current;
    let nextPan = clampPanOffset(prevPan.x, prevPan.y, nextZoom, rect.width, rect.height);

    if (anchor) {
      const anchorX = clampValue(anchor.clientX - rect.left, 0, rect.width);
      const anchorY = clampValue(anchor.clientY - rect.top, 0, rect.height);

      const worldX = (anchorX - prevPan.x - rect.width / 2) / prevZoom + rect.width / 2;
      const worldY = (anchorY - prevPan.y - rect.height / 2) / prevZoom + rect.height / 2;

      const scaledX = (worldX - rect.width / 2) * nextZoom + rect.width / 2;
      const scaledY = (worldY - rect.height / 2) * nextZoom + rect.height / 2;
      nextPan = clampPanOffset(anchorX - scaledX, anchorY - scaledY, nextZoom, rect.width, rect.height);
    }

    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    setZoomLevel(nextZoom);
    setPanOffset(nextPan);
  }, []);

  useEffect(() => {
    if (!viewportEl || !hasTileSource) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      applyZoom(event.deltaY < 0 ? 0.15 : -0.15, { clientX: event.clientX, clientY: event.clientY });
    };

    viewportEl.addEventListener("wheel", onWheel, { passive: false });
    return () => viewportEl.removeEventListener("wheel", onWheel);
  }, [viewportEl, hasTileSource, applyZoom]);

  useEffect(() => {
    if (!viewportEl) return;

    const updateViewport = () => {
      const rect = viewportEl.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
      setPanOffset((prev) => {
        const next = clampPanOffset(prev.x, prev.y, zoomRef.current, rect.width, rect.height);
        panRef.current = next;
        return next;
      });
    };

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, [viewportEl]);

  const stopDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const onWindowMouseUp = () => stopDrag();
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [stopDrag]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (zoomRef.current <= 1) return;

    dragStateRef.current.active = true;
    dragStateRef.current.startX = event.clientX;
    dragStateRef.current.startY = event.clientY;
    dragStateRef.current.startPanX = panRef.current.x;
    dragStateRef.current.startPanY = panRef.current.y;
    setIsDragging(true);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active || !viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;
    const nextPan = clampPanOffset(
      dragStateRef.current.startPanX + deltaX,
      dragStateRef.current.startPanY + deltaY,
      zoomRef.current,
      rect.width,
      rect.height
    );

    panRef.current = nextPan;
    setPanOffset(nextPan);
  };

  const markerClassByTone: Record<MiniMapMarker["tone"], string> = {
    death: "bg-rose-400 border-rose-100",
    kill: "bg-emerald-400 border-emerald-100",
    teamKill: "bg-blue-500 border-blue-100",
    neutral: "bg-cyan-300 border-white",
  };

  const timelineMarkers = useMemo(() => {
    return markers.filter((marker) => marker.elapsedSec === null || marker.elapsedSec <= currentTimeSec);
  }, [markers, currentTimeSec]);

  const selfRoutePolyline = useMemo(() => {
    if (!showRoute) return "";
    const points = routePoints
      .filter((point) => point.isSelf)
      .filter((point) => point.xPercent !== null && point.yPercent !== null)
      .filter((point) => point.elapsedSec === null || point.elapsedSec <= currentTimeSec)
      .sort((a, b) => (a.elapsedSec ?? 0) - (b.elapsedSec ?? 0));
    if (points.length < 2) return "";
    return points
      .map((point) => `${Number(point.xPercent).toFixed(3)},${Number(point.yPercent).toFixed(3)}`)
      .join(" ");
  }, [showRoute, routePoints, currentTimeSec]);

  const activeBlueZone = useMemo(() => {
    if (!showBlueZone) return null;
    const sorted = [...blueZoneStates]
      .filter((state) => state.xPercent !== null && state.yPercent !== null && state.radius !== null)
      .filter((state) => state.elapsedSec === null || state.elapsedSec <= currentTimeSec)
      .sort((a, b) => (a.elapsedSec ?? 0) - (b.elapsedSec ?? 0));
    return sorted.length ? sorted[sorted.length - 1] : null;
  }, [showBlueZone, blueZoneStates, currentTimeSec]);

  const blueZoneRadiusPercent = useMemo(() => {
    if (!activeBlueZone || !effectiveMapSizeKm) return null;
    const mapUnits = effectiveMapSizeKm * 1000 * 100;
    if (!Number.isFinite(mapUnits) || mapUnits <= 0) return null;
    const radiusValue = activeBlueZone.radius ?? 0;
    if (!Number.isFinite(radiusValue) || radiusValue <= 0) return null;
    return clampValue((radiusValue / mapUnits) * 100, 0, 100);
  }, [activeBlueZone, effectiveMapSizeKm]);

  if (!imageUrl && !hasTileSource) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 text-wbz-mute text-sm">
        {ui.mapOverlayUnsupported}
      </div>
    );
  }

  if (!hasTileSource) {
    return (
      <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-black">
        <img src={imageUrl ?? ""} alt={label} className="w-full h-full object-cover select-none pointer-events-none" />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {selfRoutePolyline ? (
            <polyline
              points={selfRoutePolyline}
              fill="none"
              stroke="#22c55e"
              strokeWidth={0.45}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          ) : null}
          {activeBlueZone && blueZoneRadiusPercent !== null ? (
            <circle
              cx={Number(activeBlueZone.xPercent)}
              cy={Number(activeBlueZone.yPercent)}
              r={blueZoneRadiusPercent}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth={0.35}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 pointer-events-none">
          {timelineMarkers.map((marker) => (
            marker.tone === "death" ? (
              <span
                key={marker.id}
                className="absolute w-3 h-3"
                style={{
                  left: `${marker.xPercent}%`,
                  top: `${marker.yPercent}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-rose-400 rounded-full" />
                <span className="absolute top-1/2 left-0 w-full h-[2px] -translate-y-1/2 bg-rose-400 rounded-full" />
              </span>
            ) : (
              <span
                key={marker.id}
                className={`absolute w-2.5 h-2.5 rounded-full border ${markerClassByTone[marker.tone]}`}
                style={{
                  left: `${marker.xPercent}%`,
                  top: `${marker.yPercent}%`,
                  transform: "translate(-50%, -50%)",
                  boxShadow: marker.active ? "0 0 12px rgba(250, 204, 21, 0.95)" : undefined,
                }}
              />
            )
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setViewportNode}
      className={`relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-black ${
        isDragging ? "cursor-grabbing" : zoomLevel > 1 ? "cursor-grab" : "cursor-default"
      }`}
      style={{ touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <div
        className="absolute inset-0 origin-center will-change-transform"
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})` }}
      >
        <div className="absolute inset-0">
          {visibleTiles.map((tile, index) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              draggable={false}
              className="absolute object-cover select-none pointer-events-none"
              style={{
                left: `${tile.left}%`,
                top: `${tile.top}%`,
                width: `${tile.size}%`,
                height: `${tile.size}%`,
              }}
              loading={index < 40 ? "eager" : "lazy"}
              decoding="async"
            />
          ))}
        </div>

        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {selfRoutePolyline ? (
            <polyline
              points={selfRoutePolyline}
              fill="none"
              stroke="#22c55e"
              strokeWidth={0.45}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          ) : null}
          {activeBlueZone && blueZoneRadiusPercent !== null ? (
            <circle
              cx={Number(activeBlueZone.xPercent)}
              cy={Number(activeBlueZone.yPercent)}
              r={blueZoneRadiusPercent}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth={0.35}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 pointer-events-none">
          {timelineMarkers.map((marker) => (
            marker.tone === "death" ? (
              <span
                key={marker.id}
                className="absolute w-3 h-3"
                style={{
                  left: `${marker.xPercent}%`,
                  top: `${marker.yPercent}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-rose-400 rounded-full" />
                <span className="absolute top-1/2 left-0 w-full h-[2px] -translate-y-1/2 bg-rose-400 rounded-full" />
              </span>
            ) : (
              <span
                key={marker.id}
                className={`absolute w-2.5 h-2.5 rounded-full border ${markerClassByTone[marker.tone]}`}
                style={{
                  left: `${marker.xPercent}%`,
                  top: `${marker.yPercent}%`,
                  transform: "translate(-50%, -50%)",
                  boxShadow: marker.active ? "0 0 12px rgba(250, 204, 21, 0.95)" : undefined,
                }}
              />
            )
          ))}
        </div>
      </div>

      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/60 px-2 py-1">
        <button
          type="button"
          onClick={() => applyZoom(-0.2)}
          className="w-6 h-6 rounded border border-white/20 text-white hover:border-cyan-300/60 hover:text-cyan-200 transition-colors"
          aria-label={ui.miniMapZoomOut}
        >
          -
        </button>
        <span className="text-[11px] text-white font-mono w-[44px] text-center">{Math.round(zoomLevel * 100)}%</span>
        <button
          type="button"
          onClick={() => applyZoom(0.2)}
          className="w-6 h-6 rounded border border-white/20 text-white hover:border-cyan-300/60 hover:text-cyan-200 transition-colors"
          aria-label={ui.miniMapZoomIn}
        >
          +
        </button>
      </div>

      <div className="absolute bottom-2.5 left-2.5 z-10 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[10px] text-wbz-mute">
        {ui.miniMapGuide}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false, compact = false }: { label: string; value: string; accent?: boolean; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface ${compact ? "p-2.5" : "p-3"}`}>
      <p className="text-[10px] text-wbz-mute">{label}</p>
      <p className={`${compact ? "text-xs" : "text-lg"} font-black ${accent ? "text-wbz-gold" : "text-gray-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  getOptionLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  getOptionLabel: (value: string) => string;
}) {
  return (
    <label className="text-[11px] text-wbz-mute space-y-1">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-white dark:bg-black/40 border border-gray-300 dark:border-white/15 rounded-lg px-2.5 py-2 text-gray-900 dark:text-white"
      >
        {options.map((option) => (
          <option key={`${label}-${option}`} value={option}>{getOptionLabel(option)}</option>
        ))}
      </select>
    </label>
  );
}

function FilterChip({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone: "cyan" | "green" | "rose" }) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-300/60 text-cyan-200 bg-cyan-500/10"
      : tone === "green"
        ? "border-emerald-300/60 text-emerald-200 bg-emerald-500/10"
        : "border-rose-300/60 text-rose-200 bg-rose-500/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-[11px] font-bold border ${active ? toneClass : "border-gray-300 dark:border-white/15 text-wbz-mute bg-gray-50 dark:bg-white/5"}`}
    >
      {label}
    </button>
  );
}

function BarRow({ label, value, max, tone }: { label: string; value: number; max: number; tone: "cyan" | "amber" }) {
  const barClass = tone === "cyan" ? "from-cyan-400/70 to-cyan-200" : "from-amber-400/70 to-amber-200";
  const width = Math.max(8, (value / Math.max(1, max)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-gray-900 dark:text-white truncate">{label}</span>
        <span className="text-wbz-mute font-mono">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

