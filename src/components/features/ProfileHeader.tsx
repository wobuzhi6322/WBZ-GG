"use client";

import { motion } from "framer-motion";
import { RefreshCw, Copy, Check, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { ProfileTitleBadgeData } from "@/app/profile/[username]/page";
import PastSeasonBadges, { type PastSeasonBadgeItem } from "@/components/features/PastSeasonBadges";
import { getWeaponImage } from "@/entities/pubg/lib/mapper";

interface ProfileOverview {
  modeLabel: string;
  matchesPlayed: number;
}

interface SteamProfileInfo {
  steamId: string;
  personaName: string;
  profileUrl: string;
  avatarUrl: string | null;
}

interface ProfileHeaderProps {
  username: string;
  overview: ProfileOverview | null;
  tierName: string | null;
  tierImageUrl: string | null;
  mainWeapon: string | null;
  steamProfile: SteamProfileInfo | null;
  platform: "steam" | "kakao";
  refreshToken?: string;
  seasonLabel: string | null;
  seasonId: string | null;
  titleBadge: ProfileTitleBadgeData;
  pastSeasons?: PastSeasonBadgeItem[];
  seasonSelector?: ReactNode;
}

export default function ProfileHeader({
  username,
  overview,
  tierName,
  tierImageUrl,
  mainWeapon,
  steamProfile,
  platform,
  refreshToken = "",
  seasonLabel,
  seasonId,
  titleBadge,
  pastSeasons = [],
  seasonSelector,
}: ProfileHeaderProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  const labels = t.profileHeader;
  const commonLabels = t.common;

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);

    try {
      const safePlatform = encodeURIComponent(platform);
      const safeUsername = encodeURIComponent(username);
      const res = await fetch(`/api/player/update?platform=${safePlatform}&username=${safeUsername}`, {
        method: "POST",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Refresh failed");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyProfileLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);

      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }

      copiedTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 1500);
    } catch (error) {
      console.error("Failed to copy profile link:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const modeLabel = overview?.modeLabel ?? labels.noRecent;
  const matchesPlayed = overview ? overview.matchesPlayed.toLocaleString() : "-";
  const resolvedTierName = tierName ?? commonLabels.unranked;
  const resolvedTierImageUrl = tierImageUrl ?? "/ranks/unranked.jpg";
  const platformLabel = platform === "kakao" ? "KAKAO" : "STEAM";
  const avatarUrl =
    steamProfile?.avatarUrl ??
    (platform === "steam"
      ? "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg"
      : "/platform/kakao-talk.svg");

  const titleBadgeToneClass = useMemo(() => {
    if (titleBadge.key === "warlord") return "border-rose-400/40 bg-rose-500/10 text-rose-300";
    if (titleBadge.key === "camper") return "border-cyan-400/40 bg-cyan-500/10 text-cyan-300";
    if (titleBadge.key === "peaceful") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
    return "border-wbz-gold/40 bg-wbz-gold/10 text-wbz-gold";
  }, [titleBadge.key]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative h-full w-full overflow-hidden rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/90"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-wbz-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-cyan-400/5 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col gap-5">
        {seasonSelector ? <div className="w-full">{seasonSelector}</div> : null}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4 lg:flex-1">
          <div className="relative shrink-0 group">
            <div className="h-24 w-24 rounded-2xl border border-wbz-gold/30 bg-gray-100 p-0.5 dark:bg-black/50">
              <div className="relative h-full w-full overflow-hidden rounded-lg">
                <Image
                  src={avatarUrl}
                  fill
                  alt={`${username} avatar`}
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </div>
          </div>

            <div className="min-w-0 flex-1 space-y-2">
            <PastSeasonBadges pastSeasons={pastSeasons} />

              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white md:text-3xl">
                {username}
              </h1>

                <span className="inline-flex items-center gap-1.5 rounded-md border border-wbz-gold/40 bg-wbz-gold/10 px-2 py-1 text-[10px] font-bold text-wbz-gold">
                  <span className="relative h-4 w-4 overflow-hidden rounded-full bg-gray-200 dark:bg-black/40">
                  <Image
                    src={resolvedTierImageUrl}
                    alt={resolvedTierName}
                    fill
                    className="object-contain p-0.5"
                    sizes="16px"
                  />
                </span>
                <span>{resolvedTierName}</span>
              </span>

                {platform === "steam" && steamProfile ? (
                  <a
                    href={steamProfile.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-cyan-300/50 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-700 dark:text-cyan-200"
                    title={labels.openSteam}
                  >
                    STEAM
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-black ${titleBadgeToneClass}`}
                >
                  <span className="leading-none">{titleBadge.emoji}</span>
                  <span>{labels.titles[titleBadge.key]}</span>
                </span>

                <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                  <span>
                    {labels.mainWeapon}: {mainWeapon ?? "-"}
                  </span>
                  {mainWeapon && getWeaponImage(mainWeapon) && !imgError ? (
                    <Image
                      src={getWeaponImage(mainWeapon) as string}
                      alt={mainWeapon}
                      width={64}
                      height={24}
                      className="h-6 w-auto object-contain drop-shadow-md brightness-0 transition-all hover:scale-110 dark:invert"
                      onError={() => setImgError(true)}
                      unoptimized
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[10px] text-wbz-mute">
                <span>
                  {labels.platform}: {platformLabel}
                </span>
                <span title={seasonId ?? undefined}>
                  {labels.season}: {seasonLabel ?? "-"}
                </span>
                <span>
                  {labels.mode}: {modeLabel}
                </span>
                <span>
                  {labels.matches}: {matchesPlayed}
                </span>
                {platform === "steam" && steamProfile?.steamId ? <span>SteamID: {steamProfile.steamId}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 lg:w-[260px] lg:justify-end">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex min-w-[124px] items-center justify-center gap-2 rounded-xl bg-wbz-gold px-3 py-2 text-[11px] font-bold text-black transition-colors hover:bg-white disabled:opacity-70"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {refreshToken || isRefreshing ? labels.forceRefresh : labels.refresh}
            </button>

            <button
              onClick={handleCopyProfileLink}
              className="inline-flex min-w-[124px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-900 transition-colors hover:bg-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? labels.copied : labels.copy}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
