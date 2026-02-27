import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LanguageType = "ko" | "en";
type TierKey = "ultimate" | "legendary" | "epic" | "elite" | "rare" | "special" | "classic" | "unknown";
type BoxVariant = "gold" | "silver" | "black";

interface ContrabandCrateMeta {
  id: string;
  slug: string;
  name: string;
  detailUrl: string;
  imageUrl: string;
}

interface UnboxItemPayload {
  qty?: number;
  chance?: string | number;
  rarity?: string;
  rarityColor?: string | null;
  name?: string;
  image?: string;
  isChroma?: boolean;
  isProgressive?: boolean;
  isSchematics?: boolean;
}

interface ApiDrawItem {
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
  mode: "official" | "observed";
  sourceUrl: string;
  matchedSection: string | null;
  fetchedAt: string;
  tierRates: Partial<Record<TierKey, number>>;
}

interface ContrabandSection {
  title: string;
  rows: Array<{
    tier: TierKey;
    chance: number;
  }>;
}

interface OfficialRatesResult {
  sourceUrl: string;
  matchedSection: string | null;
  fetchedAt: string;
  tierRates: Partial<Record<TierKey, number>>;
}

interface DrawTable {
  sourceUrl: string;
  fetchedAt: string;
  pools: Record<TierKey, ApiDrawItem[]>;
  observedTierRates: Partial<Record<TierKey, number>>;
  hasLegendaryPool: boolean;
}

const PUBG_BASE_URL = "https://pubg.com";
const PUBG_ITEMS_BASE_URL = "https://pubgitems.info";

const META_CACHE_TTL_MS = 1000 * 60 * 10;
const DRAW_TABLE_CACHE_TTL_MS = 1000 * 60 * 5;
const OFFICIAL_RATES_CACHE_TTL_MS = 1000 * 60 * 30;
const PROBABILITY_URL_CACHE_TTL_MS = 1000 * 60 * 30;

const DRAW_SAMPLE_BATCH_SIZE = 12;
const DRAW_SAMPLE_BATCHES = 2;
const DRAW_SAMPLE_BATCHES_EXTENDED = 4;
const DRAW_COUNT = 10;

const DEFAULT_CRATE: ContrabandCrateMeta = {
  id: "14100071",
  slug: "time-keeper-contraband-crate",
  name: "Time Keeper - Contraband Crate",
  detailUrl: `${PUBG_ITEMS_BASE_URL}/en/boxes/crate/14100071-time-keeper-contraband-crate`,
  imageUrl: "https://cdn.pubgitems.info/i-large/14100071.png",
};

const DEFAULT_PROBABILITY_PAGE: Record<LanguageType, string> = {
  ko: "https://pubg.com/ko/game-info/probability/pc/9172",
  en: "https://pubg.com/en/game-info/probability/pc/9172",
};

const metaCache: Partial<Record<LanguageType, { expiresAt: number; value: ContrabandCrateMeta }>> = {};
const metaPending: Partial<Record<LanguageType, Promise<ContrabandCrateMeta>>> = {};

const drawTableCache: Record<string, { expiresAt: number; value: DrawTable }> = {};
const drawTablePending: Partial<Record<string, Promise<DrawTable>>> = {};

const probabilityUrlCache: Partial<Record<LanguageType, { expiresAt: number; value: string }>> = {};
const probabilityUrlPending: Partial<Record<LanguageType, Promise<string>>> = {};

const officialRatesCache: Record<string, { expiresAt: number; value: OfficialRatesResult }> = {};
const officialRatesPending: Partial<Record<string, Promise<OfficialRatesResult | null>>> = {};

function getLanguage(input: string | null): LanguageType {
  return input === "en" ? "en" : "ko";
}

function languagePrefix(language: LanguageType): string {
  return language === "ko" ? "/ko" : "/en";
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function decodeEscapedMarkup(value: string): string {
  return value
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u002F/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003D/g, "=")
    .replace(/\\u0022/g, '"')
    .replace(/\\"/g, '"');
}

function stripTags(value: string): string {
  const noTags = value.replace(/<[^>]*>/g, " ");
  return decodeHtml(noTags).replace(/\s+/g, " ").trim();
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s\-_:|()'"`]+/g, "")
    .replace(/밀수품상자/g, "")
    .replace(/contrabandcrate/g, "")
    .trim();
}

function toTierFromLabel(value: string): TierKey {
  const normalized = value.toLowerCase().trim();
  if (!normalized) return "unknown";
  if (normalized.includes("ultimate") || normalized.includes("얼티밋") || normalized.includes("궁극")) return "ultimate";
  if (normalized.includes("legendary") || normalized.includes("레전더리")) return "legendary";
  if (normalized.includes("epic") || normalized.includes("에픽")) return "epic";
  if (normalized.includes("elite") || normalized.includes("엘리트")) return "elite";
  if (normalized.includes("rare") || normalized.includes("레어")) return "rare";
  if (normalized.includes("special") || normalized.includes("스페셜")) return "special";
  if (normalized.includes("classic") || normalized.includes("common") || normalized.includes("일반") || normalized.includes("클래식")) return "classic";
  return "unknown";
}

function tierToBoxVariant(tier: TierKey): BoxVariant {
  if (tier === "ultimate" || tier === "legendary" || tier === "epic") return "gold";
  if (tier === "elite" || tier === "rare") return "silver";
  return "black";
}

function createEmptyPools(): Record<TierKey, ApiDrawItem[]> {
  return {
    ultimate: [],
    legendary: [],
    epic: [],
    elite: [],
    rare: [],
    special: [],
    classic: [],
    unknown: [],
  };
}

function normalizeRates(rates: Partial<Record<TierKey, number>>): Partial<Record<TierKey, number>> {
  const normalized: Partial<Record<TierKey, number>> = {};
  let total = 0;

  for (const [key, value] of Object.entries(rates)) {
    const tier = key as TierKey;
    const safe = Number(value);
    if (!Number.isFinite(safe) || safe <= 0) continue;
    normalized[tier] = safe;
    total += safe;
  }

  if (total <= 0) return {};
  if (Math.abs(total - 100) < 0.0001) return normalized;

  const scaled: Partial<Record<TierKey, number>> = {};
  for (const [key, value] of Object.entries(normalized)) {
    const tier = key as TierKey;
    scaled[tier] = (value as number) * (100 / total);
  }
  return scaled;
}

function sumTierRatesFromItems(items: ApiDrawItem[]): Partial<Record<TierKey, number>> {
  const raw: Partial<Record<TierKey, number>> = {};
  for (const item of items) {
    const current = raw[item.tier] ?? 0;
    raw[item.tier] = current + (Number.isFinite(item.chance) ? item.chance : 0);
  }
  return normalizeRates(raw);
}

function pickWeighted<T>(entries: Array<{ value: T; weight: number }>): T {
  const sum = entries.reduce((acc, entry) => acc + entry.weight, 0);
  if (sum <= 0) {
    return entries[Math.floor(Math.random() * entries.length)].value;
  }

  let cursor = Math.random() * sum;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

async function fetchText(url: string, language: LanguageType): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": language === "ko" ? "ko-KR,ko;q=0.9,en;q=0.8" : "en-US,en;q=0.9,ko;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed request: ${response.status} ${url}`);
  }

  return response.text();
}

async function resolveLatestContrabandMeta(language: LanguageType): Promise<ContrabandCrateMeta> {
  const listUrl = `${PUBG_ITEMS_BASE_URL}${language === "ko" ? "/ko" : ""}/boxes/crate`;
  const listHtml = await fetchText(listUrl, language);
  const linkRegex = /href="(\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?boxes\/crate\/(\d+)-([^"]+))"/g;

  let selectedPath = "";
  let selectedId = "";
  let selectedSlug = "";
  let match = linkRegex.exec(listHtml);

  while (match) {
    const path = match[1] ?? "";
    const id = match[2] ?? "";
    const slug = match[3] ?? "";

    if (!selectedPath) {
      selectedPath = path;
      selectedId = id;
      selectedSlug = slug;
    }

    if (slug.includes("contraband-crate")) {
      selectedPath = path;
      selectedId = id;
      selectedSlug = slug;
      break;
    }

    match = linkRegex.exec(listHtml);
  }

  if (!selectedPath || !selectedId || !selectedSlug) {
    return DEFAULT_CRATE;
  }

  const detailUrl = `${PUBG_ITEMS_BASE_URL}${selectedPath}`;
  const detailHtml = await fetchText(detailUrl, language);
  const h1Match = detailHtml.match(/<h1 class="text-2xl[^"]*">([^<]+)<\/h1>/);
  const imageRegex = new RegExp(`<img src="([^"]*\\/i-large\\/${selectedId}\\.png[^"]*)"`, "i");
  const imageMatch = detailHtml.match(imageRegex);

  const name = decodeHtml(h1Match?.[1] ?? selectedSlug.replace(/-/g, " "));
  const imageUrl = imageMatch?.[1] ?? `https://cdn.pubgitems.info/i-large/${selectedId}.png`;

  return {
    id: selectedId,
    slug: selectedSlug,
    name,
    detailUrl,
    imageUrl,
  };
}

async function getLatestContrabandMeta(language: LanguageType): Promise<ContrabandCrateMeta> {
  const cached = metaCache[language];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (metaPending[language]) {
    return metaPending[language] as Promise<ContrabandCrateMeta>;
  }

  metaPending[language] = resolveLatestContrabandMeta(language)
    .then((value) => {
      metaCache[language] = {
        expiresAt: Date.now() + META_CACHE_TTL_MS,
        value,
      };
      return value;
    })
    .catch((error) => {
      console.error("Failed to resolve contraband metadata:", error);
      return DEFAULT_CRATE;
    })
    .finally(() => {
      delete metaPending[language];
    });

  return metaPending[language] as Promise<ContrabandCrateMeta>;
}

function normalizeDrawItem(caseId: string, item: UnboxItemPayload, index: number): ApiDrawItem | null {
  const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Unknown Item";
  const imageUrl = typeof item.image === "string" ? item.image : "";
  if (!imageUrl) return null;

  const rawRarity = typeof item.rarity === "string" && item.rarity.trim() ? item.rarity : "unknown";
  const tier = toTierFromLabel(rawRarity);
  const boxVariant = tierToBoxVariant(tier);
  const chanceRaw = typeof item.chance === "number" ? item.chance : Number.parseFloat(String(item.chance ?? "0"));
  const qtyRaw = typeof item.qty === "number" ? item.qty : Number.parseInt(String(item.qty ?? "1"), 10);
  const imageKeyMatch = imageUrl.match(/\/(\d+)\.(?:png|jpg|jpeg|webp)/i);
  const imageKey = imageKeyMatch?.[1] ?? `${index}`;
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return {
    id: `${caseId}-${imageKey}-${safeName || index}`,
    qty: Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1,
    chance: Number.isFinite(chanceRaw) && chanceRaw > 0 ? chanceRaw : 0,
    rarity: rawRarity.toLowerCase(),
    rarityColor: typeof item.rarityColor === "string" ? item.rarityColor : null,
    name,
    imageUrl,
    tier,
    boxVariant,
    isChroma: Boolean(item.isChroma),
    isProgressive: Boolean(item.isProgressive),
    isSchematics: Boolean(item.isSchematics),
  };
}

async function fetchUnboxSample(caseId: string, language: LanguageType): Promise<ApiDrawItem[]> {
  const drawUrl = `${PUBG_ITEMS_BASE_URL}/api/unbox?caseId=${encodeURIComponent(caseId)}&locale=${language}`;
  const response = await fetch(drawUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": language === "ko" ? "ko-KR,ko;q=0.9,en;q=0.8" : "en-US,en;q=0.9,ko;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch unbox payload: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) return [];

  const items: ApiDrawItem[] = [];
  for (let i = 0; i < payload.length; i += 1) {
    const normalized = normalizeDrawItem(caseId, payload[i] as UnboxItemPayload, i);
    if (normalized) items.push(normalized);
  }
  return items;
}

async function buildDrawTable(caseId: string, language: LanguageType, requireLegendary: boolean): Promise<DrawTable> {
  const uniqueMap = new Map<string, ApiDrawItem>();
  const maxBatches = requireLegendary ? DRAW_SAMPLE_BATCHES_EXTENDED : DRAW_SAMPLE_BATCHES;

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const responses = await Promise.allSettled(
      Array.from({ length: DRAW_SAMPLE_BATCH_SIZE }, () => fetchUnboxSample(caseId, language))
    );

    for (const response of responses) {
      if (response.status !== "fulfilled") continue;
      for (const item of response.value) {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      }
    }

    const hasLegendaryCandidate = Array.from(uniqueMap.values()).some(
      (item) => item.tier === "legendary" || item.tier === "ultimate"
    );
    if (!requireLegendary || hasLegendaryCandidate) {
      if (uniqueMap.size >= 40 || batch >= DRAW_SAMPLE_BATCHES - 1) break;
    }
  }

  const items = Array.from(uniqueMap.values());
  if (!items.length) {
    throw new Error("No draw samples available");
  }

  const pools = createEmptyPools();
  for (const item of items) {
    pools[item.tier].push(item);
  }

  return {
    sourceUrl: `${PUBG_ITEMS_BASE_URL}/api/unbox?caseId=${caseId}&locale=${language}`,
    fetchedAt: new Date().toISOString(),
    pools,
    observedTierRates: sumTierRatesFromItems(items),
    hasLegendaryPool: pools.legendary.length > 0 || pools.ultimate.length > 0,
  };
}

async function getDrawTable(caseId: string, language: LanguageType, requireLegendary: boolean): Promise<DrawTable> {
  const key = `${language}:${caseId}`;
  const cached = drawTableCache[key];
  if (
    cached &&
    cached.expiresAt > Date.now() &&
    (!requireLegendary || cached.value.hasLegendaryPool)
  ) {
    return cached.value;
  }

  if (drawTablePending[key]) {
    const pendingValue = await drawTablePending[key];
    if (!requireLegendary || pendingValue.hasLegendaryPool) {
      return pendingValue;
    }
  }

  drawTablePending[key] = buildDrawTable(caseId, language, requireLegendary)
    .then((value) => {
      drawTableCache[key] = {
        expiresAt: Date.now() + DRAW_TABLE_CACHE_TTL_MS,
        value,
      };
      return value;
    })
    .finally(() => {
      delete drawTablePending[key];
    });

  return drawTablePending[key];
}

async function resolveLatestProbabilityUrl(language: LanguageType): Promise<string> {
  const newsUrl = `${PUBG_BASE_URL}${languagePrefix(language)}/news?category=store`;
  const newsHtml = await fetchText(newsUrl, language);
  const articleRegex = /href="(\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?news\/\d+)"/g;
  const articlePaths: string[] = [];
  let articleMatch = articleRegex.exec(newsHtml);

  while (articleMatch && articlePaths.length < 8) {
    const path = articleMatch[1];
    if (path && !articlePaths.includes(path)) {
      articlePaths.push(path);
    }
    articleMatch = articleRegex.exec(newsHtml);
  }

  const probabilityRegexPrimary = new RegExp(`https://pubg\\.com\\/${language}\\/game-info\\/probability\\/pc\\/\\d+`, "i");
  const probabilityRegexFallback = /https:\/\/pubg\.com\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?game-info\/probability\/pc\/\d+/i;

  for (const path of articlePaths) {
    try {
      const articleUrl = `${PUBG_BASE_URL}${path}`;
      const articleHtml = await fetchText(articleUrl, language);
      const found = articleHtml.match(probabilityRegexPrimary)?.[0] ?? articleHtml.match(probabilityRegexFallback)?.[0];
      if (found) return found;
    } catch (error) {
      console.error("Failed to inspect store article for probability link:", error);
    }
  }

  return DEFAULT_PROBABILITY_PAGE[language];
}

async function getLatestProbabilityUrl(language: LanguageType): Promise<string> {
  const cached = probabilityUrlCache[language];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (probabilityUrlPending[language]) {
    return probabilityUrlPending[language] as Promise<string>;
  }

  probabilityUrlPending[language] = resolveLatestProbabilityUrl(language)
    .then((value) => {
      probabilityUrlCache[language] = {
        expiresAt: Date.now() + PROBABILITY_URL_CACHE_TTL_MS,
        value,
      };
      return value;
    })
    .catch((error) => {
      console.error("Failed to resolve probability URL:", error);
      return DEFAULT_PROBABILITY_PAGE[language];
    })
    .finally(() => {
      delete probabilityUrlPending[language];
    });

  return probabilityUrlPending[language] as Promise<string>;
}

function parseContrabandSectionsFromHtml(rawHtml: string, language: LanguageType): ContrabandSection[] {
  const candidates = [rawHtml, decodeEscapedMarkup(rawHtml)];
  const phrase = language === "ko" ? "밀수품 상자" : "contraband crate";
  const sectionMap = new Map<string, ContrabandSection>();

  for (const html of candidates) {
    const sectionRegex = new RegExp(`<h2[^>]*>([^<]*${phrase}[^<]*)<\\/h2>([\\s\\S]*?)(?=<h2[^>]*>|$)`, language === "ko" ? "g" : "gi");
    let sectionMatch = sectionRegex.exec(html);

    while (sectionMatch) {
      const title = stripTags(sectionMatch[1] ?? "");
      const body = sectionMatch[2] ?? "";
      if (!title || !body) {
        sectionMatch = sectionRegex.exec(html);
        continue;
      }

      const rows: ContrabandSection["rows"] = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch = rowRegex.exec(body);

      while (rowMatch) {
        const cells = Array.from(rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi));
        if (cells.length >= 4) {
          const rarityText = stripTags(cells[1][1] ?? "");
          const chanceText = stripTags(cells[3][1] ?? "");
          const tier = toTierFromLabel(rarityText);
          const chance = Number.parseFloat(chanceText.replace(/[^0-9.]/g, ""));

          if (tier !== "unknown" && Number.isFinite(chance) && chance > 0) {
            rows.push({ tier, chance });
          }
        }
        rowMatch = rowRegex.exec(body);
      }

      if (rows.length > 0 && !sectionMap.has(title)) {
        sectionMap.set(title, {
          title,
          rows,
        });
      }

      sectionMatch = sectionRegex.exec(html);
    }
  }

  return Array.from(sectionMap.values());
}

function selectBestContrabandSection(sections: ContrabandSection[], crateName: string): ContrabandSection | null {
  if (!sections.length) return null;
  const target = normalizeName(crateName);
  const targetRaw = crateName.toLowerCase().split("-")[0]?.trim() ?? crateName.toLowerCase();
  const targetTokens = targetRaw.split(/\s+/).filter((token) => token.length >= 2);

  let best: ContrabandSection | null = sections[0];
  let bestScore = -1;

  for (const section of sections) {
    const normalized = normalizeName(section.title);
    let score = 0;

    if (normalized && target && (normalized.includes(target) || target.includes(normalized))) {
      score += 100;
    }

    for (const token of targetTokens) {
      if (section.title.toLowerCase().includes(token)) {
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = section;
    }
  }

  return best;
}

function buildOfficialRates(section: ContrabandSection): Partial<Record<TierKey, number>> {
  const rates: Partial<Record<TierKey, number>> = {};
  for (const row of section.rows) {
    rates[row.tier] = (rates[row.tier] ?? 0) + row.chance;
  }
  return normalizeRates(rates);
}

async function resolveOfficialTierRates(language: LanguageType, crate: ContrabandCrateMeta): Promise<OfficialRatesResult | null> {
  const cacheKey = `${language}:${crate.id}`;
  const cached = officialRatesCache[cacheKey];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (officialRatesPending[cacheKey]) {
    return officialRatesPending[cacheKey];
  }

  officialRatesPending[cacheKey] = (async () => {
    try {
      const probabilityUrl = await getLatestProbabilityUrl(language);
      const probabilityHtml = await fetchText(probabilityUrl, language);
      const sections = parseContrabandSectionsFromHtml(probabilityHtml, language);
      const selected = selectBestContrabandSection(sections, crate.name);
      if (!selected) return null;

      const result: OfficialRatesResult = {
        sourceUrl: probabilityUrl,
        matchedSection: selected.title,
        fetchedAt: new Date().toISOString(),
        tierRates: buildOfficialRates(selected),
      };

      officialRatesCache[cacheKey] = {
        expiresAt: Date.now() + OFFICIAL_RATES_CACHE_TTL_MS,
        value: result,
      };
      return result;
    } catch (error) {
      console.error("Failed to resolve official tier rates:", error);
      return null;
    }
  })().finally(() => {
    delete officialRatesPending[cacheKey];
  });

  return officialRatesPending[cacheKey];
}

function resolveTierRatesForDraw(
  pools: Record<TierKey, ApiDrawItem[]>,
  observedRates: Partial<Record<TierKey, number>>,
  officialRates: Partial<Record<TierKey, number>> | null
): ProbabilityInfo {
  const fallbackRates = normalizeRates(observedRates);

  if (officialRates) {
    const filteredOfficial: Partial<Record<TierKey, number>> = {};
    for (const [key, value] of Object.entries(officialRates)) {
      const tier = key as TierKey;
      if (!pools[tier].length) continue;
      if (!Number.isFinite(value as number) || (value as number) <= 0) continue;
      filteredOfficial[tier] = value;
    }

    const normalizedOfficial = normalizeRates(filteredOfficial);
    const officialTotal = Object.values(normalizedOfficial).reduce((acc, value) => acc + (value ?? 0), 0);
    if (officialTotal > 0) {
      return {
        mode: "official",
        sourceUrl: "",
        matchedSection: null,
        fetchedAt: new Date().toISOString(),
        tierRates: normalizedOfficial,
      };
    }
  }

  return {
    mode: "observed",
    sourceUrl: "",
    matchedSection: null,
    fetchedAt: new Date().toISOString(),
    tierRates: fallbackRates,
  };
}

function buildDrawResults(drawTable: DrawTable, probability: ProbabilityInfo): ApiDrawItem[] {
  const availableTierWeights = Object.entries(probability.tierRates)
    .map(([key, value]) => ({
      value: key as TierKey,
      weight: Number(value),
    }))
    .filter((entry) => entry.weight > 0 && drawTable.pools[entry.value].length > 0);

  if (!availableTierWeights.length) {
    const fallbackItems = Object.values(drawTable.pools).flat();
    return Array.from({ length: DRAW_COUNT }, (_, index) => fallbackItems[index % fallbackItems.length]);
  }

  const result: ApiDrawItem[] = [];
  for (let i = 0; i < DRAW_COUNT; i += 1) {
    const tier = pickWeighted(availableTierWeights);
    const pool = drawTable.pools[tier];
    const weightedPool = pool.map((item) => ({
      value: item,
      weight: item.chance > 0 ? item.chance : 1,
    }));
    result.push(pickWeighted(weightedPool));
  }

  return result;
}

function summarizeByTier(items: ApiDrawItem[]): Record<TierKey, number> {
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

  for (const item of items) {
    summary[item.tier] += 1;
  }

  return summary;
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const action = search.get("action") ?? "meta";
  const language = getLanguage(search.get("lang"));

  if (action !== "meta" && action !== "draw") {
    return NextResponse.json(
      {
        message: "Invalid action",
      },
      { status: 400 }
    );
  }

  try {
    if (action === "draw") {
      const crate = await getLatestContrabandMeta(language);
      const official = await resolveOfficialTierRates(language, crate);
      const drawTable = await getDrawTable(crate.id, language, true);

      const baseProbability = resolveTierRatesForDraw(drawTable.pools, drawTable.observedTierRates, official?.tierRates ?? null);
      const probability: ProbabilityInfo = {
        ...baseProbability,
        sourceUrl: official?.sourceUrl ?? drawTable.sourceUrl,
        matchedSection: official?.matchedSection ?? null,
        fetchedAt: official?.fetchedAt ?? drawTable.fetchedAt,
      };

      const items = buildDrawResults(drawTable, probability);
      const tierSummary = summarizeByTier(items);

      return NextResponse.json({
        fetchedAt: new Date().toISOString(),
        sourceUrl: drawTable.sourceUrl,
        crate,
        probability,
        items,
        tierSummary,
      });
    }

    const crate = await getLatestContrabandMeta(language);
    const official = await resolveOfficialTierRates(language, crate);

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      sourceUrl: official?.sourceUrl ?? `${PUBG_ITEMS_BASE_URL}${language === "ko" ? "/ko" : ""}/boxes/crate`,
      crate,
      probability: official
        ? {
            mode: "official",
            sourceUrl: official.sourceUrl,
            matchedSection: official.matchedSection,
            fetchedAt: official.fetchedAt,
            tierRates: official.tierRates,
          }
        : null,
      boxTierMap: {
        gold: ["ultimate", "legendary", "epic"],
        silver: ["elite", "rare"],
        black: ["special", "classic", "unknown"],
      },
    });
  } catch (error) {
    console.error("Gacha unbox API error:", error);
    return NextResponse.json(
      {
        message: "Failed to load contraband draw data.",
      },
      { status: 500 }
    );
  }
}
