"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { MatchQueueFilter, PubgPlatformShard, SeasonOption } from "@/lib/pubg";

interface ProfileSeasonSelectorProps {
  seasonOptions: SeasonOption[];
  selectedSeasonId: string | null;
  selectedQueue: MatchQueueFilter;
  platform: PubgPlatformShard;
  playerName: string;
  accountId: string;
}

function buildProfileHref(params: {
  playerName: string;
  platform: PubgPlatformShard;
  accountId: string;
  queue: MatchQueueFilter;
  seasonId: string | null;
}): string {
  const profileHrefBase = `/profile/${encodeURIComponent(params.playerName)}`;
  const query = new URLSearchParams();
  query.set("platform", params.platform);
  query.set("id", params.accountId);
  if (params.queue !== "all") query.set("queue", params.queue);
  if (params.seasonId) query.set("season", params.seasonId);
  return `${profileHrefBase}?${query.toString()}`;
}

export default function ProfileSeasonSelector({
  seasonOptions,
  selectedSeasonId,
  selectedQueue,
  platform,
  playerName,
  accountId,
}: ProfileSeasonSelectorProps) {
  const { t } = useLanguage();
  const labels = t.profilePage;
  const [isOpen, setIsOpen] = useState(false);

  const featuredSeasonOptions = useMemo(() => seasonOptions.slice(0, 3), [seasonOptions]);
  const archivedSeasonOptions = useMemo(() => seasonOptions.slice(3), [seasonOptions]);
  const selectedSeasonLabel = useMemo(() => {
    const selected = seasonOptions.find((season) => season.seasonId === selectedSeasonId) ?? seasonOptions[0] ?? null;
    return selected?.label ?? labels.seasonButton;
  }, [labels.seasonButton, seasonOptions, selectedSeasonId]);

  if (seasonOptions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-xs text-wbz-mute">{labels.seasonSelect}</div>
        <div className="text-[11px] text-wbz-mute">{labels.seasonLoadFail}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-wbz-mute">{labels.seasonSelect}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {featuredSeasonOptions.map((season) => {
          const active = selectedSeasonId === season.seasonId;
          return (
            <Link
              key={season.seasonId}
              href={buildProfileHref({
                playerName,
                platform,
                accountId,
                queue: selectedQueue,
                seasonId: season.seasonId,
              })}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition-colors whitespace-nowrap ${
                active
                  ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
                  : "border-gray-300 text-wbz-mute hover:border-gray-400 hover:text-gray-900 dark:border-white/15 dark:hover:border-white/35 dark:hover:text-white"
              }`}
            >
              {season.label}
            </Link>
          );
        })}

        {archivedSeasonOptions.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-gray-900 transition-colors hover:border-gray-400 hover:bg-gray-200 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:hover:bg-zinc-800"
            >
              <span>{labels.archivedList}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen ? (
              <div className="absolute left-0 z-20 mt-2 max-h-64 w-52 overflow-y-auto custom-scrollbar rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xl dark:border-white/15 dark:bg-dark-surface">
                {archivedSeasonOptions.map((season) => {
                  const active = selectedSeasonId === season.seasonId;
                  return (
                    <Link
                      key={season.seasonId}
                      href={buildProfileHref({
                        playerName,
                        platform,
                        accountId,
                        queue: selectedQueue,
                        seasonId: season.seasonId,
                      })}
                      onClick={() => setIsOpen(false)}
                      className={`block rounded-md px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? "bg-cyan-300/20 text-cyan-100"
                          : "text-wbz-mute hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
                      }`}
                    >
                      {season.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="ml-auto whitespace-nowrap text-[10px] text-wbz-mute">
          {labels.selectedSeason}:{" "}
          <span className="font-semibold text-gray-900 dark:text-white">{selectedSeasonLabel}</span>
        </div>
      </div>
    </div>
  );
}
