"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import SkinGachaSimulator from "@/components/features/SkinGachaSimulator";
import type { PubgWeaponSkinCategory, PubgWeaponSkinItem, PubgWeaponSkinsPayload } from "@/lib/pubgWeaponSkins";

type UiLanguage = "ko" | "en" | "ja" | "zh";
type SkinKind = "weapon" | "clothing";

function formatFetchedAt(value: string, locale: string): string {
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

export default function SkinHub() {
  const { t, language } = useLanguage();
  const uiLanguage: UiLanguage = language;
  const apiLanguage = language === "en" ? "en" : "ko";
  const text = t.skinHub;

  const [payload, setPayload] = useState<PubgWeaponSkinsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<SkinKind>("weapon");
  const [activeCategory, setActiveCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [visibleCount, setVisibleCount] = useState(48);

  const locale = useMemo(() => {
    if (uiLanguage === "ko") return "ko-KR";
    if (uiLanguage === "ja") return "ja-JP";
    if (uiLanguage === "zh") return "zh-CN";
    return "en-US";
  }, [uiLanguage]);

  const fetchSkins = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/weapon-skins?lang=${apiLanguage}&type=all`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch skins: ${response.status}`);
      }

      const nextPayload = (await response.json()) as PubgWeaponSkinsPayload;
      setPayload(nextPayload);
    } catch (fetchError) {
      console.error(fetchError);
      setPayload(null);
      setError(text.noData);
    } finally {
      setLoading(false);
    }
  }, [apiLanguage, text.noData]);

  useEffect(() => {
    fetchSkins();
  }, [fetchSkins]);

  const visibleCategories = useMemo<PubgWeaponSkinCategory[]>(() => {
    return (payload?.categories ?? []).filter((category) => category.kind === kind);
  }, [payload, kind]);

  useEffect(() => {
    if (!visibleCategories.length) {
      setActiveCategory("");
      return;
    }

    setActiveCategory((current) => {
      if (!current) return visibleCategories[0].slug;
      return visibleCategories.some((category) => category.slug === current) ? current : visibleCategories[0].slug;
    });
  }, [visibleCategories]);

  const filteredItems = useMemo<PubgWeaponSkinItem[]>(() => {
    const baseItems = (payload?.items ?? []).filter((item) => item.kind === kind);
    const keywordValue = keyword.trim().toLowerCase();

    return baseItems
      .filter((item) => {
        if (activeCategory && item.categorySlug !== activeCategory) return false;
        if (!keywordValue) return true;

        return (
          item.skinName.toLowerCase().includes(keywordValue) ||
          item.weaponName.toLowerCase().includes(keywordValue) ||
          item.categoryName.toLowerCase().includes(keywordValue)
        );
      })
      .sort((left, right) => {
        const categoryCompare = left.categoryName.localeCompare(right.categoryName, locale);
        if (categoryCompare !== 0) return categoryCompare;
        const groupCompare = left.weaponName.localeCompare(right.weaponName, locale);
        if (groupCompare !== 0) return groupCompare;
        return left.skinName.localeCompare(right.skinName, locale);
      });
  }, [payload, kind, activeCategory, keyword, locale]);

  useEffect(() => {
    setVisibleCount(48);
  }, [kind, activeCategory, keyword]);

  const renderedItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);

  return (
    <div className="container mx-auto max-w-[1400px] px-4 py-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#2B2D31]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-gray-400">{text.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={fetchSkins}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-[#f0b90b] hover:text-gray-900 dark:border-white/10 dark:bg-black/20 dark:text-gray-300 dark:hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            {text.refresh}
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-gray-400">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{text.source}: </span>
              <span className="break-all font-mono">{payload?.sourceUrl ?? "https://pubgitems.info/ko"}</span>
            </span>
            <span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{text.fetchedAt}: </span>
              <span className="font-mono">{payload ? formatFetchedAt(payload.fetchedAt, locale) : "-"}</span>
            </span>
            <span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{text.total}: </span>
              <span className="font-mono">{filteredItems.length.toLocaleString(locale)}</span>
            </span>
          </div>
          <p className="mt-2">{text.cacheNotice}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {([
            { key: "weapon", label: text.weaponTab },
            { key: "clothing", label: text.clothingTab },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setKind(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                kind === tab.key
                  ? "bg-[#f0b90b] text-black"
                  : "border border-gray-200 bg-gray-50 text-gray-700 hover:border-[#f0b90b] dark:border-white/10 dark:bg-black/20 dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              activeCategory === ""
                ? "bg-[#f0b90b] text-black"
                : "border border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
            }`}
          >
            {text.allCategories}
          </button>

          {visibleCategories.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => setActiveCategory(category.slug)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                activeCategory === category.slug
                  ? "bg-[#f0b90b] text-black"
                  : "border border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
              }`}
            >
              {category.name} ({category.totalSkins})
            </button>
          ))}
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={text.searchPlaceholder}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#f0b90b] dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-gray-400">
              {text.loading}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-sm text-red-400">{error}</div>
          ) : renderedItems.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-gray-400">
              {text.noData}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {renderedItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-[#f0b90b] dark:border-white/10 dark:bg-black/20"
                    title={text.openDetail}
                  >
                    <div className="relative flex h-40 items-center justify-center bg-gradient-to-b from-gray-100 to-gray-50 p-4 dark:from-black/30 dark:to-black/50">
                      <Image
                        src={item.imageUrl}
                        alt={item.skinName}
                        width={220}
                        height={220}
                        className="h-full w-full object-contain transition duration-200 group-hover:scale-105"
                      />
                      {item.rarityColor ? (
                        <span
                          className="absolute right-3 top-3 h-3 w-3 rounded-full border border-black/20"
                          style={{ backgroundColor: item.rarityColor }}
                        />
                      ) : null}
                    </div>

                    <div className="space-y-1 p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.kind === "weapon"
                              ? "bg-blue-500/15 text-blue-500 dark:text-blue-300"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                          }`}
                        >
                          {item.kind === "weapon" ? text.weaponTab : text.clothingTab}
                        </span>
                        <span className="truncate text-[11px] text-gray-500 dark:text-gray-400">{item.categoryName}</span>
                      </div>
                      <p className="line-clamp-2 min-h-[2.75rem] text-sm font-bold text-gray-900 dark:text-gray-100">{item.skinName}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.slotName ?? item.weaponName}</p>
                    </div>
                  </a>
                ))}
              </div>

              {visibleCount < filteredItems.length ? (
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + 48)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-[#f0b90b] hover:text-gray-900 dark:border-white/10 dark:bg-black/20 dark:text-gray-300 dark:hover:text-white"
                  >
                    {text.loadMore} ({renderedItems.length}/{filteredItems.length})
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#2B2D31]">
        <div className="mb-4">
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{text.simulatorTitle}</h2>
        </div>
        <SkinGachaSimulator language={language} />
      </section>

      <footer className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm dark:border-white/10 dark:bg-[#2B2D31] dark:text-gray-400">
        <p>
          {text.footerSourcePrefix}{" "}
          <a
            href="https://pubgitems.info/ko"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#f0b90b] underline-offset-2 hover:underline"
          >
            {text.footerSourceLink}
          </a>
          {text.footerSourceSuffix}
        </p>
        <p className="mt-3">{text.footerDisclaimer}</p>
      </footer>
    </div>
  );
}
