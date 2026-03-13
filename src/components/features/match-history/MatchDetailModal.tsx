"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Crosshair, Loader2, ShieldX, Skull, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { MatchDetailMiniMap } from "@/components/features/match-history/MatchDetailMiniMap";
import { getIconPath, getRelationColor, getWeaponInfo } from "@/lib/telemetryAssets";
import {
  buildCauserBadgeText,
  buildCauserFallback,
  formatMeters,
  formatTelemetryTime,
  getActorTypeClass,
  getActorTypeLabel,
  getCauserImage,
  isMyActor,
} from "@/components/features/match-history/detailUtils";
import { getMatchHistoryUi } from "@/components/features/match-history/i18n";
import type {
  DetailLogFilter,
  MatchDetailPayload,
  MatchItem,
  MatchKillActor,
  MatchKillLogEntry,
  MiniMapMarker,
} from "@/components/features/match-history/types";

interface MatchDetailModalProps {
  selectedMatch: MatchItem | null;
  selectedDetail: MatchDetailPayload | null;
  detailLoading: boolean;
  detailError: string;
  accountId?: string;
  playerName?: string;
  onClose: () => void;
  detailLogFilter: DetailLogFilter;
  onDetailLogFilterChange: (value: DetailLogFilter) => void;
  activeKillId: string | null;
  onActiveKillIdChange: (value: string | null) => void;
  showRoute: boolean;
  onShowRouteChange: (value: boolean) => void;
  showBlueZone: boolean;
  onShowBlueZoneChange: (value: boolean) => void;
  isReplayPlaying: boolean;
  onReplayPlayingChange: (value: boolean) => void;
  replayTimeSec: number;
  onReplayTimeChange: (value: number) => void;
  replayDurationSec: number;
  filteredDetailLogs: MatchKillLogEntry[];
  playerCombatLogs: MatchKillLogEntry[];
  myKillLogs: MatchKillLogEntry[];
  myDeathLogs: MatchKillLogEntry[];
  myBotKillLogs: MatchKillLogEntry[];
  myPlayerKillLogs: MatchKillLogEntry[];
  myUnknownKillLogs: number;
  selectedKillValueLabel: string;
  selectedTeamSummary: {
    memberCount: number;
    teamKills: number;
    teamDamage: number;
    topTeammate: MatchItem["teammates"][number] | null;
  } | null;
  firstCombatLog: MatchKillLogEntry | null;
  selectedKillLog: MatchKillLogEntry | null;
  miniMapMarkers: MiniMapMarker[];
  weaponBreakdown: Array<{ weapon: string; count: number }>;
  zoneBreakdown: Array<{ zone: string; count: number }>;
  teammateIdentity: {
    accountIds: Set<string>;
    names: Set<string>;
    teamIds: Set<number>;
  };
}

interface ProcessedKillLogItem {
  id: string;
  killerName: string;
  killerId: string | null;
  killerColor: string;
  victimName: string;
  victimId: string | null;
  victimColor: string;
  weaponId: string;
  weaponName: string;
  weaponImagePath: string;
  isHeadshot: boolean;
  isDbno: boolean;
  time: string;
  raw: MatchKillLogEntry;
}

const LEGEND_ITEMS = [
  { label: "나 (본인)", color: "#FBBF24" },
  { label: "팀원", color: "#22D3EE" },
  { label: "적군", color: "#EF4444" },
] as const;

function getActorRelationStyle(
  actor: MatchKillActor | null,
  searchedId: string | undefined,
  teammateAccountIds: Set<string>,
  fallbackClassName: string,
): { className: string; style?: { color: string } } {
  if (!actor?.accountId) {
    return { className: fallbackClassName };
  }

  return {
    className: fallbackClassName,
    style: {
      color: getRelationColor(actor.accountId, searchedId, teammateAccountIds),
    },
  };
}

function getActorColor(actor: MatchKillActor | null, searchedId: string | undefined, teammateAccountIds: Set<string>): string {
  return getRelationColor(actor?.accountId ?? null, searchedId, teammateAccountIds);
}

export function MatchDetailModal({
  selectedMatch,
  selectedDetail,
  detailLoading,
  detailError,
  accountId,
  playerName,
  onClose,
  detailLogFilter,
  onDetailLogFilterChange,
  activeKillId,
  onActiveKillIdChange,
  showRoute,
  onShowRouteChange,
  showBlueZone,
  onShowBlueZoneChange,
  isReplayPlaying,
  onReplayPlayingChange,
  replayTimeSec,
  onReplayTimeChange,
  replayDurationSec,
  filteredDetailLogs,
  playerCombatLogs,
  myKillLogs,
  myDeathLogs,
  myBotKillLogs,
  myPlayerKillLogs,
  myUnknownKillLogs,
  selectedKillValueLabel,
  selectedTeamSummary,
  firstCombatLog,
  selectedKillLog,
  miniMapMarkers,
  weaponBreakdown,
  zoneBreakdown,
  teammateIdentity,
}: MatchDetailModalProps) {
  const { language, t } = useLanguage();
  const ui = useMemo(() => getMatchHistoryUi(language), [language]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const processedKillLogs = useMemo<ProcessedKillLogItem[]>(() => {
    return filteredDetailLogs.map((log) => {
      const weaponInfo = getWeaponInfo(log.causer);
      return {
        id: log.id,
        killerName: log.killer?.name || ui.unknown,
        killerId: log.killer?.accountId ?? null,
        killerColor: getActorColor(log.killer, accountId, teammateIdentity.accountIds),
        victimName: log.victim?.name || ui.unknown,
        victimId: log.victim?.accountId ?? null,
        victimColor: getActorColor(log.victim, accountId, teammateIdentity.accountIds),
        weaponId: log.causer,
        weaponName: weaponInfo.name,
        weaponImagePath: weaponInfo.imagePath,
        isHeadshot: log.damageType?.toLowerCase().includes("headshot") ?? false,
        isDbno: log.damageType?.toLowerCase().includes("groggy") ?? false,
        time: formatTelemetryTime(log.time),
        raw: log,
      };
    });
  }, [accountId, filteredDetailLogs, teammateIdentity.accountIds, ui.unknown]);

  if (!isMounted || !selectedMatch) {
    return null;
  }

  const weaponMax = Math.max(1, ...weaponBreakdown.map((item) => item.count));
  const zoneMax = Math.max(1, ...zoneBreakdown.map((item) => item.count));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm md:p-8">
      <div className="mx-auto max-w-[1600px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 text-zinc-100 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white md:text-lg">
              {ui.detailTitle}: {selectedMatch.map} {selectedMatch.result}
            </h3>
            <p className="truncate text-[11px] text-zinc-400">
              {selectedMatch.mode} · {selectedMatch.date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 p-2 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {detailLoading ? (
            <div className="flex h-52 items-center justify-center text-zinc-400">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-amber-400" />
              {ui.loadingTelemetry}
            </div>
          ) : detailError ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{detailError}</div>
          ) : !selectedDetail ? (
            <div className="rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-400">{ui.noDetail}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
                <StatCard label={t.matchHistory.headers.mapMode} value={selectedDetail.map.label} compact />
                <StatCard label={t.matchHistory.filter.mode} value={selectedDetail.modeLabel} compact />
                <StatCard label={t.matchHistory.filter.result} value={selectedMatch.result} compact />
                <StatCard label={t.matchHistory.headers.kills} value={selectedKillValueLabel} compact accent />
                <StatCard label={ui.botKills} value={String(myBotKillLogs.length)} compact />
                <StatCard label={ui.playerKills} value={String(myPlayerKillLogs.length)} compact />
                <StatCard label={t.matchHistory.headers.damage} value={selectedMatch.damage.toLocaleString()} compact />
                <StatCard
                  label="HS%"
                  value={`${(selectedMatch.kills > 0 ? (selectedMatch.headshots / selectedMatch.kills) * 100 : 0).toFixed(1)}%`}
                  compact
                />
                <StatCard label={ui.myCombat} value={String(playerCombatLogs.length)} compact />
                <StatCard label={ui.firstCombat} value={firstCombatLog ? formatTelemetryTime(firstCombatLog.time) : "-"} compact />
                <StatCard label={ui.teamKills} value={selectedTeamSummary ? `${selectedTeamSummary.teamKills}` : "-"} compact />
                <StatCard label={ui.teamDamage} value={selectedTeamSummary ? selectedTeamSummary.teamDamage.toLocaleString() : "-"} compact />
                <StatCard label={ui.unknownKills} value={String(myUnknownKillLogs)} compact />
                <StatCard label={ui.events} value={String(selectedDetail.totalKillEvents)} compact />
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900 p-3">
                <div className="mb-2 text-[11px] text-zinc-400">{ui.teamTitle}</div>
                {selectedMatch.teammates.length === 0 ? (
                  <p className="text-xs text-zinc-400">{ui.soloNotice}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedTeamSummary ? (
                      <div className="grid grid-cols-2 items-center gap-4 text-[11px] md:grid-cols-4">
                        <MetricColumn label={ui.teamMembers} value={`${selectedTeamSummary.memberCount}${ui.memberUnit}`} borderColor="border-zinc-500" />
                        <MetricColumn label={ui.teamKills} value={String(selectedTeamSummary.teamKills)} borderColor="border-cyan-400" />
                        <MetricColumn label={ui.teamDamage} value={Math.round(selectedTeamSummary.teamDamage).toLocaleString()} borderColor="border-amber-400" />
                        <MetricColumn
                          label={ui.ace}
                          value={selectedTeamSummary.topTeammate ? selectedTeamSummary.topTeammate.name : "-"}
                          borderColor="border-yellow-400"
                          accent
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedMatch.teammates.map((teammate) => (
                        <span
                          key={`detail-team-${selectedMatch.id}-${teammate.accountId ?? teammate.name}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/70 px-2 py-1 text-[11px] font-medium"
                          title={`K ${teammate.kills} · D ${Math.round(teammate.damage)}`}
                        >
                          <span className="max-w-[120px] truncate text-zinc-200">{teammate.name}</span>
                          <span className="text-cyan-400">K{teammate.kills}</span>
                          <span className="text-amber-400">D{Math.round(teammate.damage)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedDetail.playerDeath ? (
                <PlayerDeathCard
                  log={selectedDetail.playerDeath}
                  ui={ui}
                  language={language}
                  searchedId={accountId}
                  teammateIdentity={teammateIdentity}
                />
              ) : null}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="space-y-3 xl:col-span-7">
                  <div className="mb-4 flex flex-wrap gap-4 rounded-lg border border-white/10 bg-zinc-900/50 p-2 text-xs font-bold text-zinc-100">
                    {LEGEND_ITEMS.map((item) => (
                      <div key={item.label} className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>

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

                  <div className="rounded-xl border border-white/10 bg-zinc-900 p-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (replayDurationSec <= 0) return;
                          onReplayPlayingChange(!isReplayPlaying);
                        }}
                        className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-100 transition-colors hover:border-cyan-300/60"
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
                          onReplayTimeChange(Number.isFinite(next) ? next : 0);
                          onReplayPlayingChange(false);
                        }}
                        className="flex-1 accent-cyan-400"
                      />
                      <span className="min-w-[90px] text-right font-mono text-[11px] text-zinc-400">
                        {replayTimeSec}s / {Math.max(0, replayDurationSec)}s
                      </span>
                    </div>
                  </div>

                  {selectedKillLog ? (
                    <SelectedEventCard
                      log={selectedKillLog}
                      ui={ui}
                      language={language}
                      accountId={accountId}
                      playerName={playerName}
                      teammateIdentity={teammateIdentity}
                    />
                  ) : null}
                </div>

                <div className="space-y-3 xl:col-span-5">
                  <div className="rounded-xl border border-white/10 bg-zinc-900 p-3">
                    <div className="mb-2 text-[11px] text-zinc-400">{ui.mapOptions}</div>
                    <label className="mr-4 inline-flex items-center gap-2 text-xs text-zinc-200">
                      <input
                        type="checkbox"
                        checked={showBlueZone}
                        onChange={(event) => onShowBlueZoneChange(event.target.checked)}
                        className="accent-blue-400"
                      />
                      {ui.bluezone}
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs text-zinc-200">
                      <input
                        type="checkbox"
                        checked={showRoute}
                        onChange={(event) => onShowRouteChange(event.target.checked)}
                        className="accent-emerald-400"
                      />
                      {ui.route}
                    </label>
                  </div>

                  <div className="kill-log-container rounded-lg border border-white/10 bg-zinc-900/80 p-2">
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-2 pb-2">
                      <FilterChip
                        active={detailLogFilter === "all"}
                        onClick={() => onDetailLogFilterChange("all")}
                        label={`${ui.allLog} (${selectedDetail.killLogs.length})`}
                        tone="cyan"
                      />
                      <FilterChip
                        active={detailLogFilter === "myCombat"}
                        onClick={() => onDetailLogFilterChange("myCombat")}
                        label={`${ui.myCombat} (${playerCombatLogs.length})`}
                        tone="green"
                      />
                      <FilterChip
                        active={detailLogFilter === "myKills"}
                        onClick={() => onDetailLogFilterChange("myKills")}
                        label={`${ui.myKills} (${myKillLogs.length})`}
                        tone="green"
                      />
                      <FilterChip
                        active={detailLogFilter === "myDeath"}
                        onClick={() => onDetailLogFilterChange("myDeath")}
                        label={`${ui.myDeaths} (${myDeathLogs.length})`}
                        tone="rose"
                      />
                    </div>

                    <div className="mt-2 h-[400px] overflow-y-auto">
                      {processedKillLogs.length === 0 ? (
                        <div className="p-4 text-sm text-zinc-400">{ui.noLogs}</div>
                      ) : (
                        processedKillLogs.map((log) => (
                          <button
                            key={log.id}
                            type="button"
                            onClick={() => onActiveKillIdChange(log.id)}
                            className={`w-full rounded-md px-2 text-left transition-colors hover:bg-zinc-800/50 ${
                              activeKillId === log.id ? "bg-zinc-800/70" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-zinc-800/50 py-1.5 px-2">
                              <span style={{ color: log.killerColor }} className="flex-1 truncate text-right text-xs font-bold">
                                {log.killerName}
                              </span>

                              <div className="flex w-24 items-center justify-center gap-1 rounded bg-black/40 py-0.5">
                                <img
                                  src={log.weaponImagePath}
                                  className="h-4 object-contain"
                                  alt={log.weaponName}
                                  title={log.weaponName}
                                  onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = "/images/icons/Death.png";
                                  }}
                                />
                                {log.isHeadshot ? (
                                  <img src={getIconPath("headshot", "status")} className="h-3.5 w-3.5" alt="headshot" />
                                ) : null}
                                {log.isDbno ? (
                                  <img src={getIconPath("dbno", "status")} className="h-3.5 w-3.5" alt="dbno" />
                                ) : null}
                                {!log.isHeadshot && !log.isDbno ? <img src={getIconPath("death", "status")} className="h-3.5 w-3.5" alt="death" /> : null}
                              </div>

                              <span style={{ color: log.victimColor }} className="flex-1 truncate text-left text-xs font-bold">
                                {log.victimName}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-white/10 bg-zinc-900 p-3">
                    <div className="text-[11px] text-zinc-400">{ui.weaponUsage}</div>
                    {weaponBreakdown.length === 0 ? (
                      <div className="text-xs text-zinc-400">{ui.noWeaponLogs}</div>
                    ) : (
                      weaponBreakdown.map((item) => (
                        <BarRow key={item.weapon} label={item.weapon} value={item.count} max={weaponMax} tone="cyan" />
                      ))
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl border border-white/10 bg-zinc-900 p-3">
                    <div className="text-[11px] text-zinc-400">{ui.hitZone}</div>
                    {zoneBreakdown.length === 0 ? (
                      <div className="text-xs text-zinc-400">{ui.noLocationLogs}</div>
                    ) : (
                      zoneBreakdown.map((item) => (
                        <BarRow
                          key={item.zone}
                          label={ui.zoneLabels[item.zone as keyof typeof ui.zoneLabels] ?? item.zone}
                          value={item.count}
                          max={zoneMax}
                          tone="amber"
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerDeathCard({
  log,
  ui,
  language,
  searchedId,
  teammateIdentity,
}: {
  log: MatchKillLogEntry;
  ui: ReturnType<typeof getMatchHistoryUi>;
  language: "ko" | "en" | "ja" | "zh";
  searchedId?: string;
  teammateIdentity: MatchDetailModalProps["teammateIdentity"];
}) {
  const killerStyle = getActorRelationStyle(log.killer, searchedId, teammateIdentity.accountIds, "font-bold");
  const victimStyle = getActorRelationStyle(log.victim, searchedId, teammateIdentity.accountIds, "font-bold");

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
      <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-rose-400">
        <ShieldX className="h-3.5 w-3.5" />
        {ui.myDeathLog}
      </div>
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className={`rounded px-2 py-0.5 text-[10px] ${getActorTypeClass(log.killer)}`}>
          {getActorTypeLabel(log.killer, language)}
        </span>
        <span className={killerStyle.className} style={killerStyle.style}>
          {log.killer?.name ?? ui.unknown}
        </span>

        <div className="flex items-center gap-1 rounded-md bg-black/40 px-2.5 py-1">
          <CauserGraphic causer={log.causer} ui={ui} />
          <Crosshair className="ml-1 h-4 w-4 text-rose-400 opacity-80" />
        </div>

        <span className={victimStyle.className} style={victimStyle.style}>
          {log.victim?.name ?? ui.unknown}
        </span>
        <span className={`rounded px-2 py-0.5 text-[10px] ${getActorTypeClass(log.victim)}`}>
          {getActorTypeLabel(log.victim, language)}
        </span>
      </div>
      <div className="mt-1 font-mono text-[10px] text-zinc-400">{formatTelemetryTime(log.time)}</div>
    </div>
  );
}

function SelectedEventCard({
  log,
  ui,
  language,
  accountId,
  playerName,
  teammateIdentity,
}: {
  log: MatchKillLogEntry;
  ui: ReturnType<typeof getMatchHistoryUi>;
  language: "ko" | "en" | "ja" | "zh";
  accountId?: string;
  playerName?: string;
  teammateIdentity: MatchDetailModalProps["teammateIdentity"];
}) {
  const isMyKill = isMyActor(log.killer, accountId, playerName);
  const isMyDeath = isMyActor(log.victim, accountId, playerName);
  const isTeamKiller = Boolean(
    log.killer &&
      ((log.killer.accountId && teammateIdentity.accountIds.has(log.killer.accountId)) ||
        (log.killer.name && teammateIdentity.names.has(log.killer.name.toLowerCase())) ||
        (log.killer.teamId && teammateIdentity.teamIds.has(log.killer.teamId))),
  );
  const isTeamVictim = Boolean(
    log.victim &&
      ((log.victim.accountId && teammateIdentity.accountIds.has(log.victim.accountId)) ||
        (log.victim.name && teammateIdentity.names.has(log.victim.name.toLowerCase())) ||
        (log.victim.teamId && teammateIdentity.teamIds.has(log.victim.teamId))),
  );

  const killerColor = isMyKill
    ? "text-yellow-400 font-bold"
    : isTeamKiller
      ? "text-cyan-400 font-bold"
      : "text-rose-500 font-medium";
  const victimColor = isMyDeath
    ? "text-yellow-400 font-bold"
    : isTeamVictim
      ? "text-cyan-400 font-bold"
      : "text-rose-500 font-medium";
  const killerStyle = getActorRelationStyle(log.killer, accountId, teammateIdentity.accountIds, killerColor);
  const victimStyle = getActorRelationStyle(log.victim, accountId, teammateIdentity.accountIds, victimColor);
  const isGroggy = log.damageType?.toLowerCase().includes("groggy");
  const isHeadshot = log.damageType?.toLowerCase().includes("headshot");

  return (
    <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-3">
      <div className="mb-2 text-[11px] font-bold text-amber-300">{ui.selectedEvent}</div>
      <div className="flex items-center gap-3 text-sm">
        <span className={`rounded bg-black/30 px-1.5 py-0.5 text-[10px] ${getActorTypeClass(log.killer)}`}>
          {getActorTypeLabel(log.killer, language)}
        </span>
        <span className={killerStyle.className} style={killerStyle.style}>
          {log.killer?.name ?? ui.unknown}
        </span>

        <div className="flex items-center gap-1.5 rounded bg-black/40 px-2.5 py-1">
          <CauserGraphic causer={log.causer} ui={ui} />
          {isHeadshot ? (
            <img src={getIconPath("headshot", "status")} alt="Headshot" className="ml-0.5 h-4 w-4 object-contain" />
          ) : isGroggy ? (
            <img src={getIconPath("dbno", "status")} alt="DBNO" className="ml-0.5 h-4 w-4 object-contain" />
          ) : (
            <Skull className="ml-0.5 h-4 w-4 text-zinc-400" />
          )}
        </div>

        <span className={victimStyle.className} style={victimStyle.style}>
          {log.victim?.name ?? ui.unknown}
        </span>
        <span className={`rounded bg-black/30 px-1.5 py-0.5 text-[10px] ${getActorTypeClass(log.victim)}`}>
          {getActorTypeLabel(log.victim, language)}
        </span>
      </div>
      <div className="mt-2 border-t border-amber-500/10 pt-2 font-mono text-[11px] text-zinc-400">
        {formatTelemetryTime(log.time)} / {log.damageType} / X {formatMeters(log.x)} Y {formatMeters(log.y)}
      </div>
    </div>
  );
}

function CauserGraphic({ causer, ui }: { causer: string; ui: ReturnType<typeof getMatchHistoryUi> }) {
  const [fallback, setFallback] = useState(false);
  const badgeText = buildCauserBadgeText(causer);

  if (badgeText) {
    return <span className="max-w-[80px] truncate rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">{badgeText}</span>;
  }

  if (fallback) {
    return <span className="max-w-[80px] truncate rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-400">{buildCauserFallback(causer, ui)}</span>;
  }

  return (
    <img
      src={getCauserImage(causer)}
      alt={causer}
      className="h-5 w-auto object-contain drop-shadow-md"
      onError={() => setFallback(true)}
    />
  );
}

function StatCard({ label, value, compact = false, accent = false }: { label: string; value: string; compact?: boolean; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-zinc-900 ${compact ? "p-2.5" : "p-3"}`}>
      <p className="text-[10px] text-zinc-400">{label}</p>
      <p className={`${compact ? "text-xs" : "text-lg"} font-black ${accent ? "text-amber-400" : "text-zinc-100"}`}>{value}</p>
    </div>
  );
}

function MetricColumn({
  label,
  value,
  borderColor,
  accent = false,
}: {
  label: string;
  value: string;
  borderColor: string;
  accent?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-0.5 border-l-2 pl-3 ${borderColor}`}>
      <span className="text-[10px] uppercase tracking-widest text-zinc-400">{label}</span>
      <div className={`truncate text-lg font-black leading-none ${accent ? "text-amber-400" : "text-zinc-100"}`}>{value}</div>
    </div>
  );
}

function FilterChip({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone: "cyan" | "green" | "rose" }) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-300/60 bg-cyan-500/10 text-cyan-200"
      : tone === "green"
        ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-200"
        : "border-rose-300/60 bg-rose-500/10 text-rose-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2.5 py-1 text-[11px] font-bold ${active ? toneClass : "border-white/15 bg-white/5 text-zinc-400"}`}
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
        <span className="truncate text-zinc-100">{label}</span>
        <span className="font-mono text-zinc-400">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full bg-gradient-to-r ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
