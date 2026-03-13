"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";

type RegionType = "AS" | "KAKAO" | "SEA" | "RU" | "NA" | "EU" | "SA";

const REGION_TIMEZONES: Record<RegionType, string> = {
  AS: "Asia/Seoul",
  KAKAO: "Asia/Seoul",
  SEA: "Asia/Bangkok",
  RU: "Europe/Moscow",
  EU: "Europe/Berlin",
  NA: "America/Los_Angeles",
  SA: "America/Sao_Paulo",
};

const getLocalTimeMs = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map: Record<string, string> = {};
  parts.forEach(({ type, value }) => {
    map[type] = value;
  });

  const localIsoString = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
  return new Date(localIsoString).getTime();
};

const formatTimeLeft = (ms: number, language: string) => {
  if (ms <= 0) return null;
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  
  const dayLabel = language === "en" ? "d" : language === "ja" ? "日" : language === "zh" ? "天" : "일";
  if (days > 0) {
    return `${days}${dayLabel} ${timeStr}`;
  }
  return timeStr;
};

const PERIODS = [
  { week: 1, label: "1주차 (3/11 ~ 3/18)", startLocal: "2026-03-11T09:00:00", endLocal: "2026-03-18T09:00:00" },
  { week: 2, label: "2주차 (3/18 ~ 3/25)", startLocal: "2026-03-18T09:00:00", endLocal: "2026-03-25T09:00:00" },
  { week: 3, label: "3주차 (3/25 ~ 4/1)", startLocal: "2026-03-25T09:00:00", endLocal: "2026-04-01T09:00:00" },
  { week: 4, label: "4주차 (4/1 ~ 4/8)", startLocal: "2026-04-01T09:00:00", endLocal: "2026-04-08T09:00:00" },
];

const RAW_DATA = {
  AS: {
    week1: ['에란겔', '태이고', '비켄디', '사녹', '론도'],
    week2: ['에란겔', '태이고', '사녹', '미라마', '론도'],
    week3: ['에란겔', '태이고', '미라마', '비켄디', '론도'],
    week4: ['에란겔', '태이고', '비켄디', '사녹', '파라모']
  },
  SEA: {
    week1: ['에란겔', '태이고', '파라모', '사녹', '론도'],
    week2: ['에란겔', '태이고', '사녹', '미라마', '론도'],
    week3: ['에란겔', '태이고', '미라마', '파라모', '론도'],
    week4: ['에란겔', '태이고', '파라모', '사녹', '비켄디']
  },
  KAKAO: {
    week1: ['에란겔', '태이고', '사녹', '카라킨', '론도'],
    week2: ['에란겔', '태이고', '사녹', '파라모', '론도'],
    week3: ['에란겔', '태이고', '사녹', '카라킨', '론도'],
    week4: ['에란겔', '태이고', '사녹', '파라모', '비켄디']
  },
  NA: {
    week1: ['에란겔', '태이고', '미라마', '비켄디', '론도'],
    week2: ['에란겔', '태이고', '비켄디', '데스턴', '론도'],
    week3: ['에란겔', '태이고', '데스턴', '미라마', '론도'],
    week4: ['에란겔', '태이고', '미라마', '비켄디', '파라모']
  },
  SA: {
    week1: ['에란겔', '태이고', '미라마', '비켄디', '론도'],
    week2: ['에란겔', '태이고', '비켄디', '사녹', '론도'],
    week3: ['에란겔', '태이고', '사녹', '미라마', '론도'],
    week4: ['에란겔', '태이고', '미라마', '비켄디', '데스턴']
  },
  EU: {
    week1: ['에란겔', '태이고', '미라마', '비켄디', '론도'],
    week2: ['에란겔', '태이고', '비켄디', '사녹', '론도'],
    week3: ['에란겔', '태이고', '사녹', '미라마', '론도'],
    week4: ['에란겔', '태이고', '미라마', '비켄디', '데스턴']
  },
  RU: {
    week1: ['에란겔', '태이고', '미라마', '비켄디', '론도'],
    week2: ['에란겔', '태이고', '비켄디', '데스턴', '론도'],
    week3: ['에란겔', '태이고', '데스턴', '미라마', '론도'],
    week4: ['에란겔', '태이고', '미라마', '비켄디', '카라킨']
  }
};

const RANKED_ROTATION = {
  label: "시즌 40 고정",
  maps: ["에란겔", "미라마", "태이고", "론도"],
};

const getMapImagePath = (mapName: string) => {
  const mapping: Record<string, string> = {
    "에란겔": "Erangel_Main_No_Text_Low_Res.png",
    "미라마": "Miramar_Main_No_Text_Low_Res.png",
    "태이고": "Taego_Main_No_Text_Low_Res.png",
    "사녹": "Sanhok_Main_No_Text_Low_Res.png",
    "비켄디": "Vikendi_Main_No_Text_Low_Res.png",
    "카라킨": "Karakin_Main_No_Text_Low_Res.png",
    "파라모": "Paramo_Main_No_Text_Low_Res.png",
    "론도": "Rondo_Main_No_Text_Low_Res.png",
    "데스턴": "Deston_Main_No_Text_Low_Res.png"
  };
  
  if (mapping[mapName]) {
    return `/maps/rotation/${mapping[mapName]}`;
  }
  
  return null;
};

function MapCard({ mapName }: { mapName: string }) {
  const [imgSrc, setImgSrc] = useState<string | null>(getMapImagePath(mapName));
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgSrc(getMapImagePath(mapName));
    setImgError(false);
  }, [mapName]);

  return (
    <div className="group relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-zinc-800 dark:border-white/10">
      {imgSrc && !imgError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imgSrc}
          alt={mapName}
          onError={() => {
            setImgError(true);
          }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-700/50">
          <span className="text-xl font-bold tracking-widest text-zinc-500 opacity-30 select-none">PUBG</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="pointer-events-none absolute bottom-2 left-3">
        <span className="text-sm font-bold text-white drop-shadow-md">{mapName}</span>
      </div>
    </div>
  );
}

export default function MapRotation() {
  const { language } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState<RegionType>("AS");
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const calculateTime = () => {
      const now = new Date();
      const timeZone = REGION_TIMEZONES[selectedRegion];
      const currentLocalMs = getLocalTimeMs(now, timeZone);

      const idx = PERIODS.findIndex((p) => {
        const start = new Date(p.startLocal).getTime();
        const end = new Date(p.endLocal).getTime();
        return currentLocalMs >= start && currentLocalMs < end;
      });

      if (idx !== -1) {
        setCurrentWeekIndex(idx);
        const endMs = new Date(PERIODS[idx].endLocal).getTime();
        setTimeLeft(formatTimeLeft(endMs - currentLocalMs, language));
      } else {
        const firstStart = new Date(PERIODS[0].startLocal).getTime();
        if (currentLocalMs < firstStart) {
          setCurrentWeekIndex(0);
          setTimeLeft(formatTimeLeft(firstStart - currentLocalMs, language));
        } else {
          setCurrentWeekIndex(3);
          setTimeLeft(null);
        }
      }
    };

    calculateTime();
    const intervalId = setInterval(calculateTime, 1000);
    return () => clearInterval(intervalId);
  }, [selectedRegion, language]);

  const currentPeriod = PERIODS[currentWeekIndex];
  const nextPeriod = currentWeekIndex + 1 < PERIODS.length ? PERIODS[currentWeekIndex + 1] : null;

  const currentMaps = RAW_DATA[selectedRegion][`week${currentPeriod.week}` as keyof typeof RAW_DATA[RegionType]];
  const nextMaps = nextPeriod ? RAW_DATA[selectedRegion][`week${nextPeriod.week}` as keyof typeof RAW_DATA[RegionType]] : [];

  const languageLabels =
    language === "en"
      ? {
          title: "Map Rotation - Update 40.2",
          currentWeek: "This Week",
          nextWeek: "→ Next Week",
          ranked: "Ranked - Season 40",
          updatePending: "Update Pending",
          timeLeftSuffix: "left"
        }
      : language === "ja"
        ? {
            title: "マップローテーション - Update 40.2",
            currentWeek: "今週",
            nextWeek: "→ 来週",
            ranked: "ランクマッチ - シーズン 40",
            updatePending: "アップデート予定",
            timeLeftSuffix: "残り"
          }
        : language === "zh"
          ? {
              title: "地图轮换 - Update 40.2",
              currentWeek: "本周",
              nextWeek: "→ 下周",
              ranked: "竞技模式 - 赛季 40",
              updatePending: "敬请期待",
              timeLeftSuffix: "剩余"
            }
          : {
              title: "맵 로테이션 - 업데이트 40.2",
              currentWeek: "이번 주 진행 중",
              nextWeek: "→ 다음 주 예고",
              ranked: "경쟁전 시즌 40 고정",
              updatePending: "업데이트 예정",
              timeLeftSuffix: "남음"
            };

  const REGIONS: RegionType[] = ["AS", "KAKAO", "SEA", "RU", "NA", "EU", "SA"];

  // 최초 렌더링 시 서버/클라이언트 불일치 방지
  if (!isMounted) return null;

  return (
    <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900 md:p-5 text-gray-800 dark:text-gray-300">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h3 className="shrink-0 text-base font-black text-gray-900 dark:text-gray-100 md:text-lg">
          {languageLabels.title}
        </h3>
        
        <div className="w-full sm:w-auto overflow-hidden">
          <div className="inline-flex w-full items-center gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-1 custom-scrollbar dark:border-white/10 dark:bg-black/50 sm:w-auto">
            {REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  selectedRegion === region
                    ? "bg-zinc-700 text-yellow-400 border border-yellow-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-transparent"
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 이번 주 진행 중 & 카운트다운 타이머 */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 px-1">
            <h4 className="text-sm font-extrabold text-gray-800 dark:text-gray-200">
              {languageLabels.currentWeek}
            </h4>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mr-auto sm:mr-0">
              {currentPeriod.label}
            </span>
            {timeLeft && (
              <span className="px-2 py-0.5 text-xs font-mono bg-zinc-800 border border-yellow-500/50 text-yellow-400 rounded-md shadow-sm">
                {timeLeft} {languageLabels.timeLeftSuffix}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {currentMaps.map((mapName, idx) => (
              <MapCard key={`current-${selectedRegion}-${mapName}-${idx}`} mapName={mapName} />
            ))}
          </div>
        </div>

        {/* → 다음 주 예고 */}
        <div className="space-y-3">
          <div className="flex items-end gap-2 px-1">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {languageLabels.nextWeek}
            </h4>
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-500">
              {nextPeriod ? nextPeriod.label : languageLabels.updatePending}
            </span>
          </div>
          {nextMaps.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {nextMaps.map((mapName, idx) => (
                <MapCard key={`next-${selectedRegion}-${mapName}-${idx}`} mapName={mapName} />
              ))}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20">
              <span className="text-sm font-medium text-gray-400">{languageLabels.updatePending}</span>
            </div>
          )}
        </div>

        {/* 경쟁전 고정 */}
        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-end gap-2 px-1">
            <h4 className="text-sm font-extrabold text-gray-800 dark:text-gray-200">
              {languageLabels.ranked}
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RANKED_ROTATION.maps.map((mapName, idx) => (
              <MapCard key={`ranked-${mapName}-${idx}`} mapName={mapName} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
