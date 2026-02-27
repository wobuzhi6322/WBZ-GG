"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { Flame, TrendingUp, BarChart3, ExternalLink, RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const META_WEAPONS = [
  { name: "AUG", type: "AR", tier: "S", pickRate: "45.2%" },
  { name: "DRAGUNOV", type: "DMR", tier: "S", pickRate: "33.1%" },
  { name: "BERYL M762", type: "AR", tier: "A", pickRate: "28.4%" },
  { name: "JS9", type: "SMG", tier: "A", pickRate: "18.5%" },
  { name: "Kar98k", type: "SR", tier: "A", pickRate: "15.2%" },
];

interface RotationMapItem {
  id: string;
  nameEn: string;
  nameKo: string;
  imageUrl: string;
  sizeKm: number;
}

interface RankedRotationItem extends RotationMapItem {
  probability: string | null;
}

interface RotationWeekItem {
  week: number;
  label: string;
  startAt: string | null;
  maps: RotationMapItem[];
}

interface MapRotationResponse {
  fetchedAt: string;
  source: {
    postId: string;
    title: string;
    publishedAt: string;
    officialUrlKo: string;
    officialUrlEn: string;
  };
  region: "AS";
  platform: "PC";
  currentWeek: RotationWeekItem | null;
  normal: {
    weeks: RotationWeekItem[];
    rotationPool: RotationMapItem[];
  };
  ranked: {
    maps: RankedRotationItem[];
  };
}

function formatKoreanDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function MetaSidePanel() {
  const { t } = useLanguage();
  const [rotation, setRotation] = useState<MapRotationResponse | null>(null);
  const [isLoadingRotation, setIsLoadingRotation] = useState(true);

  const currentWeekMapIds = useMemo(() => {
    if (!rotation?.currentWeek) return new Set<string>();
    return new Set(rotation.currentWeek.maps.map((map) => map.id));
  }, [rotation]);

  useEffect(() => {
    let isMounted = true;

    const fetchRotation = async () => {
      setIsLoadingRotation(true);
      try {
        const response = await fetch("/api/map-rotation", { cache: "no-store" });
        const data = (await response.json()) as MapRotationResponse;

        if (!response.ok) {
          throw new Error("Failed to fetch map rotation");
        }

        if (!isMounted) return;
        setRotation(data);
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setRotation(null);
      } finally {
        if (isMounted) {
          setIsLoadingRotation(false);
        }
      }
    };

    fetchRotation();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      <div className="bg-wbz-card border border-white/5 rounded-2xl p-5 glass-panel">
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Flame className="text-red-500 w-4 h-4" />
            {t.meta.trends_title}
          </h3>
          <span className="text-[10px] text-wbz-mute font-mono bg-white/5 px-2 py-0.5 rounded">PATCH 40.1</span>
        </div>

        <div className="space-y-3">
          {META_WEAPONS.map((weapon, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-6 h-6 rounded flex items-center justify-center text-xs font-black
                    ${
                      weapon.tier === "S"
                        ? "bg-wbz-gold text-black"
                        : weapon.tier === "A"
                          ? "bg-purple-600 text-white"
                          : "bg-gray-600 text-white"
                    }
                  `}
                >
                  {weapon.tier}
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-wbz-gold transition-colors">{weapon.name}</p>
                  <p className="text-[10px] text-wbz-mute">{weapon.type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-white">{weapon.pickRate}</p>
                <p className="text-[10px] text-green-500 flex items-center justify-end gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {t.meta.pick}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full mt-4 py-2 border border-white/10 rounded text-xs text-wbz-mute hover:text-white hover:border-wbz-gold/50 transition-all">
          {t.meta.view_full}
        </button>
      </div>

      <div className="bg-wbz-card border border-white/5 rounded-2xl p-5 glass-panel">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-wbz-gold w-4 h-4" />
            {t.meta.map_rotation}
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-wbz-mute font-mono">AS · PC</span>
        </div>

        {isLoadingRotation ? (
          <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-wbz-mute flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            공식 맵 로테이션 동기화 중...
          </div>
        ) : !rotation ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-200">
            공식 맵 로테이션을 불러오지 못했습니다.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="font-bold text-wbz-gold">이번 주 일반전 ({rotation.currentWeek?.label ?? "-"})</span>
                <span className="text-wbz-mute">
                  {rotation.currentWeek?.startAt ? formatKoreanDate(rotation.currentWeek.startAt) : "-"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(rotation.currentWeek?.maps ?? []).map((map) => (
                  <div key={`current-${map.id}`} className="relative h-20 rounded-md overflow-hidden border border-wbz-gold/30">
                    <Image src={map.imageUrl} alt={map.nameKo} fill className="object-cover" sizes="(max-width: 1024px) 30vw, 220px" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <div className="absolute left-2 bottom-1">
                      <p className="text-xs font-black text-white leading-none">{map.nameKo}</p>
                      <p className="text-[10px] font-mono text-wbz-mute">{map.nameEn}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-wbz-mute mb-2">업데이트 로테이션 풀 (AS)</p>
              <div className="grid grid-cols-2 gap-2">
                {rotation.normal.rotationPool.map((map) => (
                  <div key={`pool-${map.id}`} className="relative h-16 rounded-md overflow-hidden border border-white/10">
                    <Image
                      src={map.imageUrl}
                      alt={map.nameKo}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 26vw, 180px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
                    <div className="absolute left-1.5 right-1.5 bottom-1 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-white truncate">{map.nameKo}</span>
                      {currentWeekMapIds.has(map.id) && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-wbz-gold text-black">NOW</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] font-bold text-wbz-mute mb-2">경쟁전 로테이션</p>
              <div className="flex flex-wrap gap-1.5">
                {rotation.ranked.maps.map((map) => (
                  <span
                    key={`ranked-${map.id}`}
                    className="text-[10px] font-bold px-2 py-1 rounded-full border border-white/20 bg-white/5 text-white"
                  >
                    {map.nameKo}
                    {map.probability ? ` ${map.probability}` : ""}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-1 border-t border-white/5 flex items-center justify-between">
              <p className="text-[10px] text-wbz-mute">기준: PUBG 공식 맵 서비스 리포트</p>
              <Link
                href={rotation.source.officialUrlKo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-wbz-gold hover:text-white transition-colors"
              >
                원문 보기
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
