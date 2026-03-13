"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/context/LanguageContext";

interface RadarPoint {
  subject: string;
  A: number;
  fullMark: number;
}

interface StatRadarProps {
  data: RadarPoint[] | null;
  compact?: boolean;
}

export default function StatRadar({ data, compact = false }: StatRadarProps) {
  const { language } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const labels =
    language === "en"
      ? { title: "Combat Metrics", subtitle: "Recent combat shape.", collecting: "Collecting combat logs.", summary: "Top Metrics" }
      : language === "ja"
        ? { title: "戦闘指標", subtitle: "最近の戦闘傾向です。", collecting: "戦闘ログを収集中です。", summary: "上位指標" }
        : language === "zh"
          ? { title: "战斗指标", subtitle: "最近战斗轮廓。", collecting: "正在收集战斗日志。", summary: "核心指标" }
          : { title: "전투 지표", subtitle: "최근 전투 성향 요약입니다.", collecting: "전투 로그를 수집 중입니다.", summary: "핵심 지표" };

  const translatedSubjects = useMemo(() => {
    const map =
      language === "en"
        ? { "전투": "Combat", "생존": "Survival", "팀플레이": "Support", "상위권": "Placement", "승리": "Victory" }
        : language === "ja"
          ? { "전투": "交戦", "생존": "生存", "팀플레이": "支援", "상위권": "上位", "승리": "勝利" }
          : language === "zh"
            ? { "전투": "交战", "생존": "生存", "팀플레이": "支援", "상위권": "排名", "승리": "胜利" }
            : null;
    return map;
  }, [language]);

  const normalized = useMemo(() => {
    const fallback = [
      { subject: translatedSubjects?.["전투"] ?? "전투", A: 0, fullMark: 150 },
      { subject: translatedSubjects?.["생존"] ?? "생존", A: 0, fullMark: 150 },
      { subject: translatedSubjects?.["팀플레이"] ?? "팀플레이", A: 0, fullMark: 150 },
      { subject: translatedSubjects?.["상위권"] ?? "상위권", A: 0, fullMark: 150 },
      { subject: translatedSubjects?.["승리"] ?? "승리", A: 0, fullMark: 150 },
    ];
    if (!Array.isArray(data) || data.length === 0) return fallback;
    return data.map((item) => ({
      subject: translatedSubjects?.[item.subject as keyof NonNullable<typeof translatedSubjects>] ?? item.subject,
      A: Number.isFinite(item.A) ? item.A : 0,
      fullMark: Number.isFinite(item.fullMark) ? item.fullMark : 150,
    }));
  }, [data, translatedSubjects]);

  const topMetrics = useMemo(
    () =>
      [...normalized]
        .sort((left, right) => right.A - left.A)
        .slice(0, 3)
        .map((item) => ({ ...item, score: Math.round((item.A / item.fullMark) * 100) })),
    [normalized]
  );

  const shellClass = compact
    ? "overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-800/90"
    : "overflow-hidden rounded-3xl border border-gray-200/80 bg-white/95 p-8 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-zinc-800/90";

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={shellClass}>
      <div className="flex flex-col gap-4">
        <div className="mb-2">
          <h3 className={`${compact ? "text-[13px]" : "text-xl"} font-extrabold tracking-tight text-gray-900 dark:text-gray-100 break-words`}>{labels.title}</h3>
          <p className={`${compact ? "mt-0.5 text-[10px]" : "mt-1 text-sm leading-6"} text-gray-600 dark:text-zinc-400`}>{labels.subtitle}</p>
        </div>

        <div className={`rounded-2xl border border-gray-200 bg-gray-100/80 dark:border-white/10 dark:bg-white/[0.03] ${compact ? "p-4" : "p-5"}`}>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-wbz-mute">{labels.summary}</div>
          <div className={`grid ${compact ? "mt-3 gap-2 grid-cols-3" : "mt-4 gap-3 sm:grid-cols-3"}`}>
            {topMetrics.map((metric) => (
              <div key={metric.subject} className={`rounded-xl border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-zinc-900/60 ${compact ? "px-2 py-2" : "px-4 py-3"}`}>
                <div className="text-[9px] font-bold text-gray-500 dark:text-zinc-500 line-clamp-1">{metric.subject}</div>
                <div className={`${compact ? "mt-0.5 text-[11px]" : "mt-2 text-2xl"} font-black text-gray-900 dark:text-white`}>{metric.score}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-wbz-gold via-amber-300 to-cyan-300" style={{ width: `${metric.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`mx-auto aspect-square w-full rounded-[2rem] border border-gray-200 bg-gray-100/80 dark:border-white/10 dark:bg-zinc-900/60 ${compact ? "max-w-[180px] p-2" : "max-w-[420px] p-4"}`}>
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={normalized}>
                <PolarGrid stroke="rgba(148,163,184,0.22)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: compact ? 9 : 11, fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar name="combat-metrics" dataKey="A" stroke="#F2A900" strokeWidth={2.2} fill="#F2A900" fillOpacity={0.26} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>

        {!normalized.some((item) => item.A > 0) ? <div className="text-center text-xs text-wbz-mute">{labels.collecting}</div> : null}
      </div>
    </motion.section>
  );
}
