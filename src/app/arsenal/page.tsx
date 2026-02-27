"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, RefreshCw, Search } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import SkinGachaSimulator from "@/components/features/SkinGachaSimulator";

interface WeaponStat {
  title: string;
  value: string;
  numericValue: number | null;
}

interface WeaponBodyDamage {
  head: number;
  body: number;
  leg: number;
  weaponClass: string;
}

interface WeaponItem {
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

interface WeaponCategory {
  key: string;
  name: string;
  description: string;
  weapons: WeaponItem[];
}

interface WeaponsResponse {
  sourceUrl: string;
  fetchedAt: string;
  categories: WeaponCategory[];
}

interface WeaponSkinItem {
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

interface WeaponSkinCategory {
  slug: string;
  name: string;
  totalSkins: number;
  weaponCount: number;
}

interface WeaponSkinsResponse {
  sourceUrl: string;
  fetchedAt: string;
  totalSkins: number;
  categories: WeaponSkinCategory[];
  items: WeaponSkinItem[];
}

function formatDamage(value: number | null): string {
  if (value === null) return "-";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function formatFetchedAt(value: string, locale: "ko-KR" | "en-US"): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function ArsenalPage() {
  const { language } = useLanguage();

  const [payload, setPayload] = useState<WeaponsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategoryKey, setActiveCategoryKey] = useState("");
  const [activeWeaponKey, setActiveWeaponKey] = useState("");
  const [keyword, setKeyword] = useState("");
  const [skinsPayload, setSkinsPayload] = useState<WeaponSkinsResponse | null>(null);
  const [skinsLoading, setSkinsLoading] = useState(false);
  const [skinsError, setSkinsError] = useState("");
  const [activeSkinCategory, setActiveSkinCategory] = useState("");
  const [activeSkinWeapon, setActiveSkinWeapon] = useState("");
  const [skinKeyword, setSkinKeyword] = useState("");
  const [visibleSkinCount, setVisibleSkinCount] = useState(72);

  const text = useMemo(() => {
    if (language === "ko") {
      return {
        title: "무기 데이터 센터",
        subtitle: "PUBG 공식 무기 정보를 기준으로 전체 카테고리를 최신화했습니다.",
        refresh: "새로고침",
        source: "데이터 출처",
        fetchedAt: "동기화 시각",
        searchPlaceholder: "무기 이름 검색",
        base: "기본",
        head: "머리",
        body: "몸통",
        leg: "다리",
        categoryEmpty: "표시할 무기가 없습니다.",
        noData: "무기 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        noBodyDamage: "신체 부위 데미지 정보를 제공하지 않는 무기입니다.",
        detailPlaceholder: "왼쪽에서 무기를 선택하면 상세 정보가 표시됩니다.",
        ammo: "사용 탄약",
        stats: "세부 스펙",
        noStats: "표시 가능한 스펙 데이터가 없습니다.",
        updated: "업데이트",
        skinSectionTitle: "무기 스킨 갤러리",
        skinSectionDesc: "PUBG Items 공개 페이지를 참고해 총기 스킨 이미지를 카테고리/총기별로 확인할 수 있습니다.",
        skinRefresh: "스킨 갱신",
        skinLoading: "스킨 데이터를 불러오는 중입니다...",
        skinNoData: "표시 가능한 스킨 데이터가 없습니다.",
        skinSearchPlaceholder: "스킨 이름 검색",
        skinWeaponFilter: "총기 필터",
        skinWeaponAll: "전체 총기",
        skinLoadMore: "더 보기",
        skinOpenDetail: "상세 보기",
        skinTotal: "스킨 수",
        skinCategoryAll: "전체",
      };
    }

    return {
      title: "Weapon Data Center",
      subtitle: "All weapon categories are synced from PUBG official weapon data.",
      refresh: "Refresh",
      source: "Source",
      fetchedAt: "Synced At",
      searchPlaceholder: "Search weapon name",
      base: "Base",
      head: "Head",
      body: "Body",
      leg: "Leg",
      categoryEmpty: "No weapons available in this category.",
      noData: "Unable to load weapon data right now. Please try again.",
      noBodyDamage: "This weapon does not provide body-part damage values.",
      detailPlaceholder: "Select a weapon from the list to view details.",
      ammo: "Ammunition",
      stats: "Weapon Stats",
      noStats: "No stat data available for this weapon.",
      updated: "Updated",
      skinSectionTitle: "Weapon Skin Gallery",
      skinSectionDesc: "Browse weapon skin images sourced from the public PUBG Items pages.",
      skinRefresh: "Refresh Skins",
      skinLoading: "Loading weapon skins...",
      skinNoData: "No weapon skin data available.",
      skinSearchPlaceholder: "Search skin name",
      skinWeaponFilter: "Weapon Filter",
      skinWeaponAll: "All Weapons",
      skinLoadMore: "Load More",
      skinOpenDetail: "Open Detail",
      skinTotal: "Total Skins",
      skinCategoryAll: "All",
    };
  }, [language]);

  const fetchWeapons = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/weapons?lang=${language}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch weapons: ${response.status}`);
      }

      const data = (await response.json()) as WeaponsResponse;
      setPayload(data);
    } catch (fetchError) {
      console.error(fetchError);
      setPayload(null);
      setError(text.noData);
    } finally {
      setLoading(false);
    }
  }, [language, text.noData]);

  const fetchWeaponSkins = useCallback(async () => {
    setSkinsLoading(true);
    setSkinsError("");

    try {
      const response = await fetch(`/api/weapon-skins?lang=${language}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch weapon skins: ${response.status}`);
      }

      const data = (await response.json()) as WeaponSkinsResponse;
      setSkinsPayload(data);
    } catch (fetchError) {
      console.error(fetchError);
      setSkinsPayload(null);
      setSkinsError(text.skinNoData);
    } finally {
      setSkinsLoading(false);
    }
  }, [language, text.skinNoData]);

  useEffect(() => {
    fetchWeapons();
  }, [fetchWeapons]);

  useEffect(() => {
    fetchWeaponSkins();
  }, [fetchWeaponSkins]);

  useEffect(() => {
    if (!payload?.categories?.length) {
      setActiveCategoryKey("");
      return;
    }

    setActiveCategoryKey((currentKey) => {
      const hasCurrent = payload.categories.some((category) => category.key === currentKey);
      return hasCurrent ? currentKey : payload.categories[0].key;
    });
  }, [payload]);

  useEffect(() => {
    if (!skinsPayload?.categories?.length) {
      setActiveSkinCategory("");
      return;
    }

    setActiveSkinCategory((currentCategory) => {
      const hasCurrent = skinsPayload.categories.some((category) => category.slug === currentCategory);
      return hasCurrent ? currentCategory : skinsPayload.categories[0].slug;
    });
  }, [skinsPayload]);

  const activeCategory = useMemo(() => {
    if (!payload) return null;
    return payload.categories.find((category) => category.key === activeCategoryKey) ?? null;
  }, [payload, activeCategoryKey]);

  const filteredWeapons = useMemo(() => {
    if (!activeCategory) return [];

    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return activeCategory.weapons;

    return activeCategory.weapons.filter((weapon) => {
      return (
        weapon.name.toLowerCase().includes(normalizedKeyword) ||
        weapon.key.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [activeCategory, keyword]);

  useEffect(() => {
    if (filteredWeapons.length === 0) {
      setActiveWeaponKey("");
      return;
    }

    setActiveWeaponKey((currentKey) => {
      const hasCurrent = filteredWeapons.some((weapon) => weapon.key === currentKey);
      return hasCurrent ? currentKey : filteredWeapons[0].key;
    });
  }, [filteredWeapons]);

  const selectedWeapon = useMemo(() => {
    return filteredWeapons.find((weapon) => weapon.key === activeWeaponKey) ?? null;
  }, [filteredWeapons, activeWeaponKey]);

  const skinsInCategory = useMemo(() => {
    if (!skinsPayload) return [];
    if (!activeSkinCategory) return skinsPayload.items;
    return skinsPayload.items.filter((item) => item.categorySlug === activeSkinCategory);
  }, [skinsPayload, activeSkinCategory]);

  const availableSkinWeapons = useMemo(() => {
    const weaponMap = new Map<string, string>();
    for (const skin of skinsInCategory) {
      if (!weaponMap.has(skin.weaponKey)) {
        weaponMap.set(skin.weaponKey, skin.weaponName);
      }
    }

    return Array.from(weaponMap.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [skinsInCategory]);

  useEffect(() => {
    if (!availableSkinWeapons.length) {
      setActiveSkinWeapon("");
      return;
    }

    setActiveSkinWeapon((currentWeapon) => {
      if (!currentWeapon) return "";
      const exists = availableSkinWeapons.some((weapon) => weapon.key === currentWeapon);
      return exists ? currentWeapon : "";
    });
  }, [availableSkinWeapons]);

  const filteredSkins = useMemo(() => {
    const normalizedKeyword = skinKeyword.trim().toLowerCase();

    return skinsInCategory
      .filter((skin) => {
        if (activeSkinWeapon && skin.weaponKey !== activeSkinWeapon) return false;
        if (!normalizedKeyword) return true;

        return (
          skin.skinName.toLowerCase().includes(normalizedKeyword) ||
          skin.weaponName.toLowerCase().includes(normalizedKeyword)
        );
      })
      .sort((a, b) => {
        const weaponCompare = a.weaponName.localeCompare(b.weaponName, "ko");
        if (weaponCompare !== 0) return weaponCompare;
        return a.skinName.localeCompare(b.skinName, "ko");
      });
  }, [skinsInCategory, activeSkinWeapon, skinKeyword]);

  useEffect(() => {
    setVisibleSkinCount(72);
  }, [activeSkinCategory, activeSkinWeapon, skinKeyword]);

  const visibleSkins = useMemo(() => {
    return filteredSkins.slice(0, visibleSkinCount);
  }, [filteredSkins, visibleSkinCount]);

  const simulatorSkins = useMemo(() => {
    if (!skinsPayload?.items?.length) return [];
    return skinsPayload.items.map((item) => ({
      id: item.id,
      skinName: item.skinName,
      weaponName: item.weaponName,
      imageUrl: item.imageUrl,
    }));
  }, [skinsPayload]);

  const maxDamage = useMemo(() => {
    const values = [
      selectedWeapon?.bodyDamage?.head,
      selectedWeapon?.bodyDamage?.body,
      selectedWeapon?.bodyDamage?.leg,
    ].filter((value): value is number => typeof value === "number");

    if (!values.length) return 1;
    return Math.max(...values);
  }, [selectedWeapon]);

  const locale = language === "ko" ? "ko-KR" : "en-US";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">{text.title}</h1>
          <p className="text-wbz-mute">{text.subtitle}</p>
        </div>

        <button
          onClick={fetchWeapons}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-wbz-card text-wbz-mute hover:border-wbz-gold/50 hover:text-white transition-colors text-sm font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          {text.refresh}
        </button>
      </div>

      {payload && (
        <div className="mb-6 bg-wbz-card border border-white/5 rounded-xl px-4 py-3 text-xs text-wbz-mute flex flex-wrap items-center gap-4">
          <span className="font-bold text-white">{text.source}:</span>
          <span className="font-mono break-all">{payload.sourceUrl}</span>
          <span className="font-bold text-white">{text.fetchedAt}:</span>
          <span className="font-mono">{formatFetchedAt(payload.fetchedAt, locale)}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-wbz-card border border-white/5 rounded-2xl p-10 text-center text-wbz-mute">
          LOADING WEAPON DATABASE...
        </div>
      ) : error ? (
        <div className="bg-wbz-card border border-red-500/30 rounded-2xl p-10 text-center text-red-300">{error}</div>
      ) : !payload || payload.categories.length === 0 ? (
        <div className="bg-wbz-card border border-white/5 rounded-2xl p-10 text-center text-wbz-mute">{text.noData}</div>
      ) : (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {payload.categories.map((category) => (
              <button
                key={category.key}
                onClick={() => {
                  setActiveCategoryKey(category.key);
                  setKeyword("");
                }}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-colors ${
                  activeCategoryKey === category.key
                    ? "bg-wbz-gold text-black border-wbz-gold"
                    : "bg-wbz-card text-wbz-mute border-white/10 hover:border-white/30 hover:text-white"
                }`}
              >
                {category.name} ({category.weapons.length})
              </button>
            ))}
          </div>

          <div className="mb-6 relative">
            <Search className="w-4 h-4 text-wbz-mute absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={text.searchPlaceholder}
              className="w-full bg-wbz-card border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-wbz-mute focus:outline-none focus:border-wbz-gold/60"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7">
              {filteredWeapons.length === 0 ? (
                <div className="bg-wbz-card border border-white/5 rounded-2xl p-8 text-center text-wbz-mute">{text.categoryEmpty}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredWeapons.map((weapon, index) => (
                    <motion.button
                      key={weapon.key}
                      type="button"
                      onClick={() => setActiveWeaponKey(weapon.key)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`text-left bg-wbz-card rounded-2xl border transition-all overflow-hidden ${
                        weapon.key === activeWeaponKey
                          ? "border-wbz-gold shadow-[0_0_0_1px_rgba(242,170,0,0.35)]"
                          : "border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="h-36 bg-black/30 flex items-center justify-center overflow-hidden">
                        {weapon.imageUrl ? (
                          <Image
                            src={weapon.imageUrl}
                            alt={weapon.name}
                            width={640}
                            height={300}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <Crosshair className="w-8 h-8 text-wbz-mute" />
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-white font-black leading-tight">{weapon.name}</h3>
                          <span className="text-[11px] px-2 py-1 rounded bg-white/5 text-wbz-mute font-mono">
                            {weapon.categoryName}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-[11px]">
                          <div className="rounded bg-white/5 px-2 py-1.5 text-center">
                            <div className="text-wbz-mute">{text.base}</div>
                            <div className="text-white font-bold">{formatDamage(weapon.baseDamage)}</div>
                          </div>
                          <div className="rounded bg-white/5 px-2 py-1.5 text-center">
                            <div className="text-wbz-mute">{text.head}</div>
                            <div className="text-white font-bold">{formatDamage(weapon.bodyDamage?.head ?? null)}</div>
                          </div>
                          <div className="rounded bg-white/5 px-2 py-1.5 text-center">
                            <div className="text-wbz-mute">{text.body}</div>
                            <div className="text-white font-bold">{formatDamage(weapon.bodyDamage?.body ?? null)}</div>
                          </div>
                          <div className="rounded bg-white/5 px-2 py-1.5 text-center">
                            <div className="text-wbz-mute">{text.leg}</div>
                            <div className="text-white font-bold">{formatDamage(weapon.bodyDamage?.leg ?? null)}</div>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </section>

            <aside className="lg:col-span-5">
              <div className="bg-wbz-card border border-white/5 rounded-2xl p-5 lg:sticky lg:top-24">
                {selectedWeapon ? (
                  <div className="space-y-5">
                    <div className="h-52 bg-black/30 rounded-xl flex items-center justify-center overflow-hidden">
                      {selectedWeapon.imageUrl ? (
                        <Image
                          src={selectedWeapon.imageUrl}
                          alt={selectedWeapon.name}
                          width={900}
                          height={480}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <Crosshair className="w-10 h-10 text-wbz-mute" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-2xl font-black text-white">{selectedWeapon.name}</h2>
                        <span className="text-xs px-2 py-1 rounded bg-white/5 text-wbz-mute font-mono">
                          {selectedWeapon.categoryName}
                        </span>
                      </div>
                      {selectedWeapon.updateDate && (
                        <p className="text-xs text-wbz-mute">
                          {text.updated}: {selectedWeapon.updateDate}
                        </p>
                      )}
                      {selectedWeapon.description && <p className="text-sm text-wbz-mute">{selectedWeapon.description}</p>}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-white">{text.ammo}</h3>
                      {selectedWeapon.ammunition ? (
                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          {selectedWeapon.ammunitionImageUrl ? (
                            <Image
                              src={selectedWeapon.ammunitionImageUrl}
                              alt={selectedWeapon.ammunition}
                              width={40}
                              height={40}
                              className="w-10 h-10 object-contain"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-white/10" />
                          )}
                          <span className="text-sm text-white font-bold">{selectedWeapon.ammunition}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-wbz-mute">-</div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-white">Body Damage</h3>
                      {selectedWeapon.bodyDamage ? (
                        <div className="space-y-3">
                          {[
                            { label: text.head, value: selectedWeapon.bodyDamage.head, color: "bg-rose-500" },
                            { label: text.body, value: selectedWeapon.bodyDamage.body, color: "bg-amber-400" },
                            { label: text.leg, value: selectedWeapon.bodyDamage.leg, color: "bg-sky-500" },
                          ].map((item) => (
                            <div key={item.label} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-wbz-mute">{item.label}</span>
                                <span className="text-white font-bold">{formatDamage(item.value)}</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full ${item.color}`}
                                  style={{ width: `${Math.max(6, (item.value / maxDamage) * 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-wbz-mute">{text.noBodyDamage}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-white">{text.stats}</h3>
                      {selectedWeapon.stats.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedWeapon.stats.map((stat) => (
                            <div key={`${selectedWeapon.key}-${stat.title}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                              <div className="text-[11px] text-wbz-mute">{stat.title}</div>
                              <div className="text-sm font-bold text-white">{stat.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-wbz-mute">{text.noStats}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-64 flex items-center justify-center text-center text-wbz-mute">{text.detailPlaceholder}</div>
                )}
              </div>
            </aside>
          </div>

          <section className="mt-10 bg-wbz-card border border-white/5 rounded-2xl p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-black text-white">{text.skinSectionTitle}</h2>
                <p className="text-sm text-wbz-mute mt-1">{text.skinSectionDesc}</p>
              </div>
              <button
                type="button"
                onClick={fetchWeaponSkins}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-wbz-mute hover:text-white hover:border-wbz-gold/50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {text.skinRefresh}
              </button>
            </div>

            {skinsPayload && (
              <div className="mb-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-wbz-mute flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  <span className="text-white font-semibold">{text.source}: </span>
                  <span className="font-mono break-all">{skinsPayload.sourceUrl}</span>
                </span>
                <span>
                  <span className="text-white font-semibold">{text.fetchedAt}: </span>
                  <span className="font-mono">{formatFetchedAt(skinsPayload.fetchedAt, locale)}</span>
                </span>
                <span>
                  <span className="text-white font-semibold">{text.skinTotal}: </span>
                  <span className="font-mono">{skinsPayload.totalSkins.toLocaleString(locale)}</span>
                </span>
              </div>
            )}

            {skinsLoading ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-wbz-mute text-sm">
                {text.skinLoading}
              </div>
            ) : skinsError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-300 text-sm">
                {skinsError}
              </div>
            ) : !skinsPayload || skinsPayload.items.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-wbz-mute text-sm">
                {text.skinNoData}
              </div>
            ) : (
              <>
                <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                  {skinsPayload.categories.map((category) => (
                    <button
                      key={category.slug}
                      type="button"
                      onClick={() => setActiveSkinCategory(category.slug)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                        activeSkinCategory === category.slug
                          ? "bg-wbz-gold text-black border-wbz-gold"
                          : "bg-white/5 text-wbz-mute border-white/10 hover:text-white hover:border-white/30"
                      }`}
                    >
                      {category.name} ({category.totalSkins})
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 mb-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-wbz-mute absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={skinKeyword}
                      onChange={(event) => setSkinKeyword(event.target.value)}
                      placeholder={text.skinSearchPlaceholder}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-wbz-mute focus:outline-none focus:border-wbz-gold/60"
                    />
                  </div>
                  <label className="block">
                    <span className="sr-only">{text.skinWeaponFilter}</span>
                    <select
                      value={activeSkinWeapon}
                      onChange={(event) => setActiveSkinWeapon(event.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-wbz-gold/60"
                    >
                      <option value="">{text.skinWeaponAll}</option>
                      {availableSkinWeapons.map((weapon) => (
                        <option key={weapon.key} value={weapon.key}>
                          {weapon.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {visibleSkins.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-wbz-mute text-sm">
                    {text.skinNoData}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {visibleSkins.map((skin) => (
                        <a
                          key={skin.id}
                          href={skin.detailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group rounded-xl border border-white/10 bg-black/25 hover:border-wbz-gold/50 transition-colors overflow-hidden"
                        >
                          <div className="relative h-28 bg-black/35 flex items-center justify-center p-2">
                            <Image
                              src={skin.imageUrl}
                              alt={skin.skinName}
                              width={180}
                              height={180}
                              className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                            />
                            {skin.rarityColor && (
                              <span
                                className="absolute right-2 top-2 w-2.5 h-2.5 rounded-full border border-black/30"
                                style={{ backgroundColor: skin.rarityColor }}
                              />
                            )}
                          </div>
                          <div className="p-2.5 space-y-1.5">
                            <p className="text-xs text-white font-semibold leading-tight line-clamp-2">{skin.skinName}</p>
                            <p className="text-[11px] text-wbz-mute truncate">{skin.weaponName}</p>
                          </div>
                        </a>
                      ))}
                    </div>

                    {visibleSkinCount < filteredSkins.length && (
                      <div className="mt-4 text-center">
                        <button
                          type="button"
                          onClick={() => setVisibleSkinCount((current) => current + 72)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-wbz-mute hover:text-white hover:border-wbz-gold/50"
                        >
                          {text.skinLoadMore} ({visibleSkins.length}/{filteredSkins.length})
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          <div className="mt-8">
            <SkinGachaSimulator skins={simulatorSkins} language={language} />
          </div>
        </>
      )}
    </div>
  );
}
