"use client";

import { useMemo, useState } from "react";
import { Crosshair, Target, Trophy } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { PubgWeapon } from "@/lib/pubgWeapons";
import { buildWeaponAnalyticsRows, type WeaponAnalyticsRow, type WeaponQueueMode } from "@/lib/weaponStatsAnalytics";
import WeaponDetailThumbnail from "@/components/features/WeaponDetailThumbnail";

interface WeaponsStatsTableProps {
  weapons: PubgWeapon[];
}

export default function WeaponsStatsTable({ weapons }: WeaponsStatsTableProps) {
  const { language } = useLanguage();
  const [mode, setMode] = useState<WeaponQueueMode>("competitive");

  const text =
    language === "en"
      ? {
          title: "Weapons Analytics",
          subtitle: "WBZ internal performance index built from official PUBG weapon specs.",
          competitive: "Ranked",
          normal: "Normal",
          weapon: "Weapon",
          kills: "Kills",
          headshot: "Headshot",
          longestKill: "Longest Kill",
          damagePerMatch: "Damage / Match",
          accuracy: "Accuracy",
          noData: "No weapon data available.",
        }
      : language === "ja"
        ? {
            title: "武器統計",
            subtitle: "PUBG公式武器スペックを基準にしたWBZ内部パフォーマンス指標です。",
            competitive: "競争戦",
            normal: "一般戦",
            weapon: "武器",
            kills: "キル",
            headshot: "ヘッドショット",
            longestKill: "最長距離",
            damagePerMatch: "平均ダメージ",
            accuracy: "命中率",
            noData: "武器データがありません。",
          }
        : language === "zh"
          ? {
              title: "武器统计",
              subtitle: "基于 PUBG 官方武器参数生成的 WBZ 内部性能指数。",
              competitive: "排位赛",
              normal: "普通赛",
              weapon: "武器",
              kills: "击杀",
              headshot: "爆头率",
              longestKill: "最远击杀",
              damagePerMatch: "场均伤害",
              accuracy: "命中率",
              noData: "暂无武器数据。",
            }
          : {
              title: "무기 통계",
              subtitle: "PUBG 공식 무기 스펙을 기반으로 계산한 WBZ 내부 퍼포먼스 지표입니다.",
              competitive: "경쟁전",
              normal: "일반전",
              weapon: "무기",
              kills: "킬",
              headshot: "헤드샷(%)",
              longestKill: "최장 거리 킬",
              damagePerMatch: "딜량/매치",
              accuracy: "명중률",
              noData: "무기 데이터가 없습니다.",
            };

  const rows = useMemo<WeaponAnalyticsRow[]>(() => buildWeaponAnalyticsRows(weapons, mode), [mode, weapons]);

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/95 p-5 shadow-[0_24px_90px_-50px_rgba(0,0,0,0.55)]">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-wbz-gold/20 bg-wbz-gold/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-wbz-gold">
            <Target className="h-3.5 w-3.5" />
            Weapon Board
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">{text.title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{text.subtitle}</p>
        </div>

        <div className="inline-flex rounded-full border border-white/10 bg-black/30 p-1">
          {([
            { value: "competitive", label: text.competitive, icon: Trophy },
            { value: "normal", label: text.normal, icon: Crosshair },
          ] as const).map((item) => {
            const Icon = item.icon;
            const active = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition ${
                  active
                    ? "bg-wbz-gold text-black shadow-[0_0_30px_rgba(240,185,11,0.24)]"
                    : "text-zinc-400 hover:bg-zinc-800/70 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-14 text-center text-sm text-zinc-500">{text.noData}</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[minmax(260px,2.2fr)_0.8fr_0.9fr_1fr_1fr_0.9fr] gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
              <div>{text.weapon}</div>
              <div className="text-right">{text.kills}</div>
              <div className="text-right">{text.headshot}</div>
              <div className="text-right">{text.longestKill}</div>
              <div className="text-right">{text.damagePerMatch}</div>
              <div className="text-right">{text.accuracy}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(260px,2.2fr)_0.8fr_0.9fr_1fr_1fr_0.9fr] items-center gap-4 border-b border-gray-800 px-4 py-4 transition hover:bg-zinc-800/50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-zinc-950/80 px-2">
                      <WeaponDetailThumbnail weaponName={row.name} weaponKey={row.weaponKey} className="h-auto w-20 max-h-10" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-white">{row.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{row.categoryName}</div>
                    </div>
                  </div>

                  <StatValue value={row.kills.toLocaleString()} tone="gold" />
                  <StatValue value={`${row.headshotRate.toFixed(1)}%`} />
                  <StatValue value={`${row.longestKill.toLocaleString()}m`} />
                  <StatValue value={row.damagePerMatch.toLocaleString()} />
                  <StatValue value={`${row.accuracy.toFixed(1)}%`} tone="cyan" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StatValue({ value, tone = "default" }: { value: string; tone?: "default" | "gold" | "cyan" }) {
  const toneClass =
    tone === "gold" ? "text-wbz-gold" : tone === "cyan" ? "text-cyan-300" : "text-zinc-100";

  return <div className={`text-right text-sm font-black tabular-nums ${toneClass}`}>{value}</div>;
}
