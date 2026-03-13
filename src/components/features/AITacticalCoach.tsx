"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Brain, Crosshair, Shield, Target, TrendingUp } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { MatchSummary, PubgStats } from "@/entities/pubg/types";

type CoachMode = "aggressive" | "balanced" | "survival";

interface AITacticalCoachProps {
  overview: PubgStats["overview"] | null;
  matches: MatchSummary[];
  tierName: string | null;
}

interface CoachMetrics {
  avgKills: number;
  avgDamage: number;
  avgSurvivalSec: number;
  top10Rate: number;
  winRate: number;
  headshotRate: number;
  damageStdDev: number;
  aggression: number;
  stability: number;
  execution: number;
  overall: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calcStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function roundUpByTen(value: number): number {
  return Math.ceil(value / 10) * 10;
}

function toGaugeClass(value: number): string {
  if (value >= 80) return "text-emerald-500 dark:text-emerald-300";
  if (value >= 60) return "text-amber-500 dark:text-amber-300";
  return "text-rose-500 dark:text-rose-300";
}

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key: string) => `${values[key.trim()] ?? ""}`);
}

export default function AITacticalCoach({ overview, matches, tierName }: AITacticalCoachProps) {
  const { t } = useLanguage();
  const labels = t.aiCoach;
  const [mode, setMode] = useState<CoachMode>("balanced");

  const metrics = useMemo<CoachMetrics | null>(() => {
    const recent = matches.slice(0, 20);
    if (recent.length === 0) return null;

    const totalKills = recent.reduce((sum, item) => sum + item.kills, 0);
    const totalDamage = recent.reduce((sum, item) => sum + item.damage, 0);
    const totalSurvival = recent.reduce((sum, item) => sum + item.timeSurvivedSeconds, 0);
    const totalHeadshots = recent.reduce((sum, item) => sum + item.headshots, 0);
    const top10Count = recent.filter((item) => item.status === "win" || item.status === "top10").length;
    const winCount = recent.filter((item) => item.status === "win").length;

    const avgKills = totalKills / recent.length;
    const avgDamage = totalDamage / recent.length;
    const avgSurvivalSec = totalSurvival / recent.length;
    const top10Rate = (top10Count / recent.length) * 100;
    const winRate = (winCount / recent.length) * 100;
    const headshotRate = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;
    const damageStdDev = calcStdDev(recent.map((item) => item.damage));

    const aggression = clamp(avgKills * 24 + avgDamage / 18 - avgSurvivalSec / 22, 0, 100);
    const stability = clamp(100 - damageStdDev / 4 - Math.abs(55 - top10Rate), 0, 100);
    const execution = clamp(winRate * 2.4 + top10Rate * 0.7 + headshotRate * 0.9, 0, 100);
    const overall = Math.round(aggression * 0.3 + stability * 0.35 + execution * 0.35);

    return {
      avgKills,
      avgDamage,
      avgSurvivalSec,
      top10Rate,
      winRate,
      headshotRate,
      damageStdDev,
      aggression,
      stability,
      execution,
      overall,
    };
  }, [matches]);

  const insights = useMemo(() => {
    if (!metrics) {
      return { strengths: [] as string[], weaknesses: [] as string[], missions: [] as string[], summary: labels.noData };
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (metrics.avgDamage >= 260) strengths.push(labels.strengthsText.highDamage);
    if (metrics.top10Rate >= 45) strengths.push(labels.strengthsText.stableTop10);
    if (metrics.headshotRate >= 20) strengths.push(labels.strengthsText.headshot);

    if (metrics.avgDamage < 180) weaknesses.push(labels.weaknessesText.earlyDamage);
    if (metrics.avgKills < 1.1) weaknesses.push(labels.weaknessesText.lowKills);
    if (metrics.top10Rate < 30) weaknesses.push(labels.weaknessesText.lateGame);

    const targetDamage = roundUpByTen(metrics.avgDamage + 30);
    const targetKills = Math.max(2, Math.ceil(metrics.avgKills + 0.4));
    const targetTop10 = Math.min(95, Math.round(metrics.top10Rate + 8));
    const targetSurvivalMin = Math.max(6, Math.round(metrics.avgSurvivalSec / 60 + 1));

    const missions =
      mode === "aggressive"
        ? [
            interpolate(labels.missionTemplates.aggressiveDamage, { value: targetDamage }),
            interpolate(labels.missionTemplates.aggressiveKills, { value: targetKills }),
          ]
        : mode === "survival"
          ? [
              interpolate(labels.missionTemplates.survivalTime, { value: targetSurvivalMin + 1 }),
              labels.missionTemplates.survivalRoute,
            ]
          : [
              interpolate(labels.missionTemplates.balancedTop10, { value: targetTop10 }),
              interpolate(labels.missionTemplates.balancedCombo, {
                kills: targetKills,
                minutes: targetSurvivalMin,
              }),
            ];

    return { strengths, weaknesses, missions, summary: labels.summaryByMode[mode] };
  }, [labels, metrics, mode]);

  if (!metrics) {
    return (
      <div className="rounded-3xl border border-gray-200/80 bg-white/95 p-6 text-sm text-wbz-mute shadow-[0_24px_80px_-52px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-zinc-800/90 dark:shadow-[0_28px_90px_-52px_rgba(251,191,36,0.1)]">
        {labels.noData}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-gray-200/80 bg-white/95 p-6 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.38)] transition-transform duration-300 hover:-translate-y-0.5 dark:border-white/10 dark:bg-zinc-800/90 dark:shadow-[0_28px_90px_-52px_rgba(251,191,36,0.1)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-wbz-gold" />
          <h3 className="text-lg font-black text-gray-900 dark:text-white">{labels.title}</h3>
        </div>
        <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] text-wbz-mute dark:border-white/15 dark:bg-white/5">
          {tierName ?? "-"}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {([
          { key: "aggressive", label: labels.mode.aggressive },
          { key: "balanced", label: labels.mode.balanced },
          { key: "survival", label: labels.mode.survival },
        ] as Array<{ key: CoachMode; label: string }>).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
              mode === item.key
                ? "border-wbz-gold bg-wbz-gold/15 text-wbz-gold"
                : "border-gray-200 bg-gray-50 text-wbz-mute dark:border-white/10 dark:bg-white/5"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-3 rounded-2xl border border-gray-200 bg-gray-100/80 p-4 dark:border-white/10 dark:bg-dark-surface">
        <div className="mb-1 text-[11px] text-wbz-mute">{labels.summaryTitle}</div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">{insights.summary}</div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <GaugeCard icon={<Crosshair className="h-3 w-3" />} title={labels.gauges.aggression} value={Math.round(metrics.aggression)} />
        <GaugeCard icon={<Shield className="h-3 w-3" />} title={labels.gauges.stability} value={Math.round(metrics.stability)} />
        <GaugeCard icon={<Target className="h-3 w-3" />} title={labels.gauges.execution} value={Math.round(metrics.execution)} />
        <GaugeCard icon={<TrendingUp className="h-3 w-3" />} title={labels.gauges.overall} value={metrics.overall} />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2.5 xl:grid-cols-2">
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4">
          <div className="mb-1 text-xs font-black text-emerald-300">{labels.strengths}</div>
          {insights.strengths.length === 0 ? (
            <p className="text-xs text-emerald-200/80">-</p>
          ) : (
            <div className="space-y-1">
              {insights.strengths.slice(0, 3).map((item) => (
                <p key={item} className="text-xs text-emerald-200">
                  {item}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4">
          <div className="mb-1 text-xs font-black text-amber-300">{labels.weaknesses}</div>
          {insights.weaknesses.length === 0 ? (
            <p className="text-xs text-amber-200/80">-</p>
          ) : (
            <div className="space-y-1">
              {insights.weaknesses.slice(0, 3).map((item) => (
                <p key={item} className="text-xs text-amber-200">
                  {item}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-wbz-gold/35 bg-wbz-gold/10 p-4">
        <div className="mb-1 text-xs font-black text-wbz-gold">{labels.missions}</div>
        <div className="space-y-1">
          {insights.missions.map((mission) => (
            <p key={mission} className="text-xs text-gray-900 dark:text-white">
              {mission}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-3 text-[10px] text-wbz-mute">{labels.model}</div>
      {overview && (
        <div className="mt-1 text-[10px] text-wbz-mute">
          {labels.base}: {overview.modeLabel} / KDA {overview.kda} / ADR {overview.avgDamage}
        </div>
      )}
    </section>
  );
}

function GaugeCard({ icon, title, value }: { icon: ReactNode; title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100/80 p-3 dark:border-white/10 dark:bg-dark-surface">
      <div className="flex items-center gap-1 text-[10px] text-wbz-mute">
        {icon}
        {title}
      </div>
      <div className={`text-lg font-black ${toGaugeClass(value)}`}>{value}</div>
    </div>
  );
}
