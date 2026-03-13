"use client";

import { motion } from "framer-motion";
import { Trophy, Crosshair, Crown, Activity } from "lucide-react";
import Image from "next/image";
import type { RankedStats } from "@/entities/pubg/types";

const TIER_THRESHOLDS = [1500, 2000, 2500, 3000, 3400, 3800, 4300, 5000];

function getNextTierTarget(currentRp: number): number | null {
  for (const value of TIER_THRESHOLDS) {
    if (currentRp < value) return value;
  }
  return null;
}

export default function RankedStatsTable({ stats }: { stats: RankedStats | null }) {
  if (!stats) {
    return (
      <div className="rounded-3xl border border-gray-200/80 bg-white/95 p-8 text-center opacity-80 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-zinc-800/90 dark:shadow-[0_28px_90px_-52px_rgba(251,191,36,0.1)] flex flex-col items-center justify-center">
        <Trophy className="w-10 h-10 text-wbz-mute mb-2" />
        <h3 className="text-gray-900 dark:text-white font-bold">랭크 전적 없음</h3>
        <p className="text-xs text-wbz-mute">현재 시즌의 랭크 기록을 찾지 못했습니다.</p>
      </div>
    );
  }

  const winRateValue = Number.parseFloat(stats.winRate);
  const kdaValue = Number.parseFloat(stats.kda);
  const combatIndex = Math.round(stats.avgDmg / 8 + kdaValue * 35 + winRateValue * 4);
  const nextTarget = getNextTierTarget(stats.rp);
  const remain = nextTarget ? Math.max(0, nextTarget - stats.rp) : 0;
  const progress = nextTarget ? Math.min(100, (stats.rp / nextTarget) * 100) : 100;
  const rpLength = stats.rp.toLocaleString().length;
  const rpValueClass = rpLength >= 8 ? "text-sm lg:text-base" : rpLength >= 6 ? "text-base lg:text-lg" : "text-lg lg:text-xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-visible rounded-3xl border border-gray-200/80 bg-white/95 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.38)] transition-transform duration-300 hover:-translate-y-0.5 dark:border-white/10 dark:bg-zinc-800/90 dark:shadow-[0_28px_90px_-52px_rgba(251,191,36,0.1)]"
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-80"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${stats.tier.colorHex} 50%, transparent 100%)`,
        }}
      />

      <div className="relative p-6 lg:p-8">
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-2.5">
            <div className="text-[10px] text-cyan-100 uppercase font-bold mb-1">Combat Index</div>
            <div className="text-base font-black text-gray-900 dark:text-white">{combatIndex}</div>
          </div>
          <div className="rounded-lg border border-wbz-gold/30 bg-wbz-gold/10 p-2.5">
            <div className="text-[10px] text-wbz-gold uppercase font-bold mb-1">다음 목표 RP</div>
            <div className="text-xs font-black text-gray-900 dark:text-white leading-snug">
              {nextTarget ? `${nextTarget.toLocaleString()} (남은 ${remain.toLocaleString()})` : "최상위 티어 도달"}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-dark-base overflow-hidden">
              <div className="h-full bg-wbz-gold" style={{ width: `${Math.max(5, progress)}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between mb-4 gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-gray-100 dark:bg-dark-base flex-shrink-0">
              <Image
                src={stats.tier.imageUrl}
                alt={`${stats.tier.name} 티어`}
                fill
                className="object-contain p-1"
                sizes="64px"
                priority
              />
            </div>
            <div>
              <h3 className="text-xs font-bold text-wbz-mute flex items-center gap-1.5 uppercase tracking-wider">
                <Trophy className="w-3 h-3 text-wbz-gold" />
                랭크 시즌 ({stats.modeLabel})
              </h3>
              <div className={`text-2xl lg:text-[22px] leading-tight whitespace-nowrap font-black mt-1 ${stats.tier.color} drop-shadow-lg`}>
                {stats.tier.name}
              </div>
            </div>
          </div>
          <div className="text-right min-w-0 pl-2 sm:pl-3">
            <span className={`${rpValueClass} font-mono tracking-tight font-bold text-gray-900 dark:text-white block whitespace-nowrap`}>
              {stats.rp.toLocaleString()} <span className="text-[10px] text-wbz-mute font-sans">RP</span>
            </span>
            <span className="text-[10px] text-wbz-mute uppercase tracking-wide whitespace-nowrap">
              시즌 최고 RP: {stats.bestRp.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Crosshair className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] text-wbz-mute uppercase font-bold">K/D</span>
            </div>
            <div className="text-[26px] lg:text-[24px] leading-none font-black text-gray-900 dark:text-white whitespace-nowrap">{stats.kda}</div>
          </div>

          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] text-wbz-mute uppercase font-bold">평균 딜량</span>
            </div>
            <div className="text-[26px] lg:text-[24px] leading-none font-black text-gray-900 dark:text-white whitespace-nowrap">
              {stats.avgDmg.toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-3.5 h-3.5 text-wbz-gold" />
              <span className="text-[10px] text-wbz-mute uppercase font-bold">승률</span>
            </div>
            <div className="text-lg font-black text-wbz-gold whitespace-nowrap">{stats.winRate}%</div>
            <div className="text-[10px] text-wbz-mute mt-1">
              {stats.wins.toLocaleString()}승 / {stats.matches.toLocaleString()}전
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-[10px] text-wbz-mute uppercase font-bold">최고 RP</span>
            </div>
            <div className="text-lg font-black text-purple-400 whitespace-nowrap">{stats.bestRp.toLocaleString()}</div>
            <div className="text-[10px] text-wbz-mute mt-1">시즌 최고치</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
