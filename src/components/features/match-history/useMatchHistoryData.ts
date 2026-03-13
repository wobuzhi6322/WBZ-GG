import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  buildReplayDuration,
  buildTeammateIdentity,
  filterDetailLogs,
  getFirstCombatLog,
  getPageInfoText,
  getPageNumbers,
  getWeaponBreakdown,
  getZoneBreakdown,
  isMyActor,
  sortMatches,
  summarizeTeam,
} from "@/components/features/match-history/detailUtils";
import { getMatchHistoryUi } from "@/components/features/match-history/i18n";
import { formatKillLabelWithBot } from "@/components/features/match-history/utils";
import type {
  DetailLogFilter,
  MatchBotStatsItem,
  MatchBotStatsResponse,
  MatchDetailPayload,
  MatchHistoryProps,
  MiniMapMarker,
  PageSizeOption,
  SortKey,
  StatusFilter,
} from "@/components/features/match-history/types";

const BOT_STATS_BATCH_SIZE = 4;
const PAGE_SIZE_OPTIONS: PageSizeOption[] = [10, 20];

export function useMatchHistoryData({
  matches,
  accountId,
  playerName,
  platform = "steam",
  refreshToken = "",
}: MatchHistoryProps) {
  const { language } = useLanguage();
  const ui = useMemo(() => getMatchHistoryUi(language), [language]);

  const [mapFilter, setMapFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState<MatchHistoryProps["matches"][number] | null>(null);
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
    const filtered = matches.filter((match) => {
      const parsed = Date.parse(match.createdAt);
      return Number.isFinite(parsed) && parsed >= sixMonthsAgoTimestamp;
    });
    return sortMatches(filtered, "latest");
  }, [matches, sixMonthsAgoTimestamp]);

  const mapOptions = useMemo(() => Array.from(new Set(sixMonthMatches.map((match) => match.map))), [sixMonthMatches]);
  const modeOptions = useMemo(
    () => Array.from(new Set(sixMonthMatches.map((match) => match.mode))).slice(0, 8),
    [sixMonthMatches],
  );

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
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedMatches.length / pageSize)), [sortedMatches.length, pageSize]);
  const visibleMatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedMatches.slice(start, start + pageSize);
  }, [sortedMatches, currentPage, pageSize]);
  const pageStartIndex = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize]);
  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);
  const pageInfoText = useMemo(() => getPageInfoText(language, pageSize, ui.pageInfo), [language, pageSize, ui.pageInfo]);

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
          !botStatsFailedByMatchId[matchId],
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
      .catch(() => {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [mapFilter, modeFilter, statusFilter, sortKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const selectedDetail = useMemo(
    () => (selectedMatch ? detailCache[selectedMatch.id] ?? null : null),
    [selectedMatch, detailCache],
  );
  const teammateIdentity = useMemo(() => buildTeammateIdentity(selectedMatch), [selectedMatch]);
  const replayDurationSec = useMemo(() => buildReplayDuration(selectedDetail), [selectedDetail]);

  useEffect(() => {
    setReplayTimeSec(0);
    setIsReplayPlaying(false);
  }, [selectedMatch?.id]);

  useEffect(() => {
    if (!isReplayPlaying || replayDurationSec <= 0) return;
    const timer = window.setInterval(() => {
      setReplayTimeSec((prev) => Math.min(replayDurationSec, prev + 1));
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
      (log) => isMyActor(log.killer, accountId, playerName) || isMyActor(log.victim, accountId, playerName),
    );
  }, [selectedDetail, accountId, playerName]);

  const myKillLogs = useMemo(
    () => playerCombatLogs.filter((log) => isMyActor(log.killer, accountId, playerName)),
    [playerCombatLogs, accountId, playerName],
  );
  const myDeathLogs = useMemo(
    () => playerCombatLogs.filter((log) => isMyActor(log.victim, accountId, playerName)),
    [playerCombatLogs, accountId, playerName],
  );
  const myBotKillLogs = useMemo(() => myKillLogs.filter((log) => log.victim?.actorType === "bot"), [myKillLogs]);
  const myPlayerKillLogs = useMemo(
    () => myKillLogs.filter((log) => log.victim?.actorType === "player"),
    [myKillLogs],
  );
  const myUnknownKillLogs = useMemo(
    () => Math.max(0, myKillLogs.length - myBotKillLogs.length - myPlayerKillLogs.length),
    [myKillLogs.length, myBotKillLogs.length, myPlayerKillLogs.length],
  );

  const selectedKillValueLabel = useMemo(() => {
    if (!selectedMatch) return "0";
    return formatKillLabelWithBot(selectedMatch.kills, myBotKillLogs.length);
  }, [selectedMatch, myBotKillLogs.length]);

  const selectedTeamSummary = useMemo(() => summarizeTeam(selectedMatch), [selectedMatch]);
  const firstCombatLog = useMemo(() => getFirstCombatLog(playerCombatLogs), [playerCombatLogs]);
  const filteredDetailLogs = useMemo(
    () => filterDetailLogs(detailLogFilter, selectedDetail, playerCombatLogs, myKillLogs, myDeathLogs),
    [detailLogFilter, selectedDetail, playerCombatLogs, myKillLogs, myDeathLogs],
  );

  useEffect(() => {
    if (!filteredDetailLogs.length) {
      setActiveKillId(null);
      return;
    }
    setActiveKillId((current) =>
      current && filteredDetailLogs.some((log) => log.id === current) ? current : filteredDetailLogs[0].id,
    );
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
  }, [visibleKillMarkers, accountId, playerName, activeKillId, teammateIdentity]);

  const selectedKillLog = useMemo(() => {
    if (!activeKillId) return null;
    return filteredDetailLogs.find((log) => log.id === activeKillId) ?? null;
  }, [filteredDetailLogs, activeKillId]);

  const weaponBreakdown = useMemo(
    () => getWeaponBreakdown(myKillLogs, filteredDetailLogs, ui.unknown),
    [myKillLogs, filteredDetailLogs, ui.unknown],
  );
  const zoneBreakdown = useMemo(
    () => getZoneBreakdown(playerCombatLogs, filteredDetailLogs),
    [playerCombatLogs, filteredDetailLogs],
  );

  const loadMatchDetail = useCallback(
    async (match: MatchHistoryProps["matches"][number]) => {
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
      } catch {
        setDetailError(ui.noDetail);
      } finally {
        setDetailLoading(false);
      }
    },
    [detailCache, accountId, platform, refreshToken, ui.noDetail],
  );

  const closeDetail = useCallback(() => {
    setSelectedMatch(null);
    setDetailError("");
    setActiveKillId(null);
    setIsReplayPlaying(false);
    setReplayTimeSec(0);
  }, []);

  return {
    ui,
    mapFilter,
    setMapFilter,
    modeFilter,
    setModeFilter,
    statusFilter,
    setStatusFilter,
    sortKey,
    setSortKey,
    pageSize,
    setPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    currentPage,
    setCurrentPage,
    mapOptions,
    modeOptions,
    sortedMatches,
    visibleMatches,
    totalPages,
    pageNumbers,
    pageStartIndex,
    pageInfoText,
    botStatsByMatchId,
    botStatsLoadingByMatchId,
    selectedMatch,
    selectedDetail,
    detailLoading,
    detailError,
    detailLogFilter,
    setDetailLogFilter,
    activeKillId,
    setActiveKillId,
    showRoute,
    setShowRoute,
    showBlueZone,
    setShowBlueZone,
    isReplayPlaying,
    setIsReplayPlaying,
    replayTimeSec,
    setReplayTimeSec,
    replayDurationSec,
    loadMatchDetail,
    closeDetail,
    playerCombatLogs,
    myKillLogs,
    myDeathLogs,
    myBotKillLogs,
    myPlayerKillLogs,
    myUnknownKillLogs,
    selectedKillValueLabel,
    selectedTeamSummary,
    firstCombatLog,
    filteredDetailLogs,
    selectedKillLog,
    miniMapMarkers,
    weaponBreakdown,
    zoneBreakdown,
    teammateIdentity,
  };
}
