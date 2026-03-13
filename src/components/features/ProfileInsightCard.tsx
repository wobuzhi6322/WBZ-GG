"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

interface ProfileOverview {
  modeLabel: string;
  matchesPlayed: number;
  kda: string;
  avgDamage: number;
  winRate: string;
  wins?: number;
  top10s?: number;
  kills?: number;
}

interface ProfileInsightCardProps {
  overview: ProfileOverview | null;
  compact?: boolean;
}

export default function ProfileInsightCard({ overview, compact = false }: ProfileInsightCardProps) {
  const { language } = useLanguage();

  const labels =
    language === "en"
      ? {
          title: "Playstyle",
          subtitle: "Recent match tendency summary.",
          empty: "Need more matches for analysis.",
          style: "Style",
          goal: "Today's Goal",
          kda: "K/D",
          damage: "Avg Damage",
          winRate: "Win Rate",
        }
      : language === "ja"
        ? {
            title: "プレイスタイル",
            subtitle: "最近の試合傾向を要約しました。",
            empty: "分析には試合数が必要です。",
            style: "傾向",
            goal: "今日の目標",
            kda: "K/D",
            damage: "平均ダメージ",
            winRate: "勝率",
          }
        : language === "zh"
          ? {
              title: "打法分析",
              subtitle: "最近比赛倾向摘要。",
              empty: "需要更多比赛才能分析。",
              style: "风格",
              goal: "今日目标",
              kda: "K/D",
              damage: "场均伤害",
              winRate: "胜率",
            }
          : {
              title: "플레이 스타일",
              subtitle: "최근 전적 기반 성향 분석입니다.",
              empty: "분석을 위해 더 많은 전적이 필요합니다.",
              style: "전투 성향",
              goal: "오늘의 목표",
              kda: "K/D",
              damage: "평균 딜량",
              winRate: "승률",
            };

  const shellClass = compact
    ? "rounded-xl border border-gray-200/80 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-800/90"
    : "rounded-3xl border border-gray-200/80 bg-white/95 p-8 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-zinc-800/90";

  if (!overview) {
    return (
      <section className={shellClass}>
        <Header compact={compact} title={labels.title} subtitle={labels.subtitle} />
        <div className={`rounded-2xl border border-gray-200 bg-gray-100/80 text-wbz-mute dark:border-white/10 dark:bg-white/[0.03] ${compact ? "mt-4 px-3 py-3 text-xs" : "mt-6 px-4 py-4 text-sm"}`}>
          {labels.empty}
        </div>
      </section>
    );
  }

  const numericKda = Number.parseFloat(overview.kda) || 0;
  const numericWinRate = Number.parseFloat(overview.winRate) || 0;
  const numericAvgDamage = overview.avgDamage ?? 0;

  let style = language === "ko" ? "밸런스형" : "Balanced";
  if (numericKda >= 4 && numericAvgDamage >= 420) style = language === "ko" ? "초공격형" : "Hyper Aggressive";
  else if (numericWinRate >= 20) style = language === "ko" ? "승률 집중형" : "Win Focused";
  else if (numericAvgDamage >= 350) style = language === "ko" ? "고딜 교전형" : "Damage Dealer";
  else if (numericKda < 2) style = language === "ko" ? "생존 강화형" : "Survival Focused";

  let goal =
    language === "ko" ? "TOP10 3회 + 평균 딜량 320" : "3 Top10 finishes + 320 ADR";
  if (numericKda >= 4) {
    goal = language === "ko" ? "5킬 이상 경기 2연속" : "2 straight 5-kill games";
  } else if (numericWinRate >= 20) {
    goal = language === "ko" ? "치킨 1회 + 어시스트 5회" : "1 win + 5 assists";
  } else if (numericAvgDamage >= 350) {
    goal = language === "ko" ? "3경기 누적 딜량 1200" : "1200 damage across 3 matches";
  }

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={shellClass}>
      <Header compact={compact} title={labels.title} subtitle={labels.subtitle} />

      <div className={`rounded-xl border border-gray-200 bg-gray-100/80 dark:border-white/10 dark:bg-white/[0.03] ${compact ? "mt-3 p-3" : "mt-6 p-5"}`}>
        <div className="text-[10px] uppercase tracking-[0.18em] text-wbz-mute">{labels.style}</div>
        <div className={`${compact ? "mt-1 text-[13px]" : "mt-2 text-2xl"} font-black text-gray-900 dark:text-white break-words`}>{style}</div>
        <div className={`grid gap-2.5 ${compact ? "mt-3 grid-cols-3" : "mt-4 grid-cols-3 gap-3"}`}>
          <MetricBox compact={compact} label={labels.kda} value={overview.kda} />
          <MetricBox compact={compact} label={labels.damage} value={overview.avgDamage.toLocaleString()} />
          <MetricBox compact={compact} label={labels.winRate} value={`${overview.winRate}%`} />
        </div>
      </div>

      <div className={`rounded-xl border border-wbz-gold/30 bg-wbz-gold/10 font-bold text-wbz-gold ${compact ? "mt-2 px-3 py-2 text-[10px]" : "mt-4 px-4 py-4 text-sm"}`}>
        {labels.goal}: {goal}
      </div>
    </motion.section>
  );
}

function Header({ compact, title, subtitle }: { compact: boolean; title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <h3 className={`${compact ? "text-[13px]" : "text-xl"} font-extrabold tracking-tight text-gray-900 dark:text-gray-100 break-words`}>{title}</h3>
      <p className={`${compact ? "mt-0.5 text-[10px]" : "mt-1 text-sm leading-6"} text-gray-600 dark:text-zinc-400`}>{subtitle}</p>
    </div>
  );
}

function MetricBox({ label, value, compact }: { label: string; value: string; compact: boolean }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60 ${compact ? "px-2 py-2" : "px-4 py-3"}`}>
      <div className="text-[9px] text-gray-500 dark:text-zinc-500">{label}</div>
      <div className={`${compact ? "mt-0.5 text-[11px]" : "mt-1 text-xl"} font-black text-gray-900 dark:text-white break-words`}>{value}</div>
    </div>
  );
}
