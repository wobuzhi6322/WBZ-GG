import { getApiCache, setApiCache } from "@/lib/apiCache";

export type WeaponSkinLanguage = "ko" | "en";
export type PubgSkinCollectionType = "weapon" | "clothing" | "all";
export type PubgSkinItemKind = "weapon" | "clothing";

interface SkinCategoryConfig {
  type: PubgSkinItemKind;
  group: "weapons" | "clothing" | "appearance";
  slug: string;
  fallbackName: Record<WeaponSkinLanguage, string>;
}

export interface PubgWeaponSkinItem {
  id: string;
  kind: PubgSkinItemKind;
  skinName: string;
  weaponName: string;
  weaponKey: string;
  categorySlug: string;
  categoryName: string;
  imageUrl: string;
  detailUrl: string;
  rarityColor: string | null;
  slotName?: string;
  slotKey?: string;
}

export interface PubgWeaponSkinCategory {
  slug: string;
  name: string;
  totalSkins: number;
  weaponCount: number;
  kind: PubgSkinItemKind;
}

export interface PubgWeaponSkinsPayload {
  language: WeaponSkinLanguage;
  sourceLanguage: WeaponSkinLanguage;
  sourceUrl: string;
  fetchedAt: string;
  totalSkins: number;
  categories: PubgWeaponSkinCategory[];
  items: PubgWeaponSkinItem[];
  collectionType: PubgSkinCollectionType;
}

interface ParsedCategoryResult {
  slug: string;
  name: string;
  kind: PubgSkinItemKind;
  items: PubgWeaponSkinItem[];
}

const BASE_URL = "https://pubgitems.info";
const CACHE_TTL_SECONDS = 60 * 30;

const WEAPON_CATEGORY_CONFIGS: SkinCategoryConfig[] = [
  { type: "weapon", group: "weapons", slug: "ar", fallbackName: { ko: "돌격소총", en: "Assault Rifles" } },
  { type: "weapon", group: "weapons", slug: "dmr", fallbackName: { ko: "지정사수소총", en: "DMRs" } },
  { type: "weapon", group: "weapons", slug: "sr", fallbackName: { ko: "저격소총", en: "Sniper Rifles" } },
  { type: "weapon", group: "weapons", slug: "smg", fallbackName: { ko: "기관단총", en: "SMGs" } },
  { type: "weapon", group: "weapons", slug: "lmg", fallbackName: { ko: "경기관총", en: "LMGs" } },
  { type: "weapon", group: "weapons", slug: "shotgun", fallbackName: { ko: "산탄총", en: "Shotguns" } },
  { type: "weapon", group: "weapons", slug: "handgun", fallbackName: { ko: "권총", en: "Handguns" } },
  { type: "weapon", group: "weapons", slug: "melee", fallbackName: { ko: "근접", en: "Melee" } },
  { type: "weapon", group: "weapons", slug: "charm", fallbackName: { ko: "무기 참", en: "Weapon Charms" } },
  { type: "weapon", group: "weapons", slug: "misc", fallbackName: { ko: "기타", en: "Misc" } },
];

const CLOTHING_CATEGORY_CONFIGS: SkinCategoryConfig[] = [
  { type: "clothing", group: "clothing", slug: "torso", fallbackName: { ko: "상의", en: "Tops" } },
  { type: "clothing", group: "clothing", slug: "legs", fallbackName: { ko: "하의", en: "Bottoms" } },
  { type: "clothing", group: "clothing", slug: "feet", fallbackName: { ko: "신발", en: "Shoes" } },
  { type: "clothing", group: "clothing", slug: "hands", fallbackName: { ko: "장갑", en: "Gloves" } },
  { type: "clothing", group: "clothing", slug: "outer", fallbackName: { ko: "겉옷", en: "Outerwear" } },
  { type: "clothing", group: "clothing", slug: "head", fallbackName: { ko: "머리", en: "Headwear" } },
  { type: "clothing", group: "clothing", slug: "mask", fallbackName: { ko: "마스크", en: "Masks" } },
  { type: "clothing", group: "clothing", slug: "eyes", fallbackName: { ko: "안경", en: "Eyewear" } },
  { type: "clothing", group: "appearance", slug: "hair", fallbackName: { ko: "헤어스타일", en: "Hair" } },
  { type: "clothing", group: "appearance", slug: "face", fallbackName: { ko: "얼굴", en: "Face" } },
  { type: "clothing", group: "appearance", slug: "makeup", fallbackName: { ko: "메이크업", en: "Makeup" } },
  { type: "clothing", group: "appearance", slug: "emotes", fallbackName: { ko: "이모트", en: "Emotes" } },
  { type: "clothing", group: "appearance", slug: "contender", fallbackName: { ko: "컨텐더", en: "Contender" } },
];

const SECTION_REGEX =
  /<h2 class="text-2xl p-4 mt-2" id="([^"]+)">([^<]+)<\/h2>\s*<div class="grid grid-cols-\[repeat\(auto-fit,_minmax\(12rem,_1fr\)\)\] gap-2">([\s\S]*?)(?=<\/div>\s*<h2 class="text-2xl p-4 mt-2" id="|<\/div><\/main>|<\/div><script type="module")/g;
const NAME_REGEX = /<span class="leading-tight truncate line-clamp-2(?: mt-0\.5)?">([^<]+)<\/span>/;
const IMAGE_REGEX = /<img src="([^"]+)"/;
const RARITY_COLOR_REGEX = /style="[^"]*(?:background:|--rc:)(#[0-9a-fA-F]{3,8})/;
const CATEGORY_TITLE_REGEX = /<h1 class="text-3xl">([^<]+)<\/h1>/;

const pending = new Map<string, Promise<PubgWeaponSkinsPayload>>();

function getPreferredLanguages(language: WeaponSkinLanguage): WeaponSkinLanguage[] {
  return language === "ko" ? ["ko", "en"] : ["en", "ko"];
}

function getLanguagePrefix(language: WeaponSkinLanguage): string {
  return language === "ko" ? "/ko" : "";
}

function getConfigs(collectionType: PubgSkinCollectionType): SkinCategoryConfig[] {
  if (collectionType === "weapon") return WEAPON_CATEGORY_CONFIGS;
  if (collectionType === "clothing") return CLOTHING_CATEGORY_CONFIGS;
  return [...WEAPON_CATEGORY_CONFIGS, ...CLOTHING_CATEGORY_CONFIGS];
}

function getCategoryUrl(language: WeaponSkinLanguage, config: SkinCategoryConfig): string {
  return `${BASE_URL}${getLanguagePrefix(language)}/${config.group}/${config.slug}`;
}

function getSourceUrl(language: WeaponSkinLanguage, collectionType: PubgSkinCollectionType): string {
  const prefix = `${BASE_URL}${getLanguagePrefix(language)}`;
  if (collectionType === "weapon") return `${prefix}/weapons`;
  if (collectionType === "clothing") return `${prefix}/clothing`;
  return prefix;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function deriveNameFromId(id: string): string {
  const dashIndex = id.indexOf("-");
  const rawName = dashIndex >= 0 ? id.slice(dashIndex + 1) : id;
  return rawName.replace(/-/g, " ").trim();
}

function parseCategoryName(html: string, fallbackName: string): string {
  const matched = html.match(CATEGORY_TITLE_REGEX)?.[1];
  return normalizeText(decodeHtmlEntities(matched ?? fallbackName)) || fallbackName;
}

function parseWeaponCards(
  cardsHtml: string,
  config: SkinCategoryConfig,
  categoryName: string,
  weaponKey: string,
  weaponName: string
): PubgWeaponSkinItem[] {
  const items: PubgWeaponSkinItem[] = [];
  const cardRegex = new RegExp(
    `<a href="(\\/(?:[a-z]{2}(?:-[A-Z]{2})?\\/)?${config.group}\\/${config.slug}\\/[^\"]+)" class="bg-neutral-700[^\"]*">([\\s\\S]*?)<\\/a>`,
    "g"
  );

  let match = cardRegex.exec(cardsHtml);
  while (match) {
    const href = normalizeText(match[1]);
    const bodyHtml = match[2] ?? "";
    const id = href.split("/").pop() ?? `${config.slug}-${weaponKey}-${items.length + 1}`;
    const name = normalizeText(decodeHtmlEntities(bodyHtml.match(NAME_REGEX)?.[1] ?? deriveNameFromId(id)));
    const imageUrl = normalizeText(bodyHtml.match(IMAGE_REGEX)?.[1]);
    const rarityColor = bodyHtml.match(RARITY_COLOR_REGEX)?.[1] ?? null;

    if (name && imageUrl) {
      items.push({
        id,
        kind: "weapon",
        skinName: name,
        weaponName,
        weaponKey,
        categorySlug: config.slug,
        categoryName,
        imageUrl,
        detailUrl: new URL(href, BASE_URL).toString(),
        rarityColor,
        slotName: weaponName,
        slotKey: weaponKey,
      });
    }

    match = cardRegex.exec(cardsHtml);
  }

  return items;
}

function parseWeaponCategoryPage(html: string, config: SkinCategoryConfig, sourceLanguage: WeaponSkinLanguage): ParsedCategoryResult {
  const categoryName = parseCategoryName(html, config.fallbackName[sourceLanguage]);
  const items: PubgWeaponSkinItem[] = [];
  const sectionRegex = new RegExp(SECTION_REGEX.source, "g");

  let section = sectionRegex.exec(html);
  while (section) {
    const weaponKey = normalizeText(section[1]);
    const weaponName = normalizeText(decodeHtmlEntities(section[2] ?? ""));
    const cardsHtml = section[3] ?? "";
    if (weaponKey && weaponName && cardsHtml) {
      items.push(...parseWeaponCards(cardsHtml, config, categoryName, weaponKey, weaponName));
    }
    section = sectionRegex.exec(html);
  }

  return {
    slug: config.slug,
    name: categoryName,
    kind: "weapon",
    items,
  };
}

function parseClothingCategoryPage(html: string, config: SkinCategoryConfig, sourceLanguage: WeaponSkinLanguage): ParsedCategoryResult {
  const categoryName = parseCategoryName(html, config.fallbackName[sourceLanguage]);
  const items: PubgWeaponSkinItem[] = [];
  const cardRegex = new RegExp(
    `<a href="(\\/(?:[a-z]{2}(?:-[A-Z]{2})?\\/)?${config.group}\\/${config.slug}\\/[^\"]+)" class="bg-neutral-700[^\"]*">([\\s\\S]*?)<\\/a>`,
    "g"
  );

  let match = cardRegex.exec(html);
  while (match) {
    const href = normalizeText(match[1]);
    const bodyHtml = match[2] ?? "";
    const id = href.split("/").pop() ?? `${config.slug}-${items.length + 1}`;
    const name = normalizeText(decodeHtmlEntities(bodyHtml.match(NAME_REGEX)?.[1] ?? deriveNameFromId(id)));
    const imageUrl = normalizeText(bodyHtml.match(IMAGE_REGEX)?.[1]);
    const rarityColor = bodyHtml.match(RARITY_COLOR_REGEX)?.[1] ?? null;

    if (name && imageUrl) {
      items.push({
        id,
        kind: "clothing",
        skinName: name,
        weaponName: categoryName,
        weaponKey: config.slug,
        categorySlug: config.slug,
        categoryName,
        imageUrl,
        detailUrl: new URL(href, BASE_URL).toString(),
        rarityColor,
        slotName: categoryName,
        slotKey: config.slug,
      });
    }

    match = cardRegex.exec(html);
  }

  return {
    slug: config.slug,
    name: categoryName,
    kind: "clothing",
    items,
  };
}

async function fetchCategory(config: SkinCategoryConfig, sourceLanguage: WeaponSkinLanguage): Promise<ParsedCategoryResult | null> {
  try {
    const response = await fetch(getCategoryUrl(sourceLanguage, config), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": sourceLanguage === "ko" ? "ko-KR,ko;q=0.9,en;q=0.8" : "en-US,en;q=0.9,ko;q=0.8",
      },
      next: { revalidate: CACHE_TTL_SECONDS },
    });

    if (!response.ok) return null;

    const html = await response.text();
    return config.type === "weapon"
      ? parseWeaponCategoryPage(html, config, sourceLanguage)
      : parseClothingCategoryPage(html, config, sourceLanguage);
  } catch (error) {
    console.error(`Failed to fetch PUBG Items category (${config.group}/${config.slug}):`, error);
    return null;
  }
}

function dedupeItems(items: PubgWeaponSkinItem[]): PubgWeaponSkinItem[] {
  const seen = new Set<string>();
  const deduped: PubgWeaponSkinItem[] = [];

  for (const item of items) {
    if (seen.has(item.detailUrl)) continue;
    seen.add(item.detailUrl);
    deduped.push(item);
  }

  return deduped;
}

async function buildPayload(
  requestedLanguage: WeaponSkinLanguage,
  sourceLanguage: WeaponSkinLanguage,
  collectionType: PubgSkinCollectionType
): Promise<PubgWeaponSkinsPayload | null> {
  const configs = getConfigs(collectionType);
  const parsed = await Promise.all(configs.map((config) => fetchCategory(config, sourceLanguage)));
  const validCategories = parsed.filter((entry): entry is ParsedCategoryResult => entry !== null);
  if (!validCategories.length) return null;

  const items = dedupeItems(validCategories.flatMap((category) => category.items));
  if (!items.length) return null;

  const categories: PubgWeaponSkinCategory[] = validCategories
    .map((category) => {
      const categoryItems = items.filter((item) => item.categorySlug === category.slug);
      const uniqueGroups = new Set(categoryItems.map((item) => item.kind === "weapon" ? item.weaponKey : item.slotKey ?? item.weaponKey));
      return {
        slug: category.slug,
        name: category.name,
        totalSkins: categoryItems.length,
        weaponCount: uniqueGroups.size,
        kind: category.kind,
      };
    })
    .filter((category) => category.totalSkins > 0)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "weapon" ? -1 : 1;
      return b.totalSkins - a.totalSkins;
    });

  return {
    language: requestedLanguage,
    sourceLanguage,
    sourceUrl: getSourceUrl(sourceLanguage, collectionType),
    fetchedAt: new Date().toISOString(),
    totalSkins: items.length,
    categories,
    items,
    collectionType,
  };
}

async function fetchWithFallback(
  language: WeaponSkinLanguage,
  collectionType: PubgSkinCollectionType
): Promise<PubgWeaponSkinsPayload> {
  for (const sourceLanguage of getPreferredLanguages(language)) {
    const payload = await buildPayload(language, sourceLanguage, collectionType);
    if (payload && payload.totalSkins > 0) return payload;
  }

  return {
    language,
    sourceLanguage: getPreferredLanguages(language)[0],
    sourceUrl: getSourceUrl(getPreferredLanguages(language)[0], collectionType),
    fetchedAt: new Date().toISOString(),
    totalSkins: 0,
    categories: [],
    items: [],
    collectionType,
  };
}

export async function getPubgWeaponSkins(
  language: WeaponSkinLanguage = "ko",
  collectionType: PubgSkinCollectionType = "weapon"
): Promise<PubgWeaponSkinsPayload> {
  const cacheKey = `pubgitems:skins:${language}:${collectionType}:v2`;
  const cached = await getApiCache<PubgWeaponSkinsPayload>(cacheKey);
  if (cached) return cached;

  if (pending.has(cacheKey)) {
    return pending.get(cacheKey) as Promise<PubgWeaponSkinsPayload>;
  }

  const request = fetchWithFallback(language, collectionType)
    .then(async (payload) => {
      await setApiCache(cacheKey, payload, CACHE_TTL_SECONDS, ["pubgitems", "skins", collectionType]);
      return payload;
    })
    .finally(() => {
      pending.delete(cacheKey);
    });

  pending.set(cacheKey, request);
  return request;
}
