"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { User, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getTierInfo } from "@/entities/pubg/lib/mapper";

const LOCAL_TIER_DIR = "/images/tiers";

export interface ProfileDashboardCardData {
  key: string;
  label: string;
  matches: number;
  wins: number;
  top10Rate: string;
  winRate: string;
  kda: string;
  avgDamage: number;
  headshotRate?: string;
  rp?: number;
  tierName?: string | null;
  tierImageUrl?: string | null;
  platformRegion?: string | null;
  leaderboardRank?: number | null;
}

interface AllInOneProfileDashboardProps {
  rankedCards: ProfileDashboardCardData[];
  normalCards: ProfileDashboardCardData[];
}

export default function AllInOneProfileDashboard({ rankedCards, normalCards }: AllInOneProfileDashboardProps) {
  const { t } = useLanguage();
  const labels = t.profileDashboard;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white/95 p-5 shadow-sm lg:h-[100%] dark:border-white/10 dark:bg-zinc-800/90"
    >
      <div className="flex h-full flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-[4]">
          <DashboardSection
            title={labels.ranked}
            cards={rankedCards}
            emptyLabel={labels.empty}
            gridClassName="grid-cols-2"
            renderMeta={(card) => (
              <div className="mx-auto w-full max-w-[220px]">
                <ListMetric label={labels.kda} value={card.kda} accent />
                <ListMetric label={labels.winRate} value={`${card.winRate}%`} />
                <ListMetric label={labels.top10} value={`${card.top10Rate}%`} />
                <ListMetric label={labels.damage} value={card.avgDamage.toLocaleString()} />
                <ListMetric label={labels.games} value={card.matches.toLocaleString()} hideBorder />
              </div>
            )}
          />
        </div>

        <div className="hidden w-px bg-gray-200 dark:bg-white/10 xl:block" />

        <div className="min-w-0 flex-[6]">
          <DashboardSection
            title={labels.normal}
            cards={normalCards}
            emptyLabel={labels.empty}
            gridClassName="grid-cols-1 md:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3"
            renderMeta={(card) => (
              <div className="mx-auto w-full max-w-[220px]">
                <ListMetric label={labels.kda} value={card.kda} accent />
                <ListMetric label={labels.winRate} value={`${card.winRate}%`} />
                <ListMetric label={labels.top10} value={`${card.top10Rate}%`} />
                <ListMetric label={labels.damage} value={card.avgDamage.toLocaleString()} />
                <ListMetric label={labels.headshot} value={`${card.headshotRate ?? "0.0"}%`} />
                <ListMetric label={labels.games} value={card.matches.toLocaleString()} hideBorder />
              </div>
            )}
          />
        </div>
      </div>
    </motion.section>
  );
}

function DashboardSection({
  title,
  cards,
  emptyLabel,
  gridClassName,
  renderMeta,
}: {
  title: string;
  cards: ProfileDashboardCardData[];
  emptyLabel: string;
  gridClassName: string;
  renderMeta: (card: ProfileDashboardCardData) => ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 border-b border-gray-200/60 pb-3 dark:border-white/10">
        <h2 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-100">{title}</h2>
      </div>

      <div className={`grid flex-grow gap-0 divide-y divide-gray-200/60 dark:divide-white/10 md:divide-x md:divide-y-0 ${gridClassName}`}>
        {cards.map((card, idx) => {
          const tierInfo = getTierInfo(card.rp ?? 0, card.platformRegion, card.leaderboardRank);
          const modeKey = card.key.toLowerCase();

          return (
            <div
              key={card.key}
              className={`flex min-w-0 flex-col py-4 md:py-0 ${idx === 0 ? "md:pr-5" : idx === cards.length - 1 ? "md:pl-5" : "md:px-5"}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{card.label}</div>
                <div className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500">
                  {card.matches > 0 ? `${card.wins.toLocaleString()}W` : emptyLabel}
                </div>
              </div>

              {card.tierImageUrl ? (
                <div className="mb-6 flex h-[88px] shrink-0 flex-col items-center justify-center">
                  <TierBadgeImage src={tierInfo.imageUrl} alt={tierInfo.name} />
                  <div className={`mb-0.5 text-xs font-bold ${tierInfo.color} drop-shadow-sm`}>{tierInfo.name}</div>
                  <div className="leading-none text-lg font-black text-wbz-gold drop-shadow-sm">
                    {card.rp ? card.rp.toLocaleString() : "-"}
                  </div>
                </div>
              ) : (
                <div className="mb-6 flex h-[88px] shrink-0 flex-col items-center justify-center">
                  {modeKey.includes("solo") ? (
                    <User className="mb-2 h-12 w-12 text-zinc-400 transition-colors hover:text-gray-200 dark:text-zinc-500" />
                  ) : modeKey.includes("squad") ? (
                    <div className="mb-2 grid h-12 w-12 grid-cols-2 gap-0.5 text-zinc-400 transition-colors hover:text-gray-200 dark:text-zinc-500 [&>svg]:h-full [&>svg]:w-full">
                      <User strokeWidth={2.5} />
                      <User strokeWidth={2.5} />
                      <User strokeWidth={2.5} />
                      <User strokeWidth={2.5} />
                    </div>
                  ) : (
                    <Users className="mb-2 h-12 w-12 text-zinc-400 transition-colors hover:text-gray-200 dark:text-zinc-500" />
                  )}
                </div>
              )}

              <div className="mt-2 flex w-full flex-col text-[11px]">{renderMeta(card)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListMetric({
  label,
  value,
  accent = false,
  hideBorder = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hideBorder?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${hideBorder ? "" : "border-b border-gray-100 dark:border-white/5"}`}>
      <div className="text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`font-black ${accent ? "text-yellow-500 dark:text-yellow-400" : "text-gray-900 dark:text-white"}`}>{value}</div>
    </div>
  );
}

function TierBadgeImage({ src, alt }: { src: string; alt: string }) {
  const fallback = `${LOCAL_TIER_DIR}/Unranked.png`;
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={56}
      height={56}
      className="mb-2 h-14 w-14 object-contain drop-shadow-md"
      onError={() => {
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
      }}
      unoptimized
    />
  );
}
