"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

interface HitboxAnalysisCardProps {
  analysis: {
    headRatio: number;
    upperBodyRatio: number;
    armRatio: number;
    legRatio: number;
    estimatedHeadHits: number;
    estimatedBodyHits: number;
    sampleKills: number;
    mainWeapon: string | null;
    topWeaponKills: number;
    trackedWeaponKills: number;
    profile: "precision" | "balanced" | "body";
  };
  compact?: boolean;
}

export default function HitboxAnalysisCard({ analysis, compact = false }: HitboxAnalysisCardProps) {
  const { t } = useLanguage();
  const labels = t.hitboxAnalysis;

  const shellClass = compact
    ? "rounded-xl border border-gray-200/80 bg-white/95 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-800/90"
    : "rounded-3xl border border-gray-200/80 bg-white/95 p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-zinc-800/90";

  const profileToneClass =
    analysis.profile === "precision"
      ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-400"
      : analysis.profile === "body"
        ? "border-rose-400/30 bg-rose-500/10 text-rose-400"
        : "border-amber-400/30 bg-amber-500/10 text-amber-400";

  const maxRatio = Math.max(
    analysis.headRatio,
    analysis.upperBodyRatio,
    analysis.armRatio,
    analysis.legRatio,
  );

  const maxLabel =
    maxRatio === analysis.headRatio
      ? labels.parts.head
      : maxRatio === analysis.upperBodyRatio
        ? labels.parts.upperBody
        : maxRatio === analysis.armRatio
          ? labels.parts.arm
          : labels.parts.leg;

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={shellClass}>
      <div className="mb-2">
        <h3 className={`${compact ? "text-[13px]" : "text-xl"} font-extrabold tracking-tight text-gray-900 dark:text-gray-100 break-words`}>
          {labels.title}
        </h3>
        <p className={`${compact ? "mt-0.5 text-xs" : "mt-1 text-sm leading-6"} text-gray-600 dark:text-zinc-400`}>
          {labels.subtitle}
        </p>
      </div>

      <div className={`flex flex-col gap-4 ${compact ? "mt-4" : "mt-6"}`}>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${profileToneClass}`}
          >
            {labels.profile[analysis.profile]}
          </span>
          <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[9px] font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
            {labels.mainWeapon}: {analysis.mainWeapon ?? "-"}
          </span>
        </div>

        <div className={`relative mx-auto mt-2 flex aspect-[3/4] w-full items-center justify-center overflow-visible ${compact ? "max-w-[220px]" : "max-w-[280px]"}`}>
          <Image
            src="/images/analysts/hitbox-model.png"
            alt={labels.silhouetteAlt}
            width={280}
            height={384}
            className="h-72 w-auto select-none object-contain brightness-50 contrast-125 drop-shadow-[0_0_15px_rgba(255,0,0,0.4)] transition-all duration-500 hover:drop-shadow-[0_0_25px_rgba(255,0,0,0.6)] dark:brightness-100"
            unoptimized
          />

          <div className="absolute left-[4%] top-[14%] flex items-center gap-2 sm:left-[8%]">
            <div className="flex flex-col items-end">
              <span className={`${compact ? "text-[13px]" : "text-xl"} font-black text-red-500 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)] dark:text-red-400`}>
                {analysis.headRatio}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{labels.parts.head}</span>
            </div>
            <div className="h-[1px] w-5 bg-red-400/80 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
          </div>

          <div className="absolute right-[0%] top-[34%] flex items-center gap-2 sm:right-[10%]">
            <div className="h-[1px] w-6 bg-yellow-500/80 shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
            <div className="flex flex-col items-start">
              <span className={`${compact ? "text-[13px]" : "text-xl"} font-black text-yellow-600 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] dark:text-yellow-400`}>
                {analysis.upperBodyRatio}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {labels.parts.upperBody}
              </span>
            </div>
          </div>

          <div className="absolute left-[2%] top-[48%] flex items-center gap-2 sm:left-[10%]">
            <div className="flex flex-col items-end">
              <span className={`${compact ? "text-[13px]" : "text-xl"} font-black text-zinc-600 dark:text-zinc-300`}>{analysis.armRatio}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{labels.parts.arm}</span>
            </div>
            <div className="h-[1px] w-5 bg-zinc-400/50" />
          </div>

          <div className="absolute right-[6%] top-[75%] flex items-center gap-2 sm:right-[15%]">
            <div className="h-[1px] w-5 bg-zinc-400/50" />
            <div className="flex flex-col items-start">
              <span className={`${compact ? "text-[13px]" : "text-xl"} font-black text-zinc-600 dark:text-zinc-300`}>{analysis.legRatio}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{labels.parts.leg}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-white/5 dark:bg-white/[0.02]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
            {labels.recentAnalysis}
          </div>
          <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-zinc-200">
            <span className="text-wbz-mute">{labels.topHitTarget}</span>
            <span className="ml-1 text-rose-500 dark:text-yellow-400">{maxLabel}</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
