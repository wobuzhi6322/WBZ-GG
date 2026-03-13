"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import type { LanguageType } from "@/data/locales";

type ApiLanguage = "ko" | "en";
type BoxType = "weapon" | "clothing";
type TierKey = "ultimate" | "legendary" | "epic" | "elite" | "rare" | "special" | "classic" | "unknown";
type BoxVariant = "gold" | "silver" | "black";

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
  mode: "configured";
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
  boxType: BoxType;
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
  language: LanguageType;
}

const DRAW_COUNT = 10;
const OPEN_ALL_INTERVAL_MS = 90;

const CARD_IMAGES: Record<BoxVariant, string> = {
  gold: "https://pubgitems.info/card-gold.png",
  silver: "https://pubgitems.info/card-silver.png",
  black: "https://pubgitems.info/card-black.png",
};

function createClosedSlots(): boolean[] {
  return Array.from({ length: DRAW_COUNT }, () => false);
}

function toApiLanguage(language: LanguageType): ApiLanguage {
  return language === "en" ? "en" : "ko";
}

function toLocale(language: LanguageType): string {
  if (language === "ko") return "ko-KR";
  if (language === "ja") return "ja-JP";
  if (language === "zh") return "zh-CN";
  return "en-US";
}

function formatNumber(value: number, language: LanguageType): string {
  return new Intl.NumberFormat(toLocale(language)).format(value);
}

function formatCurrency(value: number, currency: "USD" | "KRW", language: LanguageType): string {
  return new Intl.NumberFormat(toLocale(language), {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(value);
}

function formatDate(value: string, language: LanguageType): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(toLocale(language), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function boxLabel(boxType: BoxType, language: LanguageType): string {
  if (language === "ko") return boxType === "weapon" ? "무기 상자" : "의상 상자";
  if (language === "ja") return boxType === "weapon" ? "武器ボックス" : "衣装ボックス";
  if (language === "zh") return boxType === "weapon" ? "武器箱" : "服装箱";
  return boxType === "weapon" ? "Weapon Box" : "Clothing Box";
}

function tierLabel(tier: TierKey, language: LanguageType): string {
  const ko: Record<TierKey, string> = {
    ultimate: "얼티밋",
    legendary: "레전더리",
    epic: "에픽",
    elite: "엘리트",
    rare: "레어",
    special: "스페셜",
    classic: "클래식",
    unknown: "기타",
  };
  const en: Record<TierKey, string> = {
    ultimate: "Ultimate",
    legendary: "Legendary",
    epic: "Epic",
    elite: "Elite",
    rare: "Rare",
    special: "Special",
    classic: "Classic",
    unknown: "Unknown",
  };
  return language === "ko" ? ko[tier] : en[tier];
}

export default function SkinGachaSimulator({ language }: SkinGachaSimulatorProps) {
  const apiLanguage = useMemo(() => toApiLanguage(language), [language]);
  const [boxType, setBoxType] = useState<BoxType>("weapon");
  const [meta, setMeta] = useState<MetaPayload | null>(null);
  const [drawState, setDrawState] = useState<DrawItem[] | null>(null);
  const [openedSlots, setOpenedSlots] = useState<boolean[]>(createClosedSlots());
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [openingAll, setOpeningAll] = useState(false);
  const [drawCount, setDrawCount] = useState(0);
  const [pricing, setPricing] = useState<PricingPayload | null>(null);
  const [error, setError] = useState("");
  const openAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const text = useMemo(() => {
    if (language === "ko") {
      return {
        title: "스킨 박스 시뮬레이터",
        subtitle: "무기 상자와 의상 상자를 전환하며 가상 뽑기를 테스트할 수 있습니다.",
        drawTen: "10회 뽑기",
        openAll: "한번에 열기",
        openingAll: "열기 진행 중...",
        reset: "초기화",
        loadingMeta: "상자 정보를 불러오는 중입니다...",
        rolling: "뽑기 결과 계산 중입니다...",
        clickToOpen: "카드를 클릭하면 왼쪽으로 회전하며 열립니다.",
        costTitle: "비용 추정",
        perDraw: "1회 소모",
        perRoll: "10회 소모",
        totalSpent: "누적 사용",
        activeCrate: "선택 상자",
        updatedAt: "업데이트 시각",
        probability: "등급 확률",
        source: "출처",
        error: "시뮬레이터 데이터를 불러오지 못했습니다.",
      };
    }

    if (language === "ja") {
      return {
        title: "スキンボックスシミュレーター",
        subtitle: "武器ボックスと衣装ボックスを切り替えて仮想抽選を試せます。",
        drawTen: "10回引く",
        openAll: "一括オープン",
        openingAll: "オープン中...",
        reset: "リセット",
        loadingMeta: "ボックス情報を読み込み中です...",
        rolling: "抽選結果を計算中です...",
        clickToOpen: "カードをクリックすると左に回転して開きます。",
        costTitle: "費用目安",
        perDraw: "1回コスト",
        perRoll: "10回コスト",
        totalSpent: "累計使用",
        activeCrate: "選択ボックス",
        updatedAt: "更新時刻",
        probability: "等級確率",
        source: "出典",
        error: "シミュレーターのデータを読み込めませんでした。",
      };
    }

    if (language === "zh") {
      return {
        title: "皮肤箱模拟器",
        subtitle: "可在武器箱与服装箱之间切换，进行虚拟抽奖测试。",
        drawTen: "十连抽",
        openAll: "一键开启",
        openingAll: "开启中...",
        reset: "重置",
        loadingMeta: "正在加载箱子信息...",
        rolling: "正在计算抽奖结果...",
        clickToOpen: "点击卡牌后会向左翻开。",
        costTitle: "费用估算",
        perDraw: "单次消耗",
        perRoll: "十连消耗",
        totalSpent: "累计消耗",
        activeCrate: "当前箱子",
        updatedAt: "更新时间",
        probability: "等级概率",
        source: "来源",
        error: "无法加载模拟器数据。",
      };
    }

    return {
      title: "Skin Box Simulator",
      subtitle: "Switch between weapon and clothing crates and test a virtual draw flow.",
      drawTen: "Draw x10",
      openAll: "Open All",
      openingAll: "Opening...",
      reset: "Reset",
      loadingMeta: "Loading crate metadata...",
      rolling: "Calculating draw results...",
      clickToOpen: "Click a card to flip it open to the left.",
      costTitle: "Cost Estimate",
      perDraw: "Per Draw",
      perRoll: "Per 10 Draw",
      totalSpent: "Total Spent",
      activeCrate: "Active Crate",
      updatedAt: "Updated At",
      probability: "Tier Rates",
      source: "Source",
      error: "Unable to load simulator data.",
    };
  }, [language]);

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true);
    setError("");

    try {
      const response = await fetch(`/api/gacha-unbox?action=meta&lang=${apiLanguage}&boxType=${boxType}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch crate metadata: ${response.status}`);
      }

      const payload = (await response.json()) as MetaPayload;
      setMeta(payload);
    } catch (fetchError) {
      console.error(fetchError);
      setMeta(null);
      setError(text.error);
    } finally {
      setLoadingMeta(false);
    }
  }, [apiLanguage, boxType, text.error]);

  const fetchPricing = useCallback(async () => {
    try {
      const response = await fetch("/api/gacha-pricing", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as PricingPayload;
      setPricing(payload);
    } catch (fetchError) {
      console.error(fetchError);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  useEffect(() => {
    setDrawState(null);
    setOpenedSlots(createClosedSlots());
    setOpeningAll(false);
    if (openAllTimerRef.current) {
      clearTimeout(openAllTimerRef.current);
      openAllTimerRef.current = null;
    }
  }, [boxType]);

  useEffect(() => {
    return () => {
      if (openAllTimerRef.current) {
        clearTimeout(openAllTimerRef.current);
      }
    };
  }, []);

  const roll = useCallback(async () => {
    setRolling(true);
    setError("");
    setOpenedSlots(createClosedSlots());
    setOpeningAll(false);

    try {
      const response = await fetch(`/api/gacha-unbox?action=draw&lang=${apiLanguage}&boxType=${boxType}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to draw: ${response.status}`);
      }

      const payload = (await response.json()) as DrawPayload;
      setMeta({
        fetchedAt: payload.fetchedAt,
        sourceUrl: payload.sourceUrl,
        crate: payload.crate,
        probability: payload.probability,
        boxType,
      });
      setDrawState(payload.items);
      setDrawCount((current) => current + 1);
    } catch (fetchError) {
      console.error(fetchError);
      setDrawState(null);
      setError(text.error);
    } finally {
      setRolling(false);
    }
  }, [apiLanguage, boxType, text.error]);

  const openSlot = (index: number) => {
    setOpenedSlots((current) => current.map((value, currentIndex) => (currentIndex === index ? true : value)));
  };

  const handleOpenAll = () => {
    if (!drawState || openingAll) return;
    setOpeningAll(true);

    const reveal = (index: number) => {
      setOpenedSlots((current) => current.map((value, currentIndex) => (currentIndex <= index ? true : value)));
      if (index >= drawState.length - 1) {
        setOpeningAll(false);
        return;
      }

      openAllTimerRef.current = setTimeout(() => reveal(index + 1), OPEN_ALL_INTERVAL_MS);
    };

    reveal(0);
  };

  const reset = () => {
    setDrawState(null);
    setOpenedSlots(createClosedSlots());
    setOpeningAll(false);
    if (openAllTimerRef.current) {
      clearTimeout(openAllTimerRef.current);
      openAllTimerRef.current = null;
    }
  };

  const perDrawGcoin = pricing?.pricing.perDrawGcoin ?? 1800;
  const perRollGcoin = pricing?.pricing.perRollGcoin ?? perDrawGcoin * DRAW_COUNT;
  const totalSpentGcoin = perRollGcoin * drawCount;
  const usdPerGcoin = pricing?.pricing.referencePack.usdPerGcoin ?? 9.99 / 1050;
  const usdToKrw = pricing?.exchangeRate.usdToKrw ?? 1430;

  const cost = {
    perDrawUsd: perDrawGcoin * usdPerGcoin,
    perDrawKrw: perDrawGcoin * usdPerGcoin * usdToKrw,
    perRollUsd: perRollGcoin * usdPerGcoin,
    perRollKrw: perRollGcoin * usdPerGcoin * usdToKrw,
    totalUsd: totalSpentGcoin * usdPerGcoin,
    totalKrw: totalSpentGcoin * usdPerGcoin * usdToKrw,
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100">{text.title}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{text.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["weapon", "clothing"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBoxType(value)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  boxType === value
                    ? "bg-[#f0b90b] text-black"
                    : "border border-gray-200 bg-white text-gray-700 dark:border-white/10 dark:bg-[#2B2D31] dark:text-gray-300"
                }`}
              >
                {boxLabel(value, language)}
              </button>
            ))}
          </div>
        </div>

        {loadingMeta ? (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">{text.loadingMeta}</div>
        ) : meta ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr_320px]">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#2B2D31]">
              <div className="relative mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-gray-100 to-gray-50 dark:from-black/30 dark:to-black/50">
                <Image src={meta.crate.imageUrl} alt={meta.crate.name} width={160} height={160} className="h-full w-full object-contain" />
              </div>
              <div className="mt-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{text.activeCrate}</div>
                <div className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">{meta.crate.name}</div>
                <a
                  href={meta.crate.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-[#f0b90b] hover:underline"
                >
                  {text.source}
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#2B2D31]">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={roll}
                  disabled={rolling}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f0b90b] px-4 py-2 text-sm font-bold text-black disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  {rolling ? text.rolling : text.drawTen}
                </button>
                <button
                  type="button"
                  onClick={handleOpenAll}
                  disabled={!drawState || openingAll}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-60 dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
                >
                  {openingAll ? text.openingAll : text.openAll}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
                >
                  <RotateCcw className="h-4 w-4" />
                  {text.reset}
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{text.clickToOpen}</p>

              {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#2B2D31]">
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{text.costTitle}</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">{text.perDraw}</span>
                  <span className="text-right font-semibold text-gray-900 dark:text-gray-100">
                    {formatNumber(perDrawGcoin, language)} G / {formatCurrency(cost.perDrawKrw, "KRW", language)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">{text.perRoll}</span>
                  <span className="text-right font-semibold text-gray-900 dark:text-gray-100">
                    {formatNumber(perRollGcoin, language)} G / {formatCurrency(cost.perRollKrw, "KRW", language)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">{text.totalSpent}</span>
                  <span className="text-right font-semibold text-gray-900 dark:text-gray-100">
                    {formatNumber(totalSpentGcoin, language)} G / {formatCurrency(cost.totalKrw, "KRW", language)}
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
                <div>{text.updatedAt}: {formatDate(meta.fetchedAt, language)}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: DRAW_COUNT }).map((_, index) => {
          const item = drawState?.[index];
          const opened = openedSlots[index];
          const cardImage = item ? CARD_IMAGES[item.boxVariant] : CARD_IMAGES.black;

          return (
            <button
              key={`${item?.id ?? "slot"}-${index}`}
              type="button"
              onClick={() => item && openSlot(index)}
              disabled={!item || opened}
              className="group h-[260px] rounded-2xl border border-gray-200 bg-white p-3 text-left transition disabled:cursor-default dark:border-white/10 dark:bg-[#2B2D31]"
            >
              {!item || !opened ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="relative h-28 w-28 transition duration-200 group-hover:scale-105">
                    <Image src={cardImage} alt={item ? tierLabel(item.tier, language) : "card"} fill className="object-contain" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{boxLabel(boxType, language)}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {item ? tierLabel(item.tier, language) : text.drawTen}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="relative flex h-32 items-center justify-center rounded-xl bg-gradient-to-b from-gray-100 to-gray-50 p-3 dark:from-black/30 dark:to-black/50">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-3" />
                  </div>
                  <div className="mt-3 flex-1">
                    <span className="inline-flex rounded-full bg-[#f0b90b]/15 px-2 py-0.5 text-[11px] font-bold text-[#f0b90b]">
                      {tierLabel(item.tier, language)}
                    </span>
                    <p className="mt-2 line-clamp-2 text-sm font-bold text-gray-900 dark:text-gray-100">{item.name}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.qty}x</p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {meta?.probability ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#2B2D31]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h4 className="text-lg font-black text-gray-900 dark:text-gray-100">{text.probability}</h4>
              <a
                href={meta.probability.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-[#f0b90b] hover:underline"
              >
                {text.source}
              </a>
            </div>

            <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(meta.probability.tierRates).map(([tier, value]) => (
                <div
                  key={tier}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-black/20"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">{tierLabel(tier as TierKey, language)}</div>
                  <div className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">{Number(value).toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
