"use client";

import { getTierInfo } from "@/entities/pubg/lib/mapper";

export interface PastSeasonBadgeItem {
  season: string;
  tier?: string | null;
  rp: number;
  server?: string | null;
  rank?: number | string | null;
}

interface PastSeasonBadgesProps {
  pastSeasons: PastSeasonBadgeItem[];
}

const TIER_SHORT_LABELS: Record<string, string> = {
  Bronze: "Bronze",
  Silver: "Silver",
  Gold: "Gold",
  Platinum: "Plat",
  Crystal: "Crys",
  Diamond: "Dia",
  Master: "Mast",
  Survivor: "Surv",
};

function compactSeasonLabel(season: string): string {
  const match = season.match(/(\d{1,2})$/);
  return match ? `S${match[1]}` : season;
}

export default function PastSeasonBadges({ pastSeasons }: PastSeasonBadgesProps) {
  const visibleBadges = pastSeasons.filter((item) => {
    const tierName = item.tier?.trim().toLowerCase() ?? "";
    if (!Number.isFinite(item.rp) || item.rp <= 0) return false;
    if (!tierName) return true;
    return tierName !== "unranked" && tierName !== "???";
  });

  if (visibleBadges.length === 0) {
    return null;
  }

  return (
    <div className="mb-1 flex max-w-full flex-wrap gap-2">
      {visibleBadges.map((item) => {
        const tier = getTierInfo(item.rp, item.server, item.rank);
        const compactTierName = TIER_SHORT_LABELS[tier.name] ?? tier.name;

        return (
          <span
            key={`${item.season}-${item.rp}-${item.rank ?? "na"}`}
            className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none"
            style={{
              backgroundColor: `${tier.colorHex}20`,
              color: tier.colorHex,
              border: `1px solid ${tier.colorHex}40`,
            }}
            title={`${item.season} · ${tier.name} · ${item.rp.toLocaleString()} RP`}
          >
            <span className="opacity-85">{compactSeasonLabel(item.season)}</span>
            <span className="opacity-60">·</span>
            <span>{compactTierName}</span>
          </span>
        );
      })}
    </div>
  );
}
