import vm from "node:vm";

export type WeaponLanguage = "ko" | "en";

export interface WeaponStat {
  title: string;
  value: string;
  numericValue: number | null;
}

export interface WeaponBodyDamage {
  head: number;
  body: number;
  leg: number;
  weaponClass: string;
}

export interface PubgWeapon {
  key: string;
  name: string;
  categoryKey: string;
  categoryName: string;
  imageUrl: string;
  description: string;
  updateDate: string;
  ammunition: string;
  ammunitionImageUrl: string;
  baseDamage: number | null;
  bodyDamage: WeaponBodyDamage | null;
  stats: WeaponStat[];
}

export interface PubgWeaponCategory {
  key: string;
  name: string;
  description: string;
  weapons: PubgWeapon[];
}

export interface PubgWeaponsPayload {
  language: WeaponLanguage;
  sourceLanguage: WeaponLanguage;
  sourceUrl: string;
  fetchedAt: string;
  categories: PubgWeaponCategory[];
}

interface RawWeaponSpec {
  title?: string;
  data?: string | number | null;
}

interface RawWeaponFeature {
  title?: string;
  specs?: RawWeaponSpec[];
}

interface RawWeapon {
  key?: string;
  name?: string;
  imageUrl?: string;
  description?: string;
  updateDate?: string | null;
  ammunition?: string;
  ammunitionImageUrl?: string;
  feature?: RawWeaponFeature;
}

interface RawWeaponCategory {
  key?: string;
  name?: string;
  description?: string;
  weapons?: RawWeapon[];
}

interface DamageZoneConfig {
  GlobalMultiplier?: number;
  WeaponClassMultipliers?: Record<string, number>;
}

interface DamageConfigResponse {
  DefaultDamageConfig?: {
    DamageZones?: Record<string, DamageZoneConfig>;
  };
}

const OFFICIAL_WEAPON_URLS: Record<WeaponLanguage, string> = {
  ko: "https://pubg.com/ko/game-info/weapons",
  en: "https://pubg.com/en/game-info/weapons",
};

const DAMAGE_CONFIG_URL = "https://battlegrounds.party/weapons/raw/DefaultDamageConfig.json";

const BASE_DAMAGE_PATTERNS = [/damage per bullet/i, /발 당 데미지/i, /발당 데미지/i];

const FALLBACK_CLASS_MULTIPLIERS: Record<string, { head: number; body: number; leg: number }> = {
  "EWeaponClass::Class_Rifle": { head: 2.35, body: 1, leg: 0.9 },
  "EWeaponClass::Class_DMR": { head: 2.35, body: 1.05, leg: 0.95 },
  "EWeaponClass::Class_SMG": { head: 2.1, body: 1.05, leg: 1.3 },
  "EWeaponClass::Class_Sniper": { head: 2.5, body: 1.3, leg: 0.95 },
  "EWeaponClass::Class_Shotgun": { head: 1.5, body: 0.9, leg: 1.05 },
  "EWeaponClass::Class_Pistol": { head: 2.1, body: 1, leg: 1.05 },
  "EWeaponClass::Class_LMG": { head: 2.3, body: 1.05, leg: 0.9 },
  "EWeaponClass::Class_Crossbow": { head: 2.3, body: 1.4, leg: 1.2 },
  "EWeaponClass::Class_Carbine": { head: 2.3, body: 1, leg: 1 },
  "EWeaponClass::Class_Melee": { head: 1.5, body: 1, leg: 1.2 },
};

const WEAPON_CLASS_BY_CATEGORY: Record<string, string | null> = {
  ar: "EWeaponClass::Class_Rifle",
  dmr: "EWeaponClass::Class_DMR",
  smg: "EWeaponClass::Class_SMG",
  sr: "EWeaponClass::Class_Sniper",
  sg: "EWeaponClass::Class_Shotgun",
  pistol: "EWeaponClass::Class_Pistol",
  melee: "EWeaponClass::Class_Melee",
  throwable: null,
  etc: null,
};

const WEAPON_CLASS_OVERRIDES: Record<string, string | null> = {
  m249: "EWeaponClass::Class_LMG",
  dp28: "EWeaponClass::Class_LMG",
  mg3: "EWeaponClass::Class_LMG",
  crossbow: "EWeaponClass::Class_Crossbow",
  m79: null,
  mortar: null,
  panzerfaust: null,
  stun_gun: null,
};

function getPreferredLanguages(language: WeaponLanguage): WeaponLanguage[] {
  return language === "ko" ? ["ko", "en"] : ["en", "ko"];
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }

  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function extractNuxtScript(html: string): string | null {
  const marker = "<script>window.__NUXT__=";
  const start = html.indexOf(marker);
  if (start < 0) return null;

  const end = html.indexOf("</script>", start);
  if (end < 0) return null;

  return html.slice(start + "<script>".length, end);
}

function parseWeaponCategories(scriptBody: string): RawWeaponCategory[] {
  const sandbox: { window: { __NUXT__?: unknown } } = { window: {} };
  vm.createContext(sandbox);

  const script = new vm.Script(scriptBody);
  script.runInContext(sandbox, { timeout: 15000 });

  const nuxtPayload = sandbox.window.__NUXT__;
  if (!nuxtPayload || typeof nuxtPayload !== "object") {
    return [];
  }

  const fetchState = (nuxtPayload as { fetch?: Record<string, unknown> }).fetch;
  if (!fetchState || typeof fetchState !== "object") {
    return [];
  }

  for (const state of Object.values(fetchState)) {
    if (!state || typeof state !== "object") continue;
    const categories = (state as { weaponCategories?: unknown }).weaponCategories;
    if (Array.isArray(categories)) {
      return categories as RawWeaponCategory[];
    }
  }

  return [];
}

function normalizeStats(rawSpecs: RawWeaponSpec[] | undefined): WeaponStat[] {
  if (!Array.isArray(rawSpecs)) return [];

  return rawSpecs.map((spec) => {
    const title = normalizeText(spec.title);
    const valueText = typeof spec.data === "string" ? spec.data : String(spec.data ?? "");
    return {
      title,
      value: valueText,
      numericValue: parseNumber(spec.data),
    };
  });
}

function extractBaseDamage(stats: WeaponStat[]): number | null {
  const matched = stats.find((stat) => BASE_DAMAGE_PATTERNS.some((pattern) => pattern.test(stat.title)));
  if (matched?.numericValue !== null && matched?.numericValue !== undefined) {
    return matched.numericValue;
  }

  const firstNumeric = stats.find((stat) => stat.numericValue !== null);
  return firstNumeric?.numericValue ?? null;
}

function resolveWeaponClass(categoryKey: string, weaponKey: string): string | null {
  if (Object.prototype.hasOwnProperty.call(WEAPON_CLASS_OVERRIDES, weaponKey)) {
    return WEAPON_CLASS_OVERRIDES[weaponKey];
  }
  return WEAPON_CLASS_BY_CATEGORY[categoryKey] ?? null;
}

function getZoneMultiplier(
  zones: Record<string, DamageZoneConfig> | undefined,
  zoneKey: string,
  classKey: string,
  fallbackValue: number
): number {
  const zone = zones?.[zoneKey];
  const classMultiplier = parseNumber(zone?.WeaponClassMultipliers?.[classKey]);
  if (classMultiplier === null) return fallbackValue;

  const globalMultiplier = parseNumber(zone?.GlobalMultiplier) ?? 1;
  return classMultiplier * globalMultiplier;
}

async function getClassMultipliers(): Promise<Record<string, { head: number; body: number; leg: number }>> {
  try {
    const response = await fetch(DAMAGE_CONFIG_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return FALLBACK_CLASS_MULTIPLIERS;
    }

    const json = (await response.json()) as DamageConfigResponse;
    const zones = json.DefaultDamageConfig?.DamageZones;
    if (!zones) {
      return FALLBACK_CLASS_MULTIPLIERS;
    }

    const classKeys = new Set<string>(Object.keys(FALLBACK_CLASS_MULTIPLIERS));
    const headClassKeys = Object.keys(zones["EDamageZoneType::Head"]?.WeaponClassMultipliers ?? {});
    const torsoClassKeys = Object.keys(zones["EDamageZoneType::Torso"]?.WeaponClassMultipliers ?? {});
    const legClassKeys = Object.keys(zones["EDamageZoneType::Leg"]?.WeaponClassMultipliers ?? {});

    for (const classKey of [...headClassKeys, ...torsoClassKeys, ...legClassKeys]) {
      classKeys.add(classKey);
    }

    const result: Record<string, { head: number; body: number; leg: number }> = {
      ...FALLBACK_CLASS_MULTIPLIERS,
    };

    for (const classKey of Array.from(classKeys)) {
      const fallback = FALLBACK_CLASS_MULTIPLIERS[classKey] ?? { head: 1, body: 1, leg: 1 };
      result[classKey] = {
        head: getZoneMultiplier(zones, "EDamageZoneType::Head", classKey, fallback.head),
        body: getZoneMultiplier(zones, "EDamageZoneType::Torso", classKey, fallback.body),
        leg: getZoneMultiplier(zones, "EDamageZoneType::Leg", classKey, fallback.leg),
      };
    }

    return result;
  } catch (error) {
    console.error("Failed to load damage multipliers:", error);
    return FALLBACK_CLASS_MULTIPLIERS;
  }
}

function buildBodyDamage(
  baseDamage: number | null,
  weaponClass: string | null,
  multipliers: Record<string, { head: number; body: number; leg: number }>
): WeaponBodyDamage | null {
  if (baseDamage === null || weaponClass === null) return null;

  const selectedMultiplier = multipliers[weaponClass] ?? FALLBACK_CLASS_MULTIPLIERS[weaponClass];
  if (!selectedMultiplier) return null;

  return {
    head: roundOne(baseDamage * selectedMultiplier.head),
    body: roundOne(baseDamage * selectedMultiplier.body),
    leg: roundOne(baseDamage * selectedMultiplier.leg),
    weaponClass,
  };
}

function normalizeCategory(
  category: RawWeaponCategory,
  multipliers: Record<string, { head: number; body: number; leg: number }>
): PubgWeaponCategory | null {
  const categoryKey = normalizeText(category.key);
  if (!categoryKey) return null;

  const categoryName = normalizeText(category.name) || categoryKey.toUpperCase();
  const categoryDescription = normalizeText(category.description);

  const normalizedWeapons: PubgWeapon[] = [];
  const rawWeapons = Array.isArray(category.weapons) ? category.weapons : [];

  for (const rawWeapon of rawWeapons) {
    const key = normalizeText(rawWeapon.key);
    const name = normalizeText(rawWeapon.name);
    if (!key || !name) continue;

    const stats = normalizeStats(rawWeapon.feature?.specs);
    const baseDamage = extractBaseDamage(stats);
    const weaponClass = resolveWeaponClass(categoryKey, key);
    const bodyDamage = buildBodyDamage(baseDamage, weaponClass, multipliers);

    normalizedWeapons.push({
      key,
      name,
      categoryKey,
      categoryName,
      imageUrl: normalizeText(rawWeapon.imageUrl),
      description: normalizeText(rawWeapon.description),
      updateDate: normalizeText(rawWeapon.updateDate),
      ammunition: normalizeText(rawWeapon.ammunition),
      ammunitionImageUrl: normalizeText(rawWeapon.ammunitionImageUrl),
      baseDamage,
      bodyDamage,
      stats,
    });
  }

  return {
    key: categoryKey,
    name: categoryName,
    description: categoryDescription,
    weapons: normalizedWeapons,
  };
}

async function fetchOfficialWeaponsPage(language: WeaponLanguage): Promise<PubgWeaponsPayload | null> {
  const sourceUrl = OFFICIAL_WEAPON_URLS[language];
  const multipliers = await getClassMultipliers();

  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": language === "ko" ? "ko-KR,ko;q=0.9,en;q=0.8" : "en-US,en;q=0.9,ko;q=0.8",
      Referer: sourceUrl,
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const scriptBody = extractNuxtScript(html);
  if (!scriptBody) {
    return null;
  }

  const rawCategories = parseWeaponCategories(scriptBody);
  if (!rawCategories.length) {
    return null;
  }

  const categories = rawCategories
    .map((category) => normalizeCategory(category, multipliers))
    .filter((category): category is PubgWeaponCategory => category !== null);

  return {
    language,
    sourceLanguage: language,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    categories,
  };
}

export async function getPubgWeapons(language: WeaponLanguage = "ko"): Promise<PubgWeaponsPayload> {
  const preferredLanguages = getPreferredLanguages(language);

  for (const preferredLanguage of preferredLanguages) {
    try {
      const payload = await fetchOfficialWeaponsPage(preferredLanguage);
      if (payload && payload.categories.length > 0) {
        return {
          ...payload,
          language,
        };
      }
    } catch (error) {
      console.error(`Failed to fetch official weapons (${preferredLanguage}):`, error);
    }
  }

  return {
    language,
    sourceLanguage: preferredLanguages[0],
    sourceUrl: OFFICIAL_WEAPON_URLS[preferredLanguages[0]],
    fetchedAt: new Date().toISOString(),
    categories: [],
  };
}
