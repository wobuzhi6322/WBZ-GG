export type WeaponSkinLanguage = "ko" | "en";

interface WeaponCategoryConfig {
  slug: string;
  fallbackName: Record<WeaponSkinLanguage, string>;
}

export interface PubgWeaponSkinItem {
  id: string;
  skinName: string;
  weaponName: string;
  weaponKey: string;
  categorySlug: string;
  categoryName: string;
  imageUrl: string;
  detailUrl: string;
  rarityColor: string | null;
}

export interface PubgWeaponSkinCategory {
  slug: string;
  name: string;
  totalSkins: number;
  weaponCount: number;
}

export interface PubgWeaponSkinsPayload {
  language: WeaponSkinLanguage;
  sourceLanguage: WeaponSkinLanguage;
  sourceUrl: string;
  fetchedAt: string;
  totalSkins: number;
  categories: PubgWeaponSkinCategory[];
  items: PubgWeaponSkinItem[];
}

interface ParsedCategoryResult {
  slug: string;
  name: string;
  items: PubgWeaponSkinItem[];
}

const BASE_URL = "https://pubgitems.info";
const CACHE_TTL_MS = 1000 * 60 * 10;

const CATEGORY_CONFIGS: WeaponCategoryConfig[] = [
  { slug: "ar", fallbackName: { ko: "돌격소총", en: "Assault Rifles" } },
  { slug: "dmr", fallbackName: { ko: "지정사수소총", en: "DMRs" } },
  { slug: "sr", fallbackName: { ko: "저격소총", en: "Sniper Rifles" } },
  { slug: "smg", fallbackName: { ko: "기관단총", en: "SMGs" } },
  { slug: "lmg", fallbackName: { ko: "경기관총", en: "LMGs" } },
  { slug: "shotgun", fallbackName: { ko: "산탄총", en: "Shotguns" } },
  { slug: "handgun", fallbackName: { ko: "권총", en: "Handguns" } },
  { slug: "melee", fallbackName: { ko: "근접", en: "Melee" } },
  { slug: "misc", fallbackName: { ko: "기타", en: "Misc" } },
];

const cache: Partial<Record<WeaponSkinLanguage, { expiresAt: number; payload: PubgWeaponSkinsPayload }>> = {};
const pending: Partial<Record<WeaponSkinLanguage, Promise<PubgWeaponSkinsPayload>>> = {};

const SECTION_REGEX =
  /<h2 class="text-2xl p-4 mt-2" id="([^"]+)">([^<]+)<\/h2>\s*<div class="grid grid-cols-\[repeat\(auto-fit,_minmax\(12rem,_1fr\)\)\] gap-2">([\s\S]*?)(?=<\/div>\s*<h2 class="text-2xl p-4 mt-2" id="|<\/div><\/main>|<\/div><script type="module")/g;
const CARD_REGEX =
  /<a href="(\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?weapons\/[a-z-]+\/[^"]+)" class="bg-neutral-700 text-neutral-50 rounded-2xl flex flex-col hover group [^"]*">([\s\S]*?)<\/a>/g;
const NAME_REGEX = /<span class="leading-tight truncate line-clamp-2(?: mt-0\.5)?">([^<]+)<\/span>/;
const IMAGE_REGEX = /<img src="([^"]+)"/;
const RARITY_COLOR_REGEX = /style="background:(#[0-9a-fA-F]{3,8})/;
const CATEGORY_TITLE_REGEX = /<h1 class="text-3xl">([^<]+)<\/h1>/;

function getPreferredLanguages(language: WeaponSkinLanguage): WeaponSkinLanguage[] {
  return language === "ko" ? ["ko", "en"] : ["en", "ko"];
}

function getLanguagePrefix(language: WeaponSkinLanguage): string {
  return language === "ko" ? "/ko" : "";
}

function getCategoryUrl(language: WeaponSkinLanguage, slug: string): string {
  return `${BASE_URL}${getLanguagePrefix(language)}/weapons/${slug}`;
}

function getSourceUrl(language: WeaponSkinLanguage): string {
  return `${BASE_URL}${getLanguagePrefix(language)}/weapons`;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function deriveSkinNameFromId(id: string): string {
  const dashIndex = id.indexOf("-");
  const rawName = dashIndex >= 0 ? id.slice(dashIndex + 1) : id;
  return rawName.replace(/-/g, " ").trim();
}

function parseCategoryName(html: string, fallbackName: string): string {
  const matched = html.match(CATEGORY_TITLE_REGEX)?.[1];
  return normalizeText(decodeHtmlEntities(matched ?? fallbackName)) || fallbackName;
}

function parseCards(
  cardsHtml: string,
  categorySlug: string,
  categoryName: string,
  weaponKey: string,
  weaponName: string
): PubgWeaponSkinItem[] {
  const skins: PubgWeaponSkinItem[] = [];
  const cardRegex = new RegExp(CARD_REGEX.source, "g");
  let match = cardRegex.exec(cardsHtml);

  while (match) {
    const href = normalizeText(match[1]);
    if (href.includes(`/weapons/${categorySlug}/`)) {
      const bodyHtml = match[2] ?? "";
      const id = href.split("/").pop() ?? `${categorySlug}-${weaponKey}-${skins.length + 1}`;
      const nameMatched = bodyHtml.match(NAME_REGEX)?.[1];
      const imageMatched = bodyHtml.match(IMAGE_REGEX)?.[1];
      const rarityColorMatched = bodyHtml.match(RARITY_COLOR_REGEX)?.[1] ?? null;

      const skinName = normalizeText(decodeHtmlEntities(nameMatched ?? deriveSkinNameFromId(id)));
      const imageUrl = normalizeText(imageMatched);
      const detailUrl = new URL(href, BASE_URL).toString();

      if (skinName && imageUrl) {
        skins.push({
          id,
          skinName,
          weaponName,
          weaponKey,
          categorySlug,
          categoryName,
          imageUrl,
          detailUrl,
          rarityColor: rarityColorMatched,
        });
      }
    }

    match = cardRegex.exec(cardsHtml);
  }

  return skins;
}

function parseCategoryPage(
  html: string,
  categoryConfig: WeaponCategoryConfig,
  sourceLanguage: WeaponSkinLanguage
): ParsedCategoryResult {
  const categoryName = parseCategoryName(html, categoryConfig.fallbackName[sourceLanguage]);
  const items: PubgWeaponSkinItem[] = [];
  const sectionRegex = new RegExp(SECTION_REGEX.source, "g");
  let section = sectionRegex.exec(html);

  while (section) {
    const weaponKey = normalizeText(section[1]);
    const weaponName = normalizeText(decodeHtmlEntities(section[2] ?? ""));
    const cardsHtml = section[3] ?? "";
    if (weaponKey && weaponName && cardsHtml) {
      items.push(...parseCards(cardsHtml, categoryConfig.slug, categoryName, weaponKey, weaponName));
    }
    section = sectionRegex.exec(html);
  }

  return {
    slug: categoryConfig.slug,
    name: categoryName,
    items,
  };
}

async function fetchCategory(
  categoryConfig: WeaponCategoryConfig,
  sourceLanguage: WeaponSkinLanguage
): Promise<ParsedCategoryResult | null> {
  try {
    const url = getCategoryUrl(sourceLanguage, categoryConfig.slug);
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": sourceLanguage === "ko" ? "ko-KR,ko;q=0.9,en;q=0.8" : "en-US,en;q=0.9,ko;q=0.8",
      },
      next: { revalidate: 600 },
    });

    if (!response.ok) return null;
    const html = await response.text();
    return parseCategoryPage(html, categoryConfig, sourceLanguage);
  } catch (error) {
    console.error(`Failed to fetch PUBG skins category (${categoryConfig.slug}):`, error);
    return null;
  }
}

function dedupeSkinItems(items: PubgWeaponSkinItem[]): PubgWeaponSkinItem[] {
  const seen = new Set<string>();
  const deduped: PubgWeaponSkinItem[] = [];

  for (const item of items) {
    const key = item.detailUrl;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

async function buildPayload(
  requestedLanguage: WeaponSkinLanguage,
  sourceLanguage: WeaponSkinLanguage
): Promise<PubgWeaponSkinsPayload | null> {
  const categoriesData = await Promise.all(
    CATEGORY_CONFIGS.map((categoryConfig) => fetchCategory(categoryConfig, sourceLanguage))
  );

  const validCategories = categoriesData.filter((entry): entry is ParsedCategoryResult => entry !== null);
  if (!validCategories.length) return null;

  const allItems = dedupeSkinItems(validCategories.flatMap((category) => category.items));
  if (!allItems.length) return null;

  const categories: PubgWeaponSkinCategory[] = validCategories
    .map((category) => {
      const categoryItems = allItems.filter((item) => item.categorySlug === category.slug);
      const weaponCount = new Set(categoryItems.map((item) => item.weaponKey)).size;
      return {
        slug: category.slug,
        name: category.name,
        totalSkins: categoryItems.length,
        weaponCount,
      };
    })
    .filter((category) => category.totalSkins > 0)
    .sort((a, b) => b.totalSkins - a.totalSkins);

  return {
    language: requestedLanguage,
    sourceLanguage,
    sourceUrl: getSourceUrl(sourceLanguage),
    fetchedAt: new Date().toISOString(),
    totalSkins: allItems.length,
    categories,
    items: allItems,
  };
}

async function fetchWithFallback(language: WeaponSkinLanguage): Promise<PubgWeaponSkinsPayload> {
  const preferredLanguages = getPreferredLanguages(language);

  for (const sourceLanguage of preferredLanguages) {
    const payload = await buildPayload(language, sourceLanguage);
    if (payload && payload.totalSkins > 0) return payload;
  }

  return {
    language,
    sourceLanguage: preferredLanguages[0],
    sourceUrl: getSourceUrl(preferredLanguages[0]),
    fetchedAt: new Date().toISOString(),
    totalSkins: 0,
    categories: [],
    items: [],
  };
}

export async function getPubgWeaponSkins(language: WeaponSkinLanguage = "ko"): Promise<PubgWeaponSkinsPayload> {
  const cached = cache[language];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  if (pending[language]) {
    return pending[language] as Promise<PubgWeaponSkinsPayload>;
  }

  pending[language] = fetchWithFallback(language)
    .then((payload) => {
      cache[language] = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        payload,
      };
      return payload;
    })
    .finally(() => {
      delete pending[language];
    });

  return pending[language] as Promise<PubgWeaponSkinsPayload>;
}
