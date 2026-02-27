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

export default function AITacticalCoach({ overview, matches, tierName }: AITacticalCoachProps) {
  const { language } = useLanguage();
  const [mode, setMode] = useState<CoachMode>("balanced");

  const labels =
    language === "en"
      ? {
          title: "AI Tactical Coach",
          noData: "No recent match data for analysis.",
          mode: { aggressive: "Aggressive", balanced: "Balanced", survival: "Survival" },
          summaryTitle: "Coach Summary",
          strengths: "Strengths",
          weaknesses: "Improvements",
          missions: "Next 5-Match Mission",
          aggression: "Aggression",
          stability: "Stability",
          execution: "Execution",
          overall: "Overall",
          model: "Analysis model: Last 20 matches rule-based scoring",
          base: "Base mode",
        }
      : language === "ja"
        ? {
            title: "AI戦術コーチ",
            noData: "分析可能な最近の試合データがありません。",
            mode: { aggressive: "交戦型", balanced: "バランス型", survival: "生存型" },
            summaryTitle: "コーチ要約",
            strengths: "長所",
            weaknesses: "改善点",
            missions: "次の5試合ミッション",
            aggression: "交戦力",
            stability: "安定性",
            execution: "実行力",
            overall: "総合",
            model: "分析モデル: 直近20試合ルールベース",
            base: "基準モード",
          }
        : language === "zh"
          ? {
              title: "AI战术教练",
              noData: "暂无可分析的最近比赛数据。",
              mode: { aggressive: "刚枪型", balanced: "平衡型", survival: "运营型" },
              summaryTitle: "教练总结",
              strengths: "优势",
              weaknesses: "改进点",
              missions: "接下来5场任务",
              aggression: "交战力",
              stability: "稳定性",
              execution: "执行力",
              overall: "综合",
              model: "分析模型：最近20场规则评分",
              base: "基础模式",
            }
          : {
              title: "AI 전술 코치",
              noData: "분석 가능한 최근 매치 데이터가 없습니다.",
              mode: { aggressive: "교전형", balanced: "밸런스형", survival: "운영형" },
              summaryTitle: "코치 요약",
              strengths: "강점",
              weaknesses: "개선 포인트",
              missions: "다음 5경기 미션",
              aggression: "교전력",
              stability: "안정성",
              execution: "실행력",
              overall: "종합 점수",
              model: "분석 모델: 최근 20경기 룰베이스 점수화",
              base: "기준 모드",
            };

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

    if (metrics.avgDamage >= 260) strengths.push(language === "en" ? "High average damage output." : language === "ja" ? "平均ダメージが高いです。" : language === "zh" ? "平均伤害较高。" : "평균 딜량이 높습니다.");
    if (metrics.top10Rate >= 45) strengths.push(language === "en" ? "Stable Top10 entry rate." : language === "ja" ? "TOP10進入率が安定しています。" : language === "zh" ? "前十率稳定。" : "TOP10 진입률이 안정적입니다.");
    if (metrics.headshotRate >= 20) strengths.push(language === "en" ? "Strong headshot conversion." : language === "ja" ? "헤드샷 전환율이 좋습니다。" : language === "zh" ? "爆头效率高。" : "헤드샷 전환율이 좋습니다.");

    if (metrics.avgDamage < 180) weaknesses.push(language === "en" ? "Need more early-fight damage." : language === "ja" ? "초반 교전 딜량 개선이 필요합니다。" : language === "zh" ? "需要提高前期交战伤害。" : "초반 교전 딜량 개선이 필요합니다.");
    if (metrics.avgKills < 1.1) weaknesses.push(language === "en" ? "Low kill involvement." : language === "ja" ? "킬 관여도가 낮습니다。" : language === "zh" ? "击杀参与偏低。" : "킬 관여도가 낮습니다.");
    if (metrics.top10Rate < 30) weaknesses.push(language === "en" ? "Need safer late-game rotations." : language === "ja" ? "후반 운영 경로 개선이 필요합니다。" : language === "zh" ? "后期转移路线需要优化。" : "후반 운영 경로 개선이 필요합니다.");

    const targetDamage = roundUpByTen(metrics.avgDamage + 30);
    const targetKills = Math.max(2, Math.ceil(metrics.avgKills + 0.4));
    const targetTop10 = Math.min(95, Math.round(metrics.top10Rate + 8));
    const targetSurvivalMin = Math.max(6, Math.round(metrics.avgSurvivalSec / 60 + 1));

    const missions =
      mode === "aggressive"
        ? [
            language === "en" ? `Average damage ${targetDamage}+ for next 5 games.` : language === "ja" ? `次の5試合で平均ダメージ${targetDamage}+。` : language === "zh" ? `接下来5场平均伤害${targetDamage}+。` : `다음 5경기 평균 딜량 ${targetDamage} 이상`,
            language === "en" ? `Reach ${targetKills}+ kills in early fights.` : language === "ja" ? `초반 교전에서 ${targetKills}+킬 목표.` : language === "zh" ? `前期交战目标 ${targetKills}+ 击杀。` : `초반 교전에서 ${targetKills}킬 이상 목표`,
          ]
        : mode === "survival"
          ? [
              language === "en" ? `Keep survival time ${targetSurvivalMin + 1}+ min.` : language === "ja" ? `平均生存 ${targetSurvivalMin + 1}分以上 유지.` : language === "zh" ? `平均生存达到${targetSurvivalMin + 1}分钟以上。` : `평균 생존 ${targetSurvivalMin + 1}분 이상 유지`,
              language === "en" ? "Prioritize zone pathing and cover usage." : language === "ja" ? "안전한 루트와 커버 사용을 우선하세요." : language === "zh" ? "优先规划安全转移与掩体使用。" : "안전한 루트와 엄폐 활용 우선",
            ]
          : [
              language === "en" ? `Push Top10 rate to ${targetTop10}%+.` : language === "ja" ? `TOP10率を ${targetTop10}%+ へ。` : language === "zh" ? `将前十率提升到 ${targetTop10}%+。` : `TOP10 진입률 ${targetTop10}% 이상 목표`,
              language === "en" ? `Keep ${targetKills} kills and ${targetSurvivalMin} min survival.` : language === "ja" ? `${targetKills}킬 + ${targetSurvivalMin}분 생존 유지.` : language === "zh" ? `维持 ${targetKills} 击杀 + ${targetSurvivalMin} 分钟生存。` : `${targetKills}킬 + ${targetSurvivalMin}분 생존 동시 달성`,
            ];

    const summary =
      mode === "aggressive"
        ? language === "en"
          ? "Increase fight tempo and tighten engagement cycle."
          : language === "ja"
            ? "교전 템포를 높이고 진입-이탈 사이클을 짧게 유지하세요."
            : language === "zh"
              ? "提高交战节奏，缩短进退循环。"
              : "교전 템포를 높이고 진입-이탈 사이클을 짧게 유지하세요."
        : mode === "survival"
          ? language === "en"
            ? "Prioritize consistency and safe late-game entries."
            : language === "ja"
              ? "안정적인 운영과 후반 안전 진입을 우선하세요."
              : language === "zh"
                ? "优先保证稳定运营与后期安全进圈。"
                : "안정적인 운영과 후반 안전 진입을 우선하세요."
          : language === "en"
            ? "Current profile is balanced between combat and survival."
            : language === "ja"
              ? "현재 전투와 생존의 균형이 좋은 상태입니다."
              : language === "zh"
                ? "当前战斗与生存维度较为均衡。"
                : "현재 전투와 생존 균형이 좋은 상태입니다.";

    return { strengths, weaknesses, missions, summary };
  }, [labels.noData, language, metrics, mode]);

  if (!metrics) {
    return <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 text-sm text-wbz-mute">{labels.noData}</div>;
  }

  return (
    <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-wbz-gold" />
          <h3 className="text-lg font-black text-gray-900 dark:text-white">{labels.title}</h3>
        </div>
        <span className="text-[10px] px-2 py-1 rounded border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-wbz-mute">
          {tierName ?? "-"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {([
          { key: "aggressive", label: labels.mode.aggressive },
          { key: "balanced", label: labels.mode.balanced },
          { key: "survival", label: labels.mode.survival },
        ] as Array<{ key: CoachMode; label: string }>).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
              mode === item.key
                ? "border-wbz-gold bg-wbz-gold/15 text-wbz-gold"
                : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-wbz-mute"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-surface p-3 mb-3">
        <div className="text-[11px] text-wbz-mute mb-1">{labels.summaryTitle}</div>
        <div className="text-sm font-bold text-gray-900 dark:text-white">{insights.summary}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <GaugeCard icon={<Crosshair className="w-3 h-3" />} title={labels.aggression} value={Math.round(metrics.aggression)} />
        <GaugeCard icon={<Shield className="w-3 h-3" />} title={labels.stability} value={Math.round(metrics.stability)} />
        <GaugeCard icon={<Target className="w-3 h-3" />} title={labels.execution} value={Math.round(metrics.execution)} />
        <GaugeCard icon={<TrendingUp className="w-3 h-3" />} title={labels.overall} value={metrics.overall} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 mb-3">
        <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3">
          <div className="text-xs font-black text-emerald-300 mb-1">{labels.strengths}</div>
          {insights.strengths.length === 0 ? (
            <p className="text-xs text-emerald-200/80">-</p>
          ) : (
            <div className="space-y-1">
              {insights.strengths.slice(0, 3).map((item) => (
                <p key={item} className="text-xs text-emerald-200">{item}</p>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-3">
          <div className="text-xs font-black text-amber-300 mb-1">{labels.weaknesses}</div>
          {insights.weaknesses.length === 0 ? (
            <p className="text-xs text-amber-200/80">-</p>
          ) : (
            <div className="space-y-1">
              {insights.weaknesses.slice(0, 3).map((item) => (
                <p key={item} className="text-xs text-amber-200">{item}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-wbz-gold/35 bg-wbz-gold/10 p-3">
        <div className="text-xs font-black text-wbz-gold mb-1">{labels.missions}</div>
        <div className="space-y-1">
          {insights.missions.map((mission) => (
            <p key={mission} className="text-xs text-gray-900 dark:text-white">{mission}</p>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-wbz-mute mt-3">{labels.model}</div>
      {overview && (
        <div className="text-[10px] text-wbz-mute mt-1">
          {labels.base}: {overview.modeLabel} / KDA {overview.kda} / ADR {overview.avgDamage}
        </div>
      )}
    </section>
  );
}

function GaugeCard({ icon, title, value }: { icon: ReactNode; title: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-surface p-2.5">
      <div className="text-[10px] text-wbz-mute flex items-center gap-1">
        {icon}
        {title}
      </div>
      <div className={`text-lg font-black ${toGaugeClass(value)}`}>{value}</div>
    </div>
  );
}
