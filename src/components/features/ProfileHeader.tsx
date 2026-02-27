"use client";

import { motion } from "framer-motion";
import { RefreshCw, Copy, Check, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  steamProfile: SteamProfileInfo | null;
  platform: "steam" | "kakao";
  refreshToken?: string;
  seasonLabel: string | null;
  seasonId: string | null;
}

export default function ProfileHeader({
  username,
  overview,
  tierName,
  tierImageUrl,
  steamProfile,
  platform,
  refreshToken = "",
  seasonLabel,
  seasonId,
}: ProfileHeaderProps) {
  const { language } = useLanguage();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  const handleRefresh = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("refresh", `${Date.now()}`);
    if (!url.searchParams.get("platform")) {
      url.searchParams.set("platform", platform);
    }
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
  };

  const handleCopyProfileLink = async () => {
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

  const kda = overview?.kda ?? "-";
  const avgDamage = overview ? overview.avgDamage.toLocaleString() : "-";
  const winRate = overview ? `${overview.winRate}%` : "-";
  const matchesPlayed = overview ? overview.matchesPlayed.toLocaleString() : "-";
  const totalWins = typeof overview?.wins === "number" ? overview.wins.toLocaleString() : "-";
  const totalTop10 = typeof overview?.top10s === "number" ? overview.top10s.toLocaleString() : "-";
  const totalKills = typeof overview?.kills === "number" ? overview.kills.toLocaleString() : "-";
  const labels =
    language === "en"
      ? {
          noRecent: "No recent data",
          unranked: "Unranked",
          openSteam: "Open Steam profile",
          platform: "Platform",
          season: "Season",
          mode: "Mode",
          matches: "Matches",
          avgDamage: "Avg Damage",
          winRate: "Win Rate",
          wins: "Wins",
          totalKills: "Kills",
          playStyle: "Playstyle Analysis",
          noData: "No Data",
          challengeBase: "Matches will generate personalized tactical goals.",
          refresh: "Refresh",
          forceRefresh: "Force Refresh",
          copy: "Copy Link",
          copied: "Copied",
        }
      : language === "ja"
        ? {
            noRecent: "最近データなし",
            unranked: "アンランク",
            openSteam: "Steamプロフィールを開く",
            platform: "プラットフォーム",
            season: "シーズン",
            mode: "モード",
            matches: "試合数",
            avgDamage: "平均ダメージ",
            winRate: "勝率",
            wins: "勝利",
            totalKills: "総キル",
            playStyle: "プレイスタイル分析",
            noData: "データなし",
            challengeBase: "戦績が増えると個別ミッションを生成します。",
            refresh: "更新",
            forceRefresh: "強制更新",
            copy: "リンクコピー",
            copied: "コピー完了",
          }
        : language === "zh"
          ? {
              noRecent: "暂无最近数据",
              unranked: "未定级",
              openSteam: "打开 Steam 资料",
              platform: "平台",
              season: "赛季",
              mode: "模式",
              matches: "场次",
              avgDamage: "场均伤害",
              winRate: "胜率",
              wins: "胜利",
              totalKills: "总击杀",
              playStyle: "风格分析",
              noData: "暂无数据",
              challengeBase: "战绩累积后会生成个性化战术目标。",
              refresh: "刷新",
              forceRefresh: "强制刷新",
              copy: "复制链接",
              copied: "已复制",
            }
          : {
              noRecent: "최근 데이터 없음",
              unranked: "언랭크",
              openSteam: "스팀 프로필 열기",
              platform: "플랫폼",
              season: "시즌",
              mode: "모드",
              matches: "매치 수",
              avgDamage: "평균 딜량",
              winRate: "승률",
              wins: "승리",
              totalKills: "총 킬",
              playStyle: "플레이 스타일 분석",
              noData: "데이터 없음",
              challengeBase: "매치 전적이 쌓이면 개인 맞춤 전술 가이드를 생성합니다.",
              refresh: "새로고침",
              forceRefresh: "강제 새로고침",
              copy: "링크 복사",
              copied: "복사됨",
            };

  const modeLabel = overview?.modeLabel ?? labels.noRecent;
  const resolvedTierName = tierName ?? labels.unranked;
  const resolvedTierImageUrl = tierImageUrl ?? "/ranks/unranked.jpg";
  const platformLabel = platform === "kakao" ? "KAKAO" : "STEAM";
  const avatarUrl =
    steamProfile?.avatarUrl ??
    (platform === "steam"
      ? "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg"
      : "/platform/kakao-talk.svg");

  const numericKda = overview ? Number.parseFloat(overview.kda) : 0;
  const numericWinRate = overview ? Number.parseFloat(overview.winRate) : 0;
  const numericAvgDamage = overview?.avgDamage ?? 0;
  const refreshActive = refreshToken.length > 0;

  const profileInsight = useMemo(() => {
    if (!overview) {
      return {
        style: labels.noData,
        challenge: labels.challengeBase,
      };
    }

    let style = "균형형";
    if (numericKda >= 4 && numericAvgDamage >= 420) style = "초공격형";
    else if (numericWinRate >= 20) style = "승률 집중형";
    else if (numericAvgDamage >= 350) style = "고딜 교전형";
    else if (numericKda < 2) style = "생존 강화형";

    let challenge = "오늘의 목표: TOP10 3회 + 평균 딜량 320 이상";
    if (numericKda >= 4) challenge = "오늘의 목표: 5킬 이상 경기 2연속";
    else if (numericWinRate >= 20) challenge = "오늘의 목표: 치킨 1회 + 어시스트 5 이상";
    else if (numericAvgDamage >= 350) challenge = "오늘의 목표: 3경기 누적 딜량 1200 이상";

    return { style, challenge };
  }, [labels.challengeBase, labels.noData, overview, numericAvgDamage, numericKda, numericWinRate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white dark:bg-wbz-card/80 backdrop-blur-md border border-gray-200 dark:border-white/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-wbz-gold/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="relative group">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-2 border-wbz-gold/30 p-1 bg-gray-100 dark:bg-black/50">
          <div className="w-full h-full rounded-xl overflow-hidden relative">
            <Image
              src={avatarUrl}
              fill
              alt={`${username} 아바타`}
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 text-center md:text-left space-y-2 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{username}</h1>
          <span className="inline-flex items-center gap-2 px-2 py-1 bg-wbz-gold/10 border border-wbz-gold/40 text-wbz-gold text-xs font-bold rounded">
            <span className="relative w-6 h-6 rounded-sm bg-gray-200 dark:bg-black/40 overflow-hidden">
              <Image src={resolvedTierImageUrl} alt={`${resolvedTierName} 티어`} fill className="object-contain p-0.5" sizes="24px" />
            </span>
            <span>{resolvedTierName}</span>
          </span>
          {platform === "steam" && steamProfile && (
            <a
              href={steamProfile.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-300/50 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200 text-[11px] font-bold"
              title={labels.openSteam}
            >
              STEAM
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-wbz-mute font-mono mt-2">
          <span>{labels.platform}: {platformLabel}</span>
          <span title={seasonId ?? undefined}>{labels.season}: {seasonLabel ?? "-"}</span>
          <span>{labels.mode}: {modeLabel}</span>
          <span>{labels.matches}: {matchesPlayed}</span>
          {platform === "steam" && steamProfile?.steamId && <span>SteamID: {steamProfile.steamId}</span>}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 max-w-md mx-auto md:mx-0">
          <div className="bg-gray-50 dark:bg-black/40 p-3 rounded border border-gray-200 dark:border-white/5">
            <div className="text-[10px] text-wbz-mute mb-1">K/D</div>
            <div className="text-xl font-bold text-wbz-gold">{kda}</div>
          </div>
          <div className="bg-gray-50 dark:bg-black/40 p-3 rounded border border-gray-200 dark:border-white/5">
            <div className="text-[10px] text-wbz-mute mb-1">{labels.avgDamage}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{avgDamage}</div>
          </div>
          <div className="bg-gray-50 dark:bg-black/40 p-3 rounded border border-gray-200 dark:border-white/5">
            <div className="text-[10px] text-wbz-mute mb-1">{labels.winRate}</div>
            <div className="text-xl font-bold text-green-400">{winRate}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 max-w-md mx-auto md:mx-0">
          <div className="bg-gray-50 dark:bg-black/25 border border-gray-200 dark:border-white/10 rounded px-2.5 py-2">
            <div className="text-[10px] text-wbz-mute">{labels.wins}</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{totalWins}</div>
          </div>
          <div className="bg-gray-50 dark:bg-black/25 border border-gray-200 dark:border-white/10 rounded px-2.5 py-2">
            <div className="text-[10px] text-wbz-mute">TOP10</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{totalTop10}</div>
          </div>
          <div className="bg-gray-50 dark:bg-black/25 border border-gray-200 dark:border-white/10 rounded px-2.5 py-2">
            <div className="text-[10px] text-wbz-mute">{labels.totalKills}</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{totalKills}</div>
          </div>
        </div>

        <div className="mt-4 space-y-2 max-w-md mx-auto md:mx-0">
          <div className="text-[11px] text-wbz-mute">{labels.playStyle}</div>
          <div className="text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-black/35 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2">{profileInsight.style}</div>
          <div className="text-xs text-wbz-gold bg-wbz-gold/10 border border-wbz-gold/30 rounded-lg px-3 py-2">{profileInsight.challenge}</div>
        </div>
      </div>

      <div className="flex flex-row md:flex-col gap-2">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-wbz-gold text-black rounded hover:bg-white transition-colors font-bold text-xs"
        >
          <RefreshCw className="w-4 h-4" />
          {refreshActive ? labels.forceRefresh : labels.refresh}
        </button>
        <button
          onClick={handleCopyProfileLink}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors font-bold text-xs border border-gray-200 dark:border-white/10"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
    </motion.div>
  );
}
