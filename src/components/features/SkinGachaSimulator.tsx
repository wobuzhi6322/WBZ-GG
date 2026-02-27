"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import type { LanguageType } from "@/data/locales";

type ApiLanguageType = "ko" | "en";
type TierKey = "ultimate" | "legendary" | "epic" | "elite" | "rare" | "special" | "classic" | "unknown";
type BoxVariant = "gold" | "silver" | "black";

export interface SimulatorSkinItem {
  id: string;
  skinName: string;
  weaponName: string;
  imageUrl: string;
}

interface TierConfig {
  labelKo: string;
  labelEn: string;
  borderClass: string;
  badgeClass: string;
  boxVariant: BoxVariant;
}

interface DrawItem {
  id: string;
  qty: number;
  chance: number;
  rarity: string;
  rarityColor: string | null;
  name: string;
  imageUrl: string;
  tier: TierKey;
  boxVariant: BoxVariant;
  isChroma: boolean;
  isProgressive: boolean;
  isSchematics: boolean;
}

interface CrateMeta {
  id: string;
  slug: string;
  name: string;
  detailUrl: string;
  imageUrl: string;
}

interface ProbabilityInfo {
  mode: "official" | "observed";
  sourceUrl: string;
  matchedSection: string | null;
  fetchedAt: string;
  tierRates: Partial<Record<TierKey, number>>;
}

interface MetaPayload {
  fetchedAt: string;
  sourceUrl: string;
  crate: CrateMeta;
  probability: ProbabilityInfo | null;
}

interface DrawPayload {
  fetchedAt: string;
  sourceUrl: string;
  crate: CrateMeta;
  probability: ProbabilityInfo;
  items: DrawItem[];
  tierSummary: Record<TierKey, number>;
}

interface PricingPayload {
  fetchedAt: string;
  exchangeRate: {
    usdToKrw: number;
    source: string;
    updatedAt: string;
  };
  pricing: {
    perDrawGcoin: number;
    drawCountPerRoll: number;
    perRollGcoin: number;
    referencePack: {
      title: string;
      gcoin: number;
      usd: number;
      usdPerGcoin: number;
      sourceUrl: string;
    };
  };
  sources: Array<{
    label: string;
    url: string;
  }>;
}

interface SkinGachaSimulatorProps {
  skins: SimulatorSkinItem[];
  language: LanguageType;
}

const DRAW_COUNT = 10;
const ROLL_DURATION_MS = 900;
const OPEN_ALL_INTERVAL_MS = 90;
const TIER_ORDER: TierKey[] = ["ultimate", "legendary", "epic", "elite", "rare", "special", "classic", "unknown"];

const TIER_CONFIGS: Record<TierKey, TierConfig> = {
  ultimate: {
    labelKo: "얼티밋",
    labelEn: "Ultimate",
    borderClass: "border-rose-500/95",
    badgeClass: "bg-rose-500 text-white",
    boxVariant: "gold",
  },
  legendary: {
    labelKo: "레전더리",
    labelEn: "Legendary",
    borderClass: "border-amber-400/90",
    badgeClass: "bg-amber-400 text-black",
    boxVariant: "gold",
  },
  epic: {
    labelKo: "에픽",
    labelEn: "Epic",
    borderClass: "border-fuchsia-500/80",
    badgeClass: "bg-fuchsia-500 text-white",
    boxVariant: "gold",
  },
  elite: {
    labelKo: "엘리트",
    labelEn: "Elite",
    borderClass: "border-cyan-400/75",
    badgeClass: "bg-cyan-500 text-white",
    boxVariant: "silver",
  },
  rare: {
    labelKo: "레어",
    labelEn: "Rare",
    borderClass: "border-slate-300/70",
    badgeClass: "bg-slate-300 text-black",
    boxVariant: "silver",
  },
  special: {
    labelKo: "스페셜",
    labelEn: "Special",
    borderClass: "border-emerald-400/75",
    badgeClass: "bg-emerald-500 text-white",
    boxVariant: "black",
  },
  classic: {
    labelKo: "클래식",
    labelEn: "Classic",
    borderClass: "border-zinc-500/70",
    badgeClass: "bg-zinc-600 text-white",
    boxVariant: "black",
  },
  unknown: {
    labelKo: "기타",
    labelEn: "Unknown",
    borderClass: "border-zinc-500/70",
    badgeClass: "bg-zinc-700 text-white",
    boxVariant: "black",
  },
};

const CARD_IMAGES: Record<BoxVariant, string> = {
  gold: "https://pubgitems.info/card-gold.png",
  silver: "https://pubgitems.info/card-silver.png",
  black: "https://pubgitems.info/card-black.png",
};

const BOX_LABELS: Record<BoxVariant, { ko: string; en: string }> = {
  gold: { ko: "금 상자", en: "Gold Crate" },
  silver: { ko: "은 상자", en: "Silver Crate" },
  black: { ko: "검은 상자", en: "Black Crate" },
};

function createClosedSlots(): boolean[] {
  return Array.from({ length: DRAW_COUNT }, () => false);
}

function tierLabel(tier: TierKey, language: LanguageType): string {
  return language === "ko" ? TIER_CONFIGS[tier].labelKo : TIER_CONFIGS[tier].labelEn;
}

function boxLabel(variant: BoxVariant, language: LanguageType): string {
  return language === "ko" ? BOX_LABELS[variant].ko : BOX_LABELS[variant].en;
}

function toIntlLocale(language: LanguageType): string {
  switch (language) {
    case "ko":
      return "ko-KR";
    case "ja":
      return "ja-JP";
    case "zh":
      return "zh-CN";
    default:
      return "en-US";
  }
}

function toApiLanguage(language: LanguageType): ApiLanguageType {
  return language === "ko" ? "ko" : "en";
}

function formatCurrency(value: number, currency: "USD" | "KRW", language: LanguageType): string {
  const locale = toIntlLocale(language);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(value);
}

function formatNumber(value: number, language: LanguageType): string {
  return new Intl.NumberFormat(toIntlLocale(language)).format(value);
}

function toDateText(value: string, language: LanguageType): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(toIntlLocale(language), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toRarityText(rawRarity: string, language: LanguageType): string {
  const rarity = rawRarity.toLowerCase();
  const mapKo: Record<string, string> = {
    ultimate: "얼티밋",
    legendary: "레전더리",
    epic: "에픽",
    elite: "엘리트",
    rare: "레어",
    special: "스페셜",
    classic: "클래식",
  };
  const mapEn: Record<string, string> = {
    ultimate: "Ultimate",
    legendary: "Legendary",
    epic: "Epic",
    elite: "Elite",
    rare: "Rare",
    special: "Special",
    classic: "Classic",
  };
  const mapped = language === "ko" ? mapKo[rarity] : mapEn[rarity];
  return mapped ?? (rawRarity || (language === "ko" ? "기타" : "Unknown"));
}

function tierSummaryFromDraw(drawState: DrawItem[] | null): Record<TierKey, number> {
  const summary: Record<TierKey, number> = {
    ultimate: 0,
    legendary: 0,
    epic: 0,
    elite: 0,
    rare: 0,
    special: 0,
    classic: 0,
    unknown: 0,
  };

  if (!drawState) return summary;
  for (const item of drawState) {
    summary[item.tier] += 1;
  }
  return summary;
}

export default function SkinGachaSimulator({ skins: _skins, language }: SkinGachaSimulatorProps) {
  const [drawId, setDrawId] = useState(0);
  const [drawState, setDrawState] = useState<DrawItem[] | null>(null);
  const [openedSlots, setOpenedSlots] = useState<boolean[]>(createClosedSlots());
  const [isRolling, setIsRolling] = useState(false);
  const [isOpeningAll, setIsOpeningAll] = useState(false);
  const [drawCount, setDrawCount] = useState(0);
  const [pricing, setPricing] = useState<PricingPayload | null>(null);
  const [crate, setCrate] = useState<CrateMeta | null>(null);
  const [probability, setProbability] = useState<ProbabilityInfo | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [drawError, setDrawError] = useState("");
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiLanguage = useMemo(() => toApiLanguage(language), [language]);

  const text = useMemo(() => {
    if (language === "ko") {
      return {
        title: "밀수품 10회 뽑기 시뮬레이터",
        subtitle: "공식 확률 페이지와 실시간 밀수품 풀을 결합해 뽑기 결과를 계산합니다.",
        drawTen: "10회 뽑기",
        openAll: "한번에 열기",
        openingAll: "열기 진행 중...",
        reset: "초기화",
        loadingMeta: "최신 밀수품 상자 확인 중...",
        rolling: "뽑기 계산 중...",
        clickToOpen: "카드를 클릭하면 왼쪽으로 열립니다.",
        results: "최근 10회 결과 요약",
        spendTitle: "비용 계산",
        perDrawCost: "1회 소모",
        currentRollCost: "10회 소모",
        totalSpent: "누적 사용",
        rateLabel: "USD/KRW 환율",
        fetchedAt: "갱신 시각",
        activeCrate: "적용 상자",
        source: "출처",
        chance: "확률",
        qty: "수량",
        probabilityTitle: "등급 확률",
        probabilityModeOfficial: "공식 확률",
        probabilityModeObserved: "실측 확률",
        probabilitySection: "섹션",
        error: "뽑기 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    return {
      title: "Contraband 10x Draw Simulator",
      subtitle: "Combines official probability pages and live contraband pool sampling.",
      drawTen: "Draw x10",
      openAll: "Open All",
      openingAll: "Opening...",
      reset: "Reset",
      loadingMeta: "Loading latest contraband crate...",
      rolling: "Calculating draw...",
      clickToOpen: "Click a card to swing it open left.",
      results: "Recent 10-Draw Summary",
      spendTitle: "Cost Estimation",
      perDrawCost: "Per Draw",
      currentRollCost: "Per 10 Draw",
      totalSpent: "Total Spent",
      rateLabel: "USD/KRW Rate",
      fetchedAt: "Updated At",
      activeCrate: "Active Crate",
      source: "Source",
      chance: "Chance",
      qty: "Qty",
      probabilityTitle: "Tier Rates",
      probabilityModeOfficial: "Official",
      probabilityModeObserved: "Observed",
      probabilitySection: "Section",
      error: "Could not load draw data. Please try again.",
    };
  }, [language]);

  const fetchMeta = useCallback(async () => {
    setMetaLoading(true);
    setDrawError("");

    try {
      const response = await fetch(`/api/gacha-unbox?action=meta&lang=${apiLanguage}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch crate metadata: ${response.status}`);
      }

      const payload = (await response.json()) as MetaPayload;
      setCrate(payload.crate);
      setProbability(payload.probability);
    } catch (error) {
      console.error(error);
      setCrate(null);
      setProbability(null);
      setDrawError(text.error);
    } finally {
      setMetaLoading(false);
    }
  }, [apiLanguage, text.error]);

  const fetchPricing = useCallback(async () => {
    try {
      const response = await fetch("/api/gacha-pricing", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as PricingPayload;
      setPricing(payload);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchPricing();
    const timer = setInterval(fetchPricing, 60_000);
    return () => clearInterval(timer);
  }, [fetchPricing]);

  const perDrawGcoin = pricing?.pricing.perDrawGcoin ?? 1800;
  const drawCountPerRoll = pricing?.pricing.drawCountPerRoll ?? DRAW_COUNT;
  const currentRollCostGcoin = pricing?.pricing.perRollGcoin ?? perDrawGcoin * drawCountPerRoll;
  const totalSpentGcoin = currentRollCostGcoin * drawCount;

  const usdPerGcoin = pricing?.pricing.referencePack.usdPerGcoin ?? 9.99 / 1050;
  const usdToKrw = pricing?.exchangeRate.usdToKrw ?? 1430;

  const perDrawCostUsd = perDrawGcoin * usdPerGcoin;
  const perDrawCostKrw = perDrawCostUsd * usdToKrw;
  const currentRollCostUsd = currentRollCostGcoin * usdPerGcoin;
  const currentRollCostKrw = currentRollCostUsd * usdToKrw;
  const totalCostUsd = totalSpentGcoin * usdPerGcoin;
  const totalCostKrw = totalCostUsd * usdToKrw;

  const summaryByTier = useMemo(() => tierSummaryFromDraw(drawState), [drawState]);
  const allOpened = Boolean(drawState) && openedSlots.every(Boolean);

  const probabilityEntries = useMemo(() => {
    if (!probability?.tierRates) return [];
    return TIER_ORDER.map((tier) => ({
      tier,
      value: probability.tierRates[tier] ?? 0,
    })).filter((entry) => entry.value > 0);
  }, [probability]);

  const startDraw = useCallback(async () => {
    if (isRolling || isOpeningAll || !crate) return;

    setIsRolling(true);
    setDrawError("");
    setDrawId((current) => current + 1);
    setOpenedSlots(createClosedSlots());

    const startAt = Date.now();
    try {
      const response = await fetch(`/api/gacha-unbox?action=draw&lang=${apiLanguage}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch draw payload: ${response.status}`);
      }

      const payload = (await response.json()) as DrawPayload;
      const items = payload.items.slice(0, DRAW_COUNT);
      if (!items.length) {
        throw new Error("Empty draw payload");
      }

      setDrawState(items);
      setCrate(payload.crate);
      setProbability(payload.probability);
      setDrawCount((current) => current + 1);
    } catch (error) {
      console.error(error);
      setDrawState(null);
      setDrawError(text.error);
    } finally {
      const remaining = Math.max(0, ROLL_DURATION_MS - (Date.now() - startAt));
      if (rollTimerRef.current) {
        clearTimeout(rollTimerRef.current);
      }

      rollTimerRef.current = setTimeout(() => {
        setIsRolling(false);
        rollTimerRef.current = null;
      }, remaining);
    }
  }, [apiLanguage, crate, isOpeningAll, isRolling, text.error]);

  const openSlot = useCallback(
    (index: number) => {
      if (isRolling || isOpeningAll || !drawState) return;
      setOpenedSlots((current) => current.map((opened, slotIndex) => (slotIndex === index ? !opened : opened)));
    },
    [drawState, isOpeningAll, isRolling]
  );

  const openAll = useCallback(() => {
    if (!drawState || isRolling || isOpeningAll || allOpened) return;

    if (openAllTimerRef.current) {
      clearTimeout(openAllTimerRef.current);
      openAllTimerRef.current = null;
    }

    setIsOpeningAll(true);
    let cursor = 0;

    const run = () => {
      setOpenedSlots((current) => {
        if (cursor >= current.length) return current;
        if (current[cursor]) return current;
        const next = [...current];
        next[cursor] = true;
        return next;
      });

      cursor += 1;
      if (cursor >= drawState.length) {
        setIsOpeningAll(false);
        openAllTimerRef.current = null;
        return;
      }

      openAllTimerRef.current = setTimeout(run, OPEN_ALL_INTERVAL_MS);
    };

    run();
  }, [allOpened, drawState, isOpeningAll, isRolling]);

  const resetDraw = useCallback(() => {
    if (rollTimerRef.current) {
      clearTimeout(rollTimerRef.current);
      rollTimerRef.current = null;
    }

    if (openAllTimerRef.current) {
      clearTimeout(openAllTimerRef.current);
      openAllTimerRef.current = null;
    }

    setIsRolling(false);
    setIsOpeningAll(false);
    setDrawState(null);
    setOpenedSlots(createClosedSlots());
    setDrawCount(0);
    setDrawError("");
  }, []);

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) {
        clearTimeout(rollTimerRef.current);
      }
      if (openAllTimerRef.current) {
        clearTimeout(openAllTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="bg-wbz-card border border-white/5 rounded-2xl p-5 md:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-wbz-gold" />
          {text.title}
        </h2>
        <p className="text-sm text-wbz-mute mt-1">{text.subtitle}</p>
      </div>

      {drawError ? <p className="mb-4 text-sm text-rose-300">{drawError}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="text-xs text-wbz-mute mb-2">{text.activeCrate}</p>
          {metaLoading ? (
            <p className="text-sm text-white/80">{text.loadingMeta}</p>
          ) : crate ? (
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-lg bg-black/30 border border-white/10 overflow-hidden shrink-0">
                <Image src={crate.imageUrl} alt={crate.name} fill className="object-contain p-1" sizes="64px" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white font-bold truncate">{crate.name}</p>
                <p className="text-[11px] text-wbz-mute">ID {crate.id}</p>
                <a
                  href={crate.detailUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-wbz-gold hover:underline"
                >
                  {text.source}
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-300">{text.loadingMeta}</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="text-xs text-wbz-mute mb-2">{text.probabilityTitle}</p>
          <div className="text-xs text-white space-y-1">
            <p className="text-wbz-mute">
              {probability?.mode === "official" ? text.probabilityModeOfficial : text.probabilityModeObserved}
            </p>
            {probability?.matchedSection ? (
              <p className="truncate">
                {text.probabilitySection}: <span className="text-white">{probability.matchedSection}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {probabilityEntries.map((entry) => (
                <span
                  key={`rate-${entry.tier}`}
                  className={`text-[11px] font-bold px-2 py-1 rounded-full border ${TIER_CONFIGS[entry.tier].borderClass} text-white`}
                >
                  {tierLabel(entry.tier, language)} {entry.value.toFixed(2)}%
                </span>
              ))}
            </div>
            {probability?.sourceUrl ? (
              <a href={probability.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-wbz-gold hover:underline inline-block">
                {text.source}
              </a>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-2">
          <p className="text-xs text-wbz-mute">{text.spendTitle}</p>
          <div className="text-xs text-white space-y-1">
            <div>
              {text.perDrawCost}: <span className="font-black text-wbz-gold">{formatNumber(perDrawGcoin, language)} G-Coin</span>
              <span className="text-wbz-mute">
                {" "}
                ({formatCurrency(perDrawCostUsd, "USD", language)} / {formatCurrency(perDrawCostKrw, "KRW", language)})
              </span>
            </div>
            <div>
              {text.currentRollCost}: <span className="font-black text-wbz-gold">{formatNumber(currentRollCostGcoin, language)} G-Coin</span>
              <span className="text-wbz-mute">
                {" "}
                ({formatCurrency(currentRollCostUsd, "USD", language)} / {formatCurrency(currentRollCostKrw, "KRW", language)})
              </span>
            </div>
            <div>
              {text.totalSpent}: <span className="font-black text-wbz-gold">{formatNumber(totalSpentGcoin, language)} G-Coin</span>
              <span className="text-wbz-mute">
                {" "}
                ({formatCurrency(totalCostUsd, "USD", language)} / {formatCurrency(totalCostKrw, "KRW", language)})
              </span>
            </div>
            <div className="text-wbz-mute">
              {text.rateLabel}: {usdToKrw.toFixed(2)} | {text.fetchedAt}: {toDateText(pricing?.fetchedAt ?? "", language)}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-white/10 bg-black/25 p-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={startDraw}
            disabled={isRolling || isOpeningAll || !crate}
            className={`px-4 py-2 rounded-lg text-sm font-black transition-colors ${
              isRolling || isOpeningAll || !crate
                ? "bg-zinc-700 text-zinc-300 cursor-not-allowed"
                : "bg-wbz-gold text-black hover:bg-yellow-300"
            }`}
          >
            {isRolling ? text.rolling : text.drawTen}
          </button>
          <button
            type="button"
            onClick={openAll}
            disabled={!drawState || isRolling || isOpeningAll || allOpened}
            className={`px-4 py-2 rounded-lg text-sm font-black transition-colors ${
              !drawState || isRolling || isOpeningAll || allOpened
                ? "bg-zinc-700 text-zinc-300 cursor-not-allowed"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isOpeningAll ? text.openingAll : text.openAll}
          </button>
          <button
            type="button"
            onClick={resetDraw}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-wbz-mute hover:text-white hover:border-white/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {text.reset}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-wbz-mute mb-3">{text.clickToOpen}</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: DRAW_COUNT }).map((_, index) => {
          const result = drawState?.[index];
          const tier = result?.tier ?? "classic";
          const boxVariant = result?.boxVariant ?? TIER_CONFIGS[tier].boxVariant;
          const isOpened = openedSlots[index];

          return (
            <motion.button
              key={`${drawId}-${index}`}
              type="button"
              onClick={() => openSlot(index)}
              whileHover={!isRolling && result ? { scale: 1.05 } : undefined}
              className="text-left rounded-xl"
              disabled={!result}
            >
              <div className="relative h-[170px] [perspective:1000px]">
                <motion.div
                  initial={false}
                  animate={{
                    rotateY: isOpened ? -165 : 0,
                    x: isOpened ? -14 : 0,
                  }}
                  transition={{ duration: 0.42, ease: [0.22, 0.78, 0.26, 1] }}
                  className="absolute inset-0"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div
                    className="absolute inset-0 rounded-xl border border-white/10 bg-black/40 overflow-hidden"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <Image
                      src={CARD_IMAGES[boxVariant]}
                      alt={boxLabel(boxVariant, language)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.28)_0%,transparent_35%,transparent_68%,rgba(255,255,255,0.12)_100%)]" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-wide text-white bg-black/50 px-2 py-1 rounded">
                      {boxLabel(boxVariant, language)}
                    </div>
                  </div>

                  <div
                    className={`absolute inset-0 rounded-xl border ${TIER_CONFIGS[tier].borderClass} bg-zinc-950 overflow-hidden`}
                    style={{
                      transform: "rotateY(180deg)",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    {result ? (
                      <div className="h-full flex flex-col">
                        <div
                          className="h-[96px] flex items-center justify-center p-2"
                          style={{
                            background:
                              result.rarityColor && result.rarityColor.startsWith("#")
                                ? `linear-gradient(to bottom right, rgba(17,24,39,0.95), ${result.rarityColor})`
                                : "rgba(0,0,0,0.35)",
                          }}
                        >
                          <Image
                            src={result.imageUrl}
                            alt={result.name}
                            width={160}
                            height={90}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="px-2 py-2 space-y-1">
                          <p className="text-[11px] text-white font-semibold leading-tight line-clamp-2">{result.name}</p>
                          <p className="text-[10px] text-wbz-mute">
                            {text.qty}: {result.qty} | {text.chance}: {result.chance.toFixed(2)}%
                          </p>
                          <p className="text-[10px] text-wbz-mute truncate">{toRarityText(result.rarity, language)}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              </div>

              <div className="mt-2 text-center">
                {result ? (
                  <span className={`inline-block text-[10px] font-black px-2 py-1 rounded ${TIER_CONFIGS[tier].badgeClass}`}>
                    {tierLabel(tier, language)}
                  </span>
                ) : (
                  <span className="inline-block text-[10px] font-black px-2 py-1 rounded bg-zinc-700 text-zinc-300">-</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {drawState && (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <h3 className="text-sm font-black text-white mb-3">{text.results}</h3>
          <div className="flex flex-wrap gap-2">
            {TIER_ORDER.map((tier) => (
              <span
                key={`summary-${tier}`}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${TIER_CONFIGS[tier].borderClass} text-white`}
              >
                {tierLabel(tier, language)} x{summaryByTier[tier]}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
