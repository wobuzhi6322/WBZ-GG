"use client";

import { useId, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getTierInfo } from "@/entities/pubg/lib/mapper";

interface RankTrendWidgetProps {
  points: number[];
  currentRp: number;
  bestRp: number;
  platformRegion?: string | null;
  leaderboardRank?: number | string | null;
}

const TIER_ORDER = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Crystal",
  "Diamond",
  "Master",
  "Survivor",
] as const;

const TIER_BANDS = [
  { name: "Bronze", min: 0, max: 1400 },
  { name: "Silver", min: 1400, max: 1800 },
  { name: "Gold", min: 1800, max: 2200 },
  { name: "Platinum", min: 2200, max: 2600 },
  { name: "Crystal", min: 2600, max: 3000 },
  { name: "Diamond", min: 3000, max: 3400 },
] as const;

const MOCK_RP_DATA = [2400, 2450, 2420, 2480, 2467, 2510, 2490];

function resolveTierBand(rp: number) {
  return TIER_BANDS.find((band) => rp >= band.min && rp < band.max) ?? null;
}

function getDivisionNumber(rp: number): number | null {
  const band = resolveTierBand(rp);
  if (!band) return null;

  const span = Math.max(1, band.max - band.min);
  const progress = Math.max(0, Math.min(0.9999, (rp - band.min) / span));
  return Math.max(1, 5 - Math.floor(progress * 5));
}

function getLocalizedTierName(
  tierName: string,
  language: "ko" | "en" | "ja" | "zh"
): string {
  const labels: Record<string, Record<"ko" | "en" | "ja" | "zh", string>> = {
    Bronze: { ko: "브론즈", en: "Bronze", ja: "ブロンズ", zh: "青铜" },
    Silver: { ko: "실버", en: "Silver", ja: "シルバー", zh: "白银" },
    Gold: { ko: "골드", en: "Gold", ja: "ゴールド", zh: "黄金" },
    Platinum: { ko: "플래티넘", en: "Platinum", ja: "プラチナ", zh: "白金" },
    Crystal: { ko: "크리스탈", en: "Crystal", ja: "クリスタル", zh: "水晶" },
    Diamond: { ko: "다이아몬드", en: "Diamond", ja: "ダイヤモンド", zh: "钻石" },
    Master: { ko: "마스터", en: "Master", ja: "マスター", zh: "大师" },
    Survivor: { ko: "서바이버", en: "Survivor", ja: "サバイバー", zh: "生存者" },
    Unranked: { ko: "언랭크", en: "Unranked", ja: "アンランク", zh: "未定级" },
  };

  return labels[tierName]?.[language] ?? tierName;
}

function formatBestTierLabel(
  rp: number,
  language: "ko" | "en" | "ja" | "zh",
  platformRegion?: string | null,
  leaderboardRank?: number | string | null
): string {
  const tier = getTierInfo(rp, platformRegion, leaderboardRank);
  const tierLabel = getLocalizedTierName(tier.name, language);
  const division = getDivisionNumber(rp);

  if (tier.name === "Master" || tier.name === "Survivor" || division === null) {
    return `${tierLabel} (${rp.toLocaleString()})`;
  }

  return `${tierLabel} ${division} (${rp.toLocaleString()})`;
}

function getTierNodeLetter(tierName: string): string {
  if (tierName === "Bronze") return "B";
  if (tierName === "Silver") return "S";
  if (tierName === "Gold") return "G";
  if (tierName === "Platinum") return "P";
  if (tierName === "Crystal") return "C";
  if (tierName === "Diamond") return "D";
  if (tierName === "Master") return "M";
  if (tierName === "Survivor") return "S";
  return tierName.charAt(0).toUpperCase() || "U";
}

function buildNodeLabels(currentTierName: string) {
  const currentTierIndex = Math.max(
    0,
    TIER_ORDER.findIndex((tier) => tier === currentTierName)
  );
  const nextTierName =
    TIER_ORDER[Math.min(currentTierIndex + 1, TIER_ORDER.length - 1)] ??
    currentTierName;
  const currentLetter = getTierNodeLetter(currentTierName);
  const nextLetter = getTierNodeLetter(nextTierName);

  return [
    `${currentLetter}5`,
    `${currentLetter}4`,
    `${currentLetter}3`,
    `${currentLetter}2`,
    `${currentLetter}1`,
    `${nextLetter}5`,
  ];
}

function buildChartCoordinates(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const circles = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 40 - ((value - min) / range) * 40;
    return { x, y };
  });

  const linePoints = circles.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M 0 40 L ${linePoints.replace(/ /g, " L ")} L 100 40 Z`;

  return { linePoints, areaPath, circles };
}

export default function RankTrendWidget({
  points,
  currentRp,
  bestRp,
  platformRegion,
  leaderboardRank,
}: RankTrendWidgetProps) {
  const { language } = useLanguage();
  const gradientId = useId();
  const currentTier = getTierInfo(currentRp, platformRegion, leaderboardRank);
  const currentTierName = currentTier.name;
  const tierColor = currentTier.colorHex;

  const text =
    language === "en"
      ? {
          title: "Ranked Progress",
          deltaLabel: "Last 30 Days",
          bestTier: "Best Tier",
          empty: "No ranked RP history.",
          baseline: "Baseline",
          current: "Current",
        }
      : language === "ja"
        ? {
            title: "ランク進行度",
            deltaLabel: "直近30日",
            bestTier: "最高ティア",
            empty: "ランクRP履歴がありません。",
            baseline: "基準",
            current: "現在",
          }
        : language === "zh"
          ? {
              title: "排位进度",
              deltaLabel: "最近30天",
              bestTier: "最高段位",
              empty: "没有排位RP记录。",
              baseline: "基准",
              current: "当前",
            }
          : {
              title: "경쟁전 랭크 진행도",
              deltaLabel: "최근 30일",
              bestTier: "최고 티어",
              empty: "경쟁전 RP 기록이 없습니다.",
              baseline: "기준",
              current: "현재",
            };

  const displayPoints = useMemo(() => {
    if (points.length >= 2) return points;
    if (points.length === 1) {
      const base = points[0];
      return [base - 25, base + 10, base - 12, base + 28, base];
    }
    if (currentRp > 0) {
      return [
        currentRp - 60,
        currentRp - 20,
        currentRp - 45,
        currentRp + 10,
        currentRp - 8,
        currentRp + 32,
        currentRp,
      ];
    }
    return MOCK_RP_DATA;
  }, [points, currentRp]);

  const bestResolvedRp = Math.max(bestRp, ...displayPoints, 0);
  const delta =
    displayPoints.length >= 2
      ? displayPoints[displayPoints.length - 1] - displayPoints[0]
      : 0;
  const { linePoints, areaPath, circles } = useMemo(
    () => buildChartCoordinates(displayPoints),
    [displayPoints]
  );

  const isEliteTier =
    currentTierName === "Master" || currentTierName === "Survivor";
  const currentSubTier = getDivisionNumber(currentRp) ?? 5;
  const activeIndex = Math.max(0, Math.min(4, 5 - currentSubTier));
  const nodes = buildNodeLabels(currentTierName);
  const lineWidthPercent = (activeIndex / 5) * 100;

  const eliteBaselineRp = currentTierName === "Survivor" ? 3700 : 3400;
  const eliteCapRp =
    currentTierName === "Master"
      ? 3700
      : Math.max(currentRp, eliteBaselineRp + 300);
  const eliteProgressPercent = isEliteTier
    ? currentTierName === "Survivor"
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            ((currentRp - eliteBaselineRp) /
              Math.max(1, eliteCapRp - eliteBaselineRp)) *
              100
          )
        )
    : 0;

  return (
    <div className="w-full overflow-hidden rounded-xl bg-zinc-900 p-5 text-[13px] text-white">
      <h3 className="text-sm font-bold text-white">{text.title}</h3>

      {isEliteTier ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>
              {text.baseline} {eliteBaselineRp.toLocaleString()} RP
            </span>
            <span className="font-semibold" style={{ color: tierColor }}>
              {text.current} {currentRp.toLocaleString()} RP
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-700">
            <div
              className="h-full rounded-full"
              style={{
                width: `${eliteProgressPercent}%`,
                backgroundColor: tierColor,
                boxShadow: `0 0 12px ${tierColor}66`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="relative flex justify-between items-start">
            <div className="absolute left-0 right-0 top-[6px] h-1 rounded-full bg-zinc-700" />
            <div
              className="absolute left-0 top-[6px] h-1 rounded-full"
              style={{
                width: `${lineWidthPercent}%`,
                backgroundColor: tierColor,
                boxShadow: `0 0 12px ${tierColor}66`,
              }}
            />

            {nodes.map((label, index) => {
              const filled = index <= activeIndex;
              return (
                <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      filled ? "" : "border-2 border-zinc-600 bg-zinc-800"
                    }`}
                    style={
                      filled
                        ? {
                            backgroundColor: tierColor,
                            boxShadow: `0 0 10px ${tierColor}80`,
                          }
                        : { borderColor: `${tierColor}66` }
                    }
                  />
                  <span className="text-[10px] font-semibold text-zinc-400">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <div
          className="font-semibold"
          style={{ color: delta >= 0 ? tierColor : "#fb7185" }}
        >
          {text.deltaLabel} {delta >= 0 ? "▲" : "▼"}{" "}
          {Math.abs(delta).toLocaleString()} RP
        </div>
        <div className="text-right text-zinc-400">
          {text.bestTier}:{" "}
          <span className="font-semibold text-zinc-200">
            {formatBestTierLabel(
              bestResolvedRp,
              language,
              platformRegion,
              leaderboardRank
            )}
          </span>
        </div>
      </div>

      <div className="mt-4 h-[100px] w-full">
        <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tierColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={tierColor} stopOpacity="0.03" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <polyline
            points={linePoints}
            fill="none"
            stroke={tierColor}
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {circles.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === circles.length - 1 ? 2.3 : 1.5}
              fill={tierColor}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
