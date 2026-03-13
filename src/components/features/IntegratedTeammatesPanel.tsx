"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface IntegratedTeammate {
  name: string;
  accountId: string | null;
  sharedMatches: number;
  wins: number;
  kills: number;
  winRate: number;
  kd: number;
}

interface IntegratedTeammatesPanelProps {
  teammates: IntegratedTeammate[];
  compact?: boolean;
}

export function IntegratedTeammatesPanel({
  teammates,
  compact = false,
}: IntegratedTeammatesPanelProps) {
  const { t: ui } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  if (!teammates || teammates.length === 0) {
    return null;
  }

  const topCount = Math.min(2, teammates.length);
  const soulmates = teammates.slice(0, topCount);
  const others = teammates.slice(topCount);
  const displayedOthers = showAll ? others : others.slice(0, 5);

  const shellClass = compact
    ? "rounded-2xl border border-gray-200/60 bg-white/60 p-4 dark:border-white/10 dark:bg-dark-surface/60 overflow-hidden"
    : "rounded-3xl border border-gray-200/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-dark-surface/95 overflow-hidden";

  const PlayerRow = ({ player }: { player: IntegratedTeammate }) => {
    return (
      <Link
        href={`/profile/${encodeURIComponent(player.name)}`}
        className="grid grid-cols-[minmax(0,1fr)_44px_48px] gap-2 items-center py-1.5 px-2 hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-lg transition-colors group"
      >
        <div className="flex items-center min-w-0 pr-1 px-1">
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs truncate group-hover:text-amber-500 transition-colors">
            {player.name}
          </span>
        </div>

        <div className="text-center text-[11px] text-gray-400 font-medium">
          {player.sharedMatches}
        </div>

        <div className="text-right text-[11px] text-red-500 dark:text-red-400 font-bold whitespace-nowrap">
          {Math.round(player.winRate)}%
        </div>
      </Link>
    );
  };

  return (
    <section className={shellClass}>
      <div className="mb-3 px-1 overflow-hidden">
        <h3 className={`${compact ? "text-[13px]" : "text-sm sm:text-base"} font-extrabold tracking-tight text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis`}>
          {ui.common.integratedTeammatesTitle}
        </h3>
      </div>

      <div className="w-full text-xs bg-gray-50/50 dark:bg-black/20 rounded-xl overflow-hidden border border-gray-100 dark:border-white/5">
        {/* Table Header */}
        <div className="grid grid-cols-[minmax(0,1fr)_44px_48px] gap-2 items-center py-2 px-2 bg-gray-100 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400">
          <div className="pl-1 whitespace-nowrap">{ui.common.ally}</div>
          <div className="text-center whitespace-nowrap">{ui.common.matchesHeader}</div>
          <div className="text-right pr-1 whitespace-nowrap">{ui.common.winRateHeader}</div>
        </div>

        <div className={compact ? "flex flex-col overflow-hidden p-1" : "flex flex-col max-h-68 overflow-y-auto custom-scrollbar overflow-x-hidden p-1"}>
          {/* 영혼의 깐부 섹션 */}
          {soulmates.length > 0 && (
            <div className="flex flex-col mb-1 pb-1 border-b border-gray-200/60 dark:border-gray-800/60">
               {soulmates.map((player) => (
                 <PlayerRow key={player.name} player={player} />
               ))}
            </div>
          )}

          {/* 나머지 팀원 섹션 */}
          {others.length > 0 && (
            <div className="flex flex-col">
                {displayedOthers.map((player) => (
                  <PlayerRow key={player.name} player={player} />
                ))}
                
                {!showAll && others.length > 5 && (
                  <button 
                    onClick={() => setShowAll(true)}
                    className="mt-1.5 mx-1 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 text-[10px] font-bold text-gray-400 dark:text-gray-500 transition-colors flex items-center justify-center gap-1"
                  >
                    {ui.common.more} ({others.length - 5})
                    <ChevronDown className="w-3 h-3" />
                  </button>
                )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
