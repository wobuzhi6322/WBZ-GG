"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink, RefreshCw, FileText } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { LanguageType } from "@/data/locales";

interface UpdateItem {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  imageUrl?: string;
  url: string;
  source: "PUBG Official" | "Steam Official";
}

function toLocaleCode(language: LanguageType): string {
  switch (language) {
    case "ko":
      return "ko-KR";
    case "ja":
      return "ja-JP";
    case "zh":
      return "zh-CN";
    default:
      return "en-US";
  }
}

function formatDate(value: string, language: LanguageType): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(toLocaleCode(language), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function UpdatesPage() {
  const { language } = useLanguage();
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const text = useMemo(() => {
    if (language === "ko") {
      return {
        title: "공식 업데이트",
        subtitle: "배틀그라운드 PC 공식 패치노트/업데이트를 실시간으로 수집합니다.",
        refresh: "새로고침",
        latest: "최신 업데이트",
        noData: "업데이트 데이터가 없습니다. 잠시 후 다시 시도해 주세요.",
        open: "원문 보기",
      };
    }
    return {
      title: "Official Updates",
      subtitle: "Live feed of official PUBG PC patch notes and update announcements.",
      refresh: "Refresh",
      latest: "Latest",
      noData: "No update data found. Please try again in a moment.",
      open: "Open Post",
    };
  }, [language]);

  const fetchUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/updates?limit=12&lang=${language}`, { cache: "no-store" });
      const data = (await res.json()) as UpdateItem[];
      if (Array.isArray(data)) {
        setUpdates(data);
      } else {
        setUpdates([]);
      }
    } catch (error) {
      console.error(error);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">{text.title}</h1>
          <p className="text-wbz-mute">{text.subtitle}</p>
        </div>

        <button
          onClick={fetchUpdates}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-wbz-card hover:border-wbz-gold/50 hover:text-white transition-colors text-sm text-wbz-mute font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          {text.refresh}
        </button>
      </div>

      {loading ? (
        <div className="bg-wbz-card border border-white/5 rounded-2xl p-10 text-center text-wbz-mute">
          LOADING OFFICIAL FEED...
        </div>
      ) : updates.length === 0 ? (
        <div className="bg-wbz-card border border-white/5 rounded-2xl p-10 text-center text-wbz-mute">
          {text.noData}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {updates.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="bg-wbz-card border border-white/5 rounded-2xl overflow-hidden group hover:border-wbz-gold/40 transition-colors"
            >
              <div className="relative h-52 bg-black/30">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover opacity-80 group-hover:scale-[1.03] transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-wbz-mute text-sm font-mono">
                    NO IMAGE
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  {index === 0 && (
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-wbz-gold text-black">{text.latest}</span>
                  )}
                  <span className="text-[10px] font-black px-2 py-1 rounded bg-white/10 text-white border border-white/10">
                    {item.source}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h2 className="text-xl font-black text-white leading-tight">{item.title}</h2>
                <p
                  className="text-sm text-wbz-mute overflow-hidden"
                  style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}
                >
                  {item.summary}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                  <span className="text-xs text-wbz-mute font-mono">{formatDate(item.publishedAt, language)}</span>
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-wbz-gold hover:text-white transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    {text.open}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
