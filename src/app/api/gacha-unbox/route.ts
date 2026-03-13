import { NextRequest, NextResponse } from "next/server";
import { getApiCache, setApiCache } from "@/lib/apiCache";
import { getPubgWeaponSkins, type PubgWeaponSkinItem, type WeaponSkinLanguage } from "@/lib/pubgWeaponSkins";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BoxType = "weapon" | "clothing";
type TierKey = "ultimate" | "legendary" | "epic" | "elite" | "rare" | "special" | "classic" | "unknown";
type BoxVariant = "gold" | "silver" | "black";

interface CrateMeta {
  id: string;
  slug: string;
  name: string;
  detailUrl: string;
  imageUrl: string;
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

interface ProbabilityInfo {
  mode: "configured";
  sourceUrl: string;
  matchedSection: string | null;
  fetchedAt: string;
  tierRates: Partial<Record<TierKey, number>>;
}

interface DrawPayload {
  fetchedAt: string;
  sourceUrl: string;
  crate: CrateMeta;
  probability: ProbabilityInfo;
  items: DrawItem[];
  tierSummary: Record<TierKey, number>;
}

const CACHE_TTL_SECONDS = 60 * 20;
const DRAW_COUNT = 10;

const TIER_PROBABILITIES: Record<BoxType, Partial<Record<TierKey, number>>> = {
  weapon: {
    ultimate: 0.1,
    legendary: 1.9,
    epic: 6,
    elite: 16,
    rare: 28,
    special: 14,
    classic: 34,
  },
  clothing: {
    legendary: 2,
    epic: 6,
    elite: 18,
    rare: 28,
    special: 18,
    classic: 28,
  },
};

function getLanguage(input: string | null): WeaponSkinLanguage {
  return input === "en" ? "en" : "ko";
}

function getBoxType(input: string | null): BoxType {
  return input === "clothing" ? "clothing" : "weapon";
}

function getCrate(language: WeaponSkinLanguage, boxType: BoxType): CrateMeta {
  if (boxType === "weapon") {
    return {
      id: "wbz-weapon-contraband",
      slug: "weapon-contraband-crate",
      name: language === "ko" ? "무기 밀수품 상자" : "Weapon Contraband Crate",
      detailUrl: "https://pubgitems.info/ko/boxes/crate",
      imageUrl: "https://cdn.pubgitems.info/i-large/14100071.png",
    };
  }

  return {
    id: "wbz-clothing-crate",
    slug: "clothing-smuggler-crate",
    name: language === "ko" ? "의상 밀수품 상자" : "Clothing Smuggler Crate",
    detailUrl: "https://pubgitems.info/ko/clothing/torso",
    imageUrl: "https://cdn.pubgitems.info/i-icons/11050001.png",
  };
}

function normalizeRates(rates: Partial<Record<TierKey, number>>): Partial<Record<TierKey, number>> {
  const normalized: Partial<Record<TierKey, number>> = {};
  let total = 0;

  for (const [key, value] of Object.entries(rates)) {
    const safe = Number(value);
    if (!Number.isFinite(safe) || safe <= 0) continue;
    normalized[key as TierKey] = safe;
    total += safe;
  }

  if (total <= 0) return {};
  if (Math.abs(total - 100) < 0.0001) return normalized;

  const scaled: Partial<Record<TierKey, number>> = {};
  for (const [key, value] of Object.entries(normalized)) {
    scaled[key as TierKey] = (value as number) * (100 / total);
  }
  return scaled;
}

function tierToBoxVariant(tier: TierKey): BoxVariant {
  if (tier === "ultimate" || tier === "legendary" || tier === "epic") return "gold";
  if (tier === "elite" || tier === "rare") return "silver";
  return "black";
}

function colorToTier(color: string | null): TierKey {
  const normalized = (color ?? "").trim().toLowerCase();
  if (!normalized) return "classic";
  if (normalized === "#b72314") return "legendary";
  if (normalized === "#918100") return "legendary";
  if (normalized === "#9d22d7") return "epic";
  if (normalized === "#4e2f9b") return "elite";
  if (normalized === "#006ab6") return "rare";
  if (normalized === "#007470") return "special";
  if (normalized === "#777777") return "classic";
  return "unknown";
}

function toDrawItem(item: PubgWeaponSkinItem): DrawItem {
  const tier = colorToTier(item.rarityColor);
  return {
    id: item.id,
    qty: 1,
    chance: 1,
    rarity: tier,
    rarityColor: item.rarityColor,
    name: item.skinName,
    imageUrl: item.imageUrl,
    tier,
    boxVariant: tierToBoxVariant(tier),
    isChroma: false,
    isProgressive: false,
    isSchematics: false,
  };
}

function createEmptySummary(): Record<TierKey, number> {
  return {
    ultimate: 0,
    legendary: 0,
    epic: 0,
    elite: 0,
    rare: 0,
    special: 0,
    classic: 0,
    unknown: 0,
  };
}

function pickWeighted<T>(entries: Array<{ value: T; weight: number }>): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) {
    return entries[Math.floor(Math.random() * entries.length)].value;
  }

  let cursor = Math.random() * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.value;
  }

  return entries[entries.length - 1].value;
}

async function getPools(language: WeaponSkinLanguage, boxType: BoxType): Promise<Record<TierKey, DrawItem[]>> {
  const cacheKey = `wbz:gacha:pools:${language}:${boxType}:v1`;
  const cached = await getApiCache<Record<TierKey, DrawItem[]>>(cacheKey);
  if (cached) return cached;

  const skins = await getPubgWeaponSkins(language, boxType);
  const pools: Record<TierKey, DrawItem[]> = {
    ultimate: [],
    legendary: [],
    epic: [],
    elite: [],
    rare: [],
    special: [],
    classic: [],
    unknown: [],
  };

  for (const item of skins.items) {
    const drawItem = toDrawItem(item);
    pools[drawItem.tier].push(drawItem);
  }

  if (!Object.values(pools).some((pool) => pool.length > 0)) {
    throw new Error(`No ${boxType} skin items available for draw pool`);
  }

  await setApiCache(cacheKey, pools, CACHE_TTL_SECONDS, ["gacha", boxType]);
  return pools;
}

async function getProbability(language: WeaponSkinLanguage, boxType: BoxType): Promise<ProbabilityInfo> {
  const sourceUrl = boxType === "weapon" ? "https://pubgitems.info/ko/boxes/crate" : "https://pubgitems.info/ko/clothing/torso";
  return {
    mode: "configured",
    sourceUrl,
    matchedSection: null,
    fetchedAt: new Date().toISOString(),
    tierRates: normalizeRates(TIER_PROBABILITIES[boxType]),
  };
}

function buildDrawResults(pools: Record<TierKey, DrawItem[]>, probability: ProbabilityInfo): DrawItem[] {
  const tierEntries = Object.entries(probability.tierRates)
    .map(([key, value]) => ({
      value: key as TierKey,
      weight: Number(value),
    }))
    .filter((entry) => entry.weight > 0 && pools[entry.value].length > 0);

  if (!tierEntries.length) {
    return Object.values(pools)
      .flat()
      .slice(0, DRAW_COUNT);
  }

  return Array.from({ length: DRAW_COUNT }, () => {
    const tier = pickWeighted(tierEntries);
    const itemPool = pools[tier].map((item) => ({
      value: item,
      weight: item.chance > 0 ? item.chance : 1,
    }));
    return pickWeighted(itemPool);
  });
}

function summarize(items: DrawItem[]): Record<TierKey, number> {
  const summary = createEmptySummary();
  for (const item of items) {
    summary[item.tier] += 1;
  }
  return summary;
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const action = search.get("action") ?? "meta";
  const language = getLanguage(search.get("lang"));
  const boxType = getBoxType(search.get("boxType"));

  if (action !== "meta" && action !== "draw") {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  try {
    const crate = getCrate(language, boxType);
    const probability = await getProbability(language, boxType);

    if (action === "meta") {
      return NextResponse.json({
        fetchedAt: new Date().toISOString(),
        sourceUrl: probability.sourceUrl,
        crate,
        probability,
        boxType,
        boxTierMap: {
          gold: ["ultimate", "legendary", "epic"],
          silver: ["elite", "rare"],
          black: ["special", "classic", "unknown"],
        },
      });
    }

    const pools = await getPools(language, boxType);
    const items = buildDrawResults(pools, probability);
    const payload: DrawPayload = {
      fetchedAt: new Date().toISOString(),
      sourceUrl: probability.sourceUrl,
      crate,
      probability,
      items,
      tierSummary: summarize(items),
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Gacha unbox API error:", error);
    return NextResponse.json({ message: "Failed to load draw data." }, { status: 500 });
  }
}
