"use client";

import { useLanguage } from "@/context/LanguageContext";
import { MatchHistoryItem } from "@/components/features/match-history/MatchHistoryItem";
import { MatchDetailModal } from "@/components/features/match-history/MatchDetailModal";
import { MatchHistoryFilters } from "@/components/features/match-history/MatchHistoryFilters";
import { MATCH_HISTORY_GRID_TEMPLATE } from "@/components/features/match-history/layout";
import { MatchHistoryPagination } from "@/components/features/match-history/MatchHistoryPagination";
import type { MatchHistoryProps, PageSizeOption, SortKey, StatusFilter } from "@/components/features/match-history/types";
import { useMatchHistoryData } from "@/components/features/match-history/useMatchHistoryData";

export default function MatchHistory(props: MatchHistoryProps) {
  const { t } = useLanguage();
  const {
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
    pageSizeOptions,
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
  } = useMatchHistoryData(props);

  if (!props.matches?.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-wbz-mute dark:border-white/10 dark:bg-dark-surface">
        {ui.noRecent}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <MatchHistoryFilters
          mapFilter={mapFilter}
          onMapFilterChange={setMapFilter}
          mapOptions={mapOptions}
          modeFilter={modeFilter}
          onModeFilterChange={setModeFilter}
          modeOptions={modeOptions}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => setStatusFilter(value as StatusFilter)}
          sortKey={sortKey}
          onSortKeyChange={(value) => setSortKey(value as SortKey)}
          pageSize={pageSize}
          onPageSizeChange={(value) => setPageSize(value as PageSizeOption)}
          pageSizeOptions={pageSizeOptions}
          resultCount={sortedMatches.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSizeLabel={ui.pageSize}
        />

        {sortedMatches.length === 0 ? (
          <div className="rounded-3xl border border-gray-200/80 bg-white/95 py-10 text-center text-wbz-mute shadow-[0_24px_80px_-52px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-zinc-800/90 dark:shadow-[0_28px_90px_-52px_rgba(251,191,36,0.1)]">
            {ui.noFiltered}
          </div>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white/95 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-zinc-800/90 dark:shadow-[0_28px_90px_-52px_rgba(251,191,36,0.1)]">
            <div className={`hidden lg:grid ${MATCH_HISTORY_GRID_TEMPLATE} items-center gap-3 bg-gray-50 px-2 py-2 text-[10px] tracking-wide text-wbz-mute dark:bg-white/5`}>
              <div className="min-w-0 whitespace-nowrap">{t.matchHistory.headers.resultDate}</div>
              <div className="min-w-0 whitespace-nowrap text-center">{t.matchHistory.headers.mapMode}</div>
              <div className="min-w-0 whitespace-nowrap text-center">{t.matchHistory.headers.weapon}</div>
              <div className="min-w-0 whitespace-nowrap text-center">{t.matchHistory.headers.kills}</div>
              <div className="min-w-0 whitespace-nowrap text-center">{t.matchHistory.headers.damage}</div>
              <div className="min-w-0 whitespace-nowrap text-center">{t.matchHistory.headers.dbno}</div>
              <div className="min-w-0 whitespace-nowrap text-center">{t.matchHistory.headers.distance}</div>
              <div className="min-w-0 whitespace-nowrap text-center">{t.matchHistory.headers.survival}</div>
              <div className="min-w-0 whitespace-nowrap text-center">{t.matchHistory.headers.snipe}</div>
              <div className="min-w-0 whitespace-nowrap">{t.matchHistory.headers.teammates}</div>
              <div className="min-w-0 whitespace-nowrap text-center">{t.matchHistory.headers.detail}</div>
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
                  accountId={props.accountId}
                  playerName={props.playerName}
                  platform={props.platform ?? "steam"}
                  onOpenDetail={() => void loadMatchDetail(match)}
                />
              ))}
            </div>
            <MatchHistoryPagination
              pageInfoText={pageInfoText}
              currentPage={currentPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              prevLabel={ui.prev}
              nextLabel={ui.next}
              onPageChange={setCurrentPage}
            />
          </section>
        )}
      </div>

      <MatchDetailModal
        selectedMatch={selectedMatch}
        selectedDetail={selectedDetail}
        detailLoading={detailLoading}
        detailError={detailError}
        accountId={props.accountId}
        playerName={props.playerName}
        onClose={closeDetail}
        detailLogFilter={detailLogFilter}
        onDetailLogFilterChange={setDetailLogFilter}
        activeKillId={activeKillId}
        onActiveKillIdChange={setActiveKillId}
        showRoute={showRoute}
        onShowRouteChange={setShowRoute}
        showBlueZone={showBlueZone}
        onShowBlueZoneChange={setShowBlueZone}
        isReplayPlaying={isReplayPlaying}
        onReplayPlayingChange={setIsReplayPlaying}
        replayTimeSec={replayTimeSec}
        onReplayTimeChange={setReplayTimeSec}
        replayDurationSec={replayDurationSec}
        filteredDetailLogs={filteredDetailLogs}
        playerCombatLogs={playerCombatLogs}
        myKillLogs={myKillLogs}
        myDeathLogs={myDeathLogs}
        myBotKillLogs={myBotKillLogs}
        myPlayerKillLogs={myPlayerKillLogs}
        myUnknownKillLogs={myUnknownKillLogs}
        selectedKillValueLabel={selectedKillValueLabel}
        selectedTeamSummary={selectedTeamSummary}
        firstCombatLog={firstCombatLog}
        selectedKillLog={selectedKillLog}
        miniMapMarkers={miniMapMarkers}
        weaponBreakdown={weaponBreakdown}
        zoneBreakdown={zoneBreakdown}
        teammateIdentity={teammateIdentity}
      />
    </>
  );
}
