"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw, Shield, Swords } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import WeaponInfoExplorer from "@/components/features/WeaponInfoExplorer";
import WeaponsStatsTable from "@/components/features/WeaponsStatsTable";
import type { PubgWeaponCategory } from "@/lib/pubgWeapons";

interface WeaponsResponse {
  sourceUrl: string;
  fetchedAt: string;
  categories: PubgWeaponCategory[];
}

type ArsenalTab = "info" | "stats";

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

export default function ArsenalPage() {
  const { language, t } = useLanguage();
  const apiLanguage = language === "en" ? "en" : "ko";

  const [payload, setPayload] = useState<WeaponsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ArsenalTab>("stats");

  const text = t.arsenal;

  const locale = useMemo(() => {
    if (language === "ko") return "ko-KR";
    if (language === "ja") return "ja-JP";
    if (language === "zh") return "zh-CN";
    return "en-US";
  }, [language]);

  const fetchWeapons = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/weapons?lang=${apiLanguage}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch weapons: ${response.status}`);
      }

      const data = (await response.json()) as WeaponsResponse;
      setPayload(data);
    } catch (fetchError) {
      console.error("Weapons fetch failed:", fetchError);
      setPayload(null);
      setError(text.noData);
    } finally {
      setLoading(false);
    }
  }, [apiLanguage, text.noData]);

  useEffect(() => {
    fetchWeapons();
  }, [fetchWeapons]);

  const flattenedWeapons = useMemo(() => payload?.categories.flatMap((category) => category.weapons) ?? [], [payload]);

  return (
    <div className="container mx-auto max-w-[1560px] px-4 py-8">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/95 p-6 shadow-[0_32px_120px_-60px_rgba(0,0,0,0.6)] md:p-8">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-wbz-gold/20 bg-wbz-gold/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-wbz-gold">
              <Swords className="h-3.5 w-3.5" />
              {text.badge}
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">{text.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">{text.subtitle}</p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <button
              type="button"
              onClick={fetchWeapons}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-wbz-gold/50 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              {text.refresh}
            </button>
            {payload ? (
              <div className="text-xs text-zinc-500 xl:text-right">
                <div>
                  <span className="font-bold text-zinc-300">{text.source}: </span>
                  <span className="font-mono break-all">{payload.sourceUrl}</span>
                </div>
                <div className="mt-1">
                  <span className="font-bold text-zinc-300">{text.fetchedAt}: </span>
                  <span className="font-mono">{formatFetchedAt(payload.fetchedAt, locale)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 inline-flex rounded-full border border-white/10 bg-black/25 p-1">
          {([
            { key: "stats", label: text.statsTab, icon: BarChart3 },
            { key: "info", label: text.infoTab, icon: Shield },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
                  active ? "bg-wbz-gold text-black" : "text-zinc-400 hover:bg-zinc-800/70 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-12 text-center text-sm text-zinc-500">
            {text.loading}
          </div>
        ) : error || !payload ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-12 text-center text-sm text-red-300">
            {error || text.noData}
          </div>
        ) : activeTab === "stats" ? (
          <div className="mt-6">
            <WeaponsStatsTable weapons={flattenedWeapons} />
          </div>
        ) : (
          <div className="mt-6">
            <WeaponInfoExplorer categories={payload.categories} />
          </div>
        )}
      </div>
    </div>
  );
}
