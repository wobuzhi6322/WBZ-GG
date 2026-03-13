"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getWeaponDetailImage } from "@/entities/pubg/lib/mapper";
import type { WeaponStatDetail } from "@/entities/pubg/types";

interface WeaponStatsTableProps {
  weapons: WeaponStatDetail[];
}

export default function WeaponStatsTable({ weapons }: WeaponStatsTableProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"ranked" | "normal">("ranked");

  const labels =
    language === "en"
      ? {
          title: "Weapons",
          ranked: "Ranked",
          normal: "Normal",
          weapon: "Weapon",
          kills: "Kills",
          headshots: "Headshots",
          damage: "Damage",
          longestKill: "Longest Kill",
          empty: "No weapon data available.",
        }
      : language === "ja"
        ? {
            title: "武器",
            ranked: "ランクマッチ",
            normal: "ノーマル",
            weapon: "武器",
            kills: "キル",
            headshots: "ヘッドショット",
            damage: "ダメージ",
            longestKill: "最長キル",
            empty: "武器データがありません。",
          }
        : language === "zh"
          ? {
              title: "武器",
              ranked: "竞技比赛",
              normal: "普通比赛",
              weapon: "武器",
              kills: "击杀",
              headshots: "爆头",
              damage: "伤害",
              longestKill: "最远击杀",
              empty: "暂无武器数据。",
            }
          : {
              title: "무기",
              ranked: "경쟁전",
              normal: "일반전",
              weapon: "무기",
              kills: "킬",
              headshots: "헤드샷",
              damage: "데미지",
              longestKill: "최장 거리",
              empty: "무기 전적 데이터가 없습니다.",
            };

  const safeWeapons = Array.isArray(weapons) ? weapons : [];
  
  const currentWeapons = safeWeapons
    .map((detail) => {
      const modeData = activeTab === "ranked" ? detail.competitive : detail.official;
      return {
        weapon: detail.weapon,
        kills: modeData.kills,
        headShots: modeData.headShots,
        damagePlayer: modeData.damagePlayer,
        longestDefeat: modeData.longestDefeat,
      };
    })
    .filter((w) => w.kills > 0)
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 30); // show top 30 weapons for performance

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200/80 bg-white/95 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-dark-surface/95">
      <div className="flex items-center justify-between border-b border-gray-200/50 bg-gray-50/50 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
        <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
          {labels.title}
        </h3>
        <div className="flex gap-2 rounded-xl bg-gray-100 p-1 dark:bg-black/40">
          <button
            onClick={() => setActiveTab("ranked")}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors ${
              activeTab === "ranked"
                ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {labels.ranked}
          </button>
          <button
            onClick={() => setActiveTab("normal")}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors ${
              activeTab === "normal"
                ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {labels.normal}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300 min-w-[600px]">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold tracking-wider">{labels.weapon}</th>
              <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">{labels.kills}</th>
              <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">{labels.headshots}</th>
              <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">{labels.damage}</th>
              <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">{labels.longestKill}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/80 dark:divide-gray-800">
            {currentWeapons.length > 0 ? (
              currentWeapons.map((detail, idx) => {
                const headshotRatio = detail.kills > 0 ? ((detail.headShots / detail.kills) * 100).toFixed(1) : "0.0";
                return (
                  <tr
                    key={detail.weapon}
                    className="group transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-4">
                        <div className="relative flex h-10 w-24 shrink-0 items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getWeaponDetailImage(detail.weapon)}
                            alt={detail.weapon}
                            className="h-full w-full object-contain drop-shadow-sm filter dark:invert-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/weapons_detail/Item_Weapon_M16A4_C_h.png"; // Fallback to silhouette
                              target.className = "h-full w-full object-contain opacity-20";
                            }}
                          />
                        </div>
                        <div className="font-bold text-gray-900 group-hover:text-wbz-gold dark:text-white">
                          {detail.weapon}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                      {detail.kills.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold text-rose-500">{headshotRatio}%</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {detail.headShots.toLocaleString()} hit
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700 dark:text-gray-300">
                      {Math.round(detail.damagePlayer).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700 dark:text-gray-300">
                      {detail.longestDefeat.toFixed(1)}m
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  {labels.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
