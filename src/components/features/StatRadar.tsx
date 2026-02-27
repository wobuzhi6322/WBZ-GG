"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/context/LanguageContext";

interface RadarPoint {
  subject: string;
  A: number;
  fullMark: number;
}

interface StatRadarProps {
  data: RadarPoint[] | null;
}

export default function StatRadar({ data }: StatRadarProps) {
  const { language } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const normalized = useMemo(() => {
    const subjectMap =
      language === "en"
        ? {
            "생존력": "Survival",
            "교전력": "Combat",
            "지원력": "Support",
            "정밀도": "Precision",
            "안정성": "Stability",
          }
        : language === "ja"
          ? {
              "생존력": "生存力",
              "교전력": "交戦力",
              "지원력": "支援力",
              "정밀도": "精密度",
              "안정성": "安定性",
            }
          : language === "zh"
            ? {
                "생존력": "生存力",
                "교전력": "交战力",
                "지원력": "支援力",
                "정밀도": "精密度",
                "안정성": "稳定性",
              }
            : null;

    if (!Array.isArray(data) || data.length === 0) {
      return [
        { subject: subjectMap?.["생존력"] ?? "생존력", A: 0, fullMark: 150 },
        { subject: subjectMap?.["교전력"] ?? "교전력", A: 0, fullMark: 150 },
        { subject: subjectMap?.["지원력"] ?? "지원력", A: 0, fullMark: 150 },
        { subject: subjectMap?.["정밀도"] ?? "정밀도", A: 0, fullMark: 150 },
        { subject: subjectMap?.["안정성"] ?? "안정성", A: 0, fullMark: 150 },
      ];
    }
    return data.map((item) => ({
      subject: subjectMap?.[item.subject as keyof typeof subjectMap] ?? item.subject,
      A: Number.isFinite(item.A) ? item.A : 0,
      fullMark: Number.isFinite(item.fullMark) ? item.fullMark : 150,
    }));
  }, [data, language]);

  const hasMeaningfulData = normalized.some((item) => item.A > 0);
  const labels =
    language === "en"
      ? { title: "Combat Metrics", collecting: "Collecting recent combat logs." }
      : language === "ja"
        ? { title: "戦闘指標データ", collecting: "最近の戦闘ログを収集中です。" }
        : language === "zh"
          ? { title: "战斗指标数据", collecting: "正在收集最近战斗日志。" }
          : { title: "전투 지표 데이터", collecting: "최근 전투 로그를 수집 중입니다." };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="w-full h-[300px] bg-white dark:bg-wbz-card/50 backdrop-blur border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center relative"
    >
      <h3 className="absolute top-4 left-4 text-sm font-bold text-gray-900 dark:text-white opacity-85">{labels.title}</h3>
      {isMounted ? (
        <>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={normalized}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 700 }} />
              <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
              <Radar
                name="전투 지표"
                dataKey="A"
                stroke="#F2A900"
                strokeWidth={2}
                fill="#F2A900"
                fillOpacity={0.28}
              />
            </RadarChart>
          </ResponsiveContainer>
          {!hasMeaningfulData ? (
            <div className="absolute bottom-3 left-4 right-4 text-[11px] text-wbz-mute text-center">
              {labels.collecting}
            </div>
          ) : null}
        </>
      ) : (
        <div className="h-full w-full" />
      )}
    </motion.div>
  );
}
