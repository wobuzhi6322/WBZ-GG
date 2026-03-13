"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Shield, Zap } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { PubgWeaponCategory, PubgWeapon } from "@/lib/pubgWeapons";
import WeaponDetailThumbnail from "@/components/features/WeaponDetailThumbnail";

interface WeaponInfoExplorerProps {
  categories: PubgWeaponCategory[];
}

function formatDamage(value: number | null): string {
  if (value === null) return "-";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function WeaponInfoExplorer({ categories }: WeaponInfoExplorerProps) {
  const { language } = useLanguage();
  const [activeCategoryKey, setActiveCategoryKey] = useState("");
  const [activeWeaponKey, setActiveWeaponKey] = useState("");
  const [keyword, setKeyword] = useState("");

  const text =
    language === "en"
      ? {
          searchPlaceholder: "Search weapon",
          detailPlaceholder: "Select a weapon from the list to see core stats.",
          bodyDamage: "Body Damage",
          stats: "Core Stats",
          baseDamage: "Base Damage",
          ammunition: "Ammo",
          emptyCategory: "No weapons in this category.",
          noBodyDamage: "No body damage data.",
          noStats: "No additional stat blocks.",
          head: "Head",
          body: "Body",
          leg: "Leg",
        }
      : language === "ja"
        ? {
            searchPlaceholder: "武器検索",
            detailPlaceholder: "左のリストから武器を選択してください。",
            bodyDamage: "部位ダメージ",
            stats: "主要ステータス",
            baseDamage: "基本ダメージ",
            ammunition: "弾薬",
            emptyCategory: "このカテゴリに武器がありません。",
            noBodyDamage: "部位別ダメージ情報なし。",
            noStats: "追加ステータスなし。",
            head: "頭",
            body: "胴体",
            leg: "脚",
          }
        : language === "zh"
          ? {
              searchPlaceholder: "搜索武器",
              detailPlaceholder: "从左侧列表中选择武器查看详情。",
              bodyDamage: "部位伤害",
              stats: "核心属性",
              baseDamage: "基础伤害",
              ammunition: "弹药",
              emptyCategory: "当前分类没有武器。",
              noBodyDamage: "暂无部位伤害数据。",
              noStats: "暂无额外属性。",
              head: "头部",
              body: "身体",
              leg: "腿部",
            }
          : {
              searchPlaceholder: "무기 이름 검색",
              detailPlaceholder: "왼쪽 목록에서 무기를 선택하면 핵심 스탯이 표시됩니다.",
              bodyDamage: "신체 부위별 데미지",
              stats: "핵심 스탯",
              baseDamage: "기본 데미지",
              ammunition: "사용 탄약",
              emptyCategory: "선택한 카테고리에 무기가 없습니다.",
              noBodyDamage: "신체 부위별 데미지 데이터가 없습니다.",
              noStats: "추가 스탯 데이터가 없습니다.",
              head: "머리",
              body: "몸통",
              leg: "다리",
            };

  useEffect(() => {
    if (!categories.length) {
      setActiveCategoryKey("");
      return;
    }

    setActiveCategoryKey((current) => (categories.some((category) => category.key === current) ? current : categories[0].key));
  }, [categories]);

  const activeCategory = useMemo(
    () => categories.find((category) => category.key === activeCategoryKey) ?? categories[0] ?? null,
    [activeCategoryKey, categories],
  );

  const filteredWeapons = useMemo(() => {
    if (!activeCategory) return [];
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return activeCategory.weapons;
    return activeCategory.weapons.filter((weapon) => {
      return weapon.name.toLowerCase().includes(normalizedKeyword) || weapon.key.toLowerCase().includes(normalizedKeyword);
    });
  }, [activeCategory, keyword]);

  useEffect(() => {
    if (!filteredWeapons.length) {
      setActiveWeaponKey("");
      return;
    }

    setActiveWeaponKey((current) => (filteredWeapons.some((weapon) => weapon.key === current) ? current : filteredWeapons[0].key));
  }, [filteredWeapons]);

  const selectedWeapon = useMemo<PubgWeapon | null>(
    () => filteredWeapons.find((weapon) => weapon.key === activeWeaponKey) ?? filteredWeapons[0] ?? null,
    [activeWeaponKey, filteredWeapons],
  );

  const maxDamage = Math.max(
    1,
    selectedWeapon?.bodyDamage?.head ?? 0,
    selectedWeapon?.bodyDamage?.body ?? 0,
    selectedWeapon?.bodyDamage?.leg ?? 0,
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.25fr)]">
      <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/95 p-5 shadow-[0_24px_90px_-50px_rgba(0,0,0,0.55)]">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = category.key === activeCategoryKey;
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => {
                  setActiveCategoryKey(category.key);
                  setKeyword("");
                }}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  active ? "bg-wbz-gold text-black" : "border border-white/10 bg-black/20 text-zinc-400 hover:border-wbz-gold/40 hover:text-white"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={text.searchPlaceholder}
            className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-wbz-gold/60"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
          {filteredWeapons.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-sm text-zinc-500">{text.emptyCategory}</div>
          ) : (
            filteredWeapons.map((weapon) => {
              const active = selectedWeapon?.key === weapon.key;
              return (
                <button
                  key={weapon.key}
                  type="button"
                  onClick={() => setActiveWeaponKey(weapon.key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-wbz-gold/50 bg-wbz-gold/10"
                      : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-white/8 bg-zinc-950/90 px-2">
                      <WeaponDetailThumbnail weaponName={weapon.name} weaponKey={weapon.key} className="h-auto w-20 max-h-10" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-white">{weapon.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{weapon.categoryName}</div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/95 p-5 shadow-[0_24px_90px_-50px_rgba(0,0,0,0.55)]">
        {selectedWeapon ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <div className="flex h-36 w-full max-w-[280px] items-center justify-center rounded-2xl border border-white/8 bg-black/25 px-4">
                <WeaponDetailThumbnail weaponName={selectedWeapon.name} weaponKey={selectedWeapon.key} className="h-auto w-52 max-h-24" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">{selectedWeapon.categoryName}</div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{selectedWeapon.name}</h2>
                {selectedWeapon.description ? <p className="mt-2 text-sm leading-6 text-zinc-400">{selectedWeapon.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="text-[11px] text-zinc-500">{text.baseDamage}</div>
                    <div className="mt-1 text-2xl font-black text-wbz-gold">{formatDamage(selectedWeapon.baseDamage)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="text-[11px] text-zinc-500">{text.ammunition}</div>
                    <div className="mt-1 text-base font-black text-white">{selectedWeapon.ammunition || "-"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                  <Shield className="h-4 w-4 text-wbz-gold" />
                  {text.bodyDamage}
                </div>
                {selectedWeapon.bodyDamage ? (
                  <div className="space-y-3">
                    {[
                      { key: text.head, value: selectedWeapon.bodyDamage.head, color: "bg-rose-500" },
                      { key: text.body, value: selectedWeapon.bodyDamage.body, color: "bg-amber-400" },
                      { key: text.leg, value: selectedWeapon.bodyDamage.leg, color: "bg-cyan-400" },
                    ].map((item) => (
                      <div key={item.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">{item.key}</span>
                          <span className="font-black text-zinc-100">{formatDamage(item.value)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div className={`h-full ${item.color}`} style={{ width: `${Math.max(8, (item.value / maxDamage) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">{text.noBodyDamage}</div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                  <Zap className="h-4 w-4 text-cyan-300" />
                  {text.stats}
                </div>
                {selectedWeapon.stats.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedWeapon.stats.map((stat) => (
                      <div key={`${selectedWeapon.key}-${stat.title}`} className="rounded-xl border border-white/8 bg-zinc-950/80 px-3 py-2.5">
                        <div className="text-[11px] text-zinc-500">{stat.title}</div>
                        <div className="mt-1 text-sm font-black text-zinc-100">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">{text.noStats}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-zinc-500">
            {text.detailPlaceholder}
          </div>
        )}
      </div>
    </section>
  );
}
