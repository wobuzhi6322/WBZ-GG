"use client";

import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useMemo } from "react";
import type { MatchSummary } from "@/lib/pubg";

interface ActivityHeatmapProps {
  matches?: MatchSummary[];
  compact?: boolean;
  micro?: boolean;
}

export default function ActivityHeatmap({ matches = [], compact = false, micro = false }: ActivityHeatmapProps) {
  const { t } = useLanguage();
  const labels = t.activityHeatmap;
  const days = labels.days;

  const shellClass = micro 
    ? "mt-2 pt-3 border-t border-gray-200/50 dark:border-white/10"
    : compact
      ? "rounded-xl border border-gray-200/80 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-800/90"
      : "rounded-3xl border border-gray-200/80 bg-white/95 p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-zinc-800/90";

  // Dummy Heatmap Implementation if no matches are passed, or just random values to populate the grid
  const heatmapData = useMemo(() => {
    const data = Array.from({ length: 7 }, () => Array(24).fill(0));
    
    // Fallback dummy data generating some organic patterns
    if (matches.length === 0) {
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          if ((h >= 18 && h <= 23) || (d >= 5 && h >= 14)) {
            data[d][h] = Math.random() > 0.4 ? Math.floor(Math.random() * 4) + 1 : 0;
          } else {
            data[d][h] = Math.random() > 0.8 ? 1 : 0;
          }
        }
      }
    } else {
      // Actually map timestamps
      matches.slice(0, 20).forEach((m) => {
        if (!m.createdAt) return;
        const date = new Date(m.createdAt);
        const day = date.getDay();
        const hour = date.getHours();
        data[day][hour] += 1;
      });
    }
    
    return data;
  }, [matches]);

  const getColorClass = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700/50";
    if (count === 1) return "bg-yellow-400/60 dark:bg-yellow-500/40 border border-yellow-400/20";
    if (count === 2) return "bg-yellow-400 dark:bg-yellow-400 border border-yellow-400/50 shadow-sm";
    return "bg-orange-500 dark:bg-orange-500 border border-orange-500/50 shadow-[0_0_8px_rgba(249,115,22,0.4)]";
  };

  if (micro) {
    return (
      <div className={shellClass}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300">
            <CalendarDays className="h-3 w-3" />
            <span className="text-[10px] font-bold">{labels.title}</span>
          </div>
          <div className="text-[9px] text-gray-400">{labels.subtitle}</div>
        </div>
        <div className="overflow-x-auto overflow-y-hidden pb-1 scrollbar-hide">
          <div className="min-w-[280px]">
            <div className="flex mb-0.5">
              <div className="w-5 shrink-0"></div>
              <div className="flex-1 flex justify-between text-[7px] text-gray-400 px-0.5">
                <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
              </div>
            </div>
            <div className="flex flex-col gap-[2px]">
              {days.map((day, dIdx) => (
                <div key={day} className="flex items-center gap-1.5">
                  <div className="w-5 shrink-0 text-[8px] font-bold text-gray-500 dark:text-gray-400 text-right">{day}</div>
                  <div className="flex-1 flex items-center justify-between gap-[2px]">
                    {heatmapData[dIdx].map((count, hIdx) => (
                      <div key={hIdx} className={`h-1.5 sm:h-2 flex-1 rounded-[1px] transition-colors ${getColorClass(count)}`} title={`${day} ${hIdx}:00 - ${count} matches`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={shellClass}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center justify-center rounded-2xl border border-wbz-gold/20 bg-wbz-gold/10 text-wbz-gold ${compact ? "h-9 w-9" : "h-11 w-11"}`}>
          <CalendarDays className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </span>
        <div>
          <h3 className={`${compact ? "text-[13px]" : "text-xl"} font-black tracking-tight text-gray-900 dark:text-white`}>{labels.title}</h3>
          <p className={`${compact ? "mt-0.5 text-[10px]" : "mt-1 text-sm leading-6"} text-gray-600 dark:text-zinc-400`}>{labels.subtitle}</p>
        </div>
      </div>

      <div
        className={`mt-4 pb-1 ${compact ? "overflow-visible pt-0" : "overflow-x-auto overflow-y-hidden pt-2"} [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/20`}
      >
        <div className={compact ? "min-w-0 overflow-hidden" : "min-w-[480px]"}>
          <div className="flex mb-1.5">
            <div className={`${compact ? "w-6" : "w-8"} shrink-0`}></div>
            <div className={`flex-1 flex justify-between ${compact ? "text-[9px]" : "text-xs"} text-zinc-400 px-1 items-center`}>
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>23</span>
            </div>
          </div>
          <div className={`flex flex-col ${compact ? "gap-0.5" : "gap-1 sm:gap-1.5"}`}>
            {days.map((day, dIdx) => (
              <div key={day} className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
                <div className={`${compact ? "w-6 text-[9px]" : "w-8 text-[11px] sm:text-xs"} shrink-0 font-bold text-zinc-400 text-right overflow-hidden text-ellipsis`}>
                  {day}
                </div>
                <div className={`flex-1 flex items-center justify-between ${compact ? "gap-[2px] pr-0" : "gap-1 pr-1"}`}>
                  {heatmapData[dIdx].map((count, hIdx) => (
                    <div
                      key={hIdx}
                      className={`${compact ? "h-2.5" : "h-3 sm:h-4"} flex-1 rounded-sm transition-colors ${getColorClass(count)}`}
                      title={`${day} ${hIdx}:00 - ${count} matches`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
