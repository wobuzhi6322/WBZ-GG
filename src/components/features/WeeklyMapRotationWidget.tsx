"use client";

import { useLanguage } from "@/context/LanguageContext";

interface WeeklyMapRotationMap {
  name: string;
  imageUrl: string;
}

interface WeeklyMapRotationItem {
  weekLabel: string;
  period: string;
  status: "current" | "next";
  maps: WeeklyMapRotationMap[];
}

const WEEKLY_MAP_ROTATION: WeeklyMapRotationItem[] = [
  {
    weekLabel: "4주 차",
    period: "2.25 ~ 3.3",
    status: "current",
    maps: [
      { name: "에란겔", imageUrl: "/maps/rotation/erangel.webp" },
      { name: "미라마", imageUrl: "/maps/rotation/miramar.webp" },
      { name: "태이고", imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp" },
      { name: "비켄디", imageUrl: "/maps/rotation/vikendi.webp" },
      { name: "사녹", imageUrl: "https://battlegrounds.party/map/map/Savage/tiles/0/0/0.webp" },
    ],
  },
  {
    weekLabel: "5주 차",
    period: "3.4 ~ 3.10",
    status: "next",
    maps: [
      { name: "에란겔", imageUrl: "/maps/rotation/erangel.webp" },
      { name: "태이고", imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp" },
      { name: "미라마", imageUrl: "/maps/rotation/miramar.webp" },
      { name: "비켄디", imageUrl: "/maps/rotation/vikendi.webp" },
      { name: "데스턴", imageUrl: "/maps/rotation/deston.webp" },
    ],
  },
];

function MapTile({ map, dimmed = false }: { map: WeeklyMapRotationMap; dimmed?: boolean }) {
  return (
    <div
      className={`relative h-16 md:h-20 overflow-hidden rounded-md border border-white/10 ${
        dimmed ? "opacity-70" : ""
      }`}
      style={{
        backgroundImage: `url('${map.imageUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#121212",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <div className="absolute inset-x-2 bottom-1.5">
        <p className="truncate text-sm font-black text-white drop-shadow-md">{map.name}</p>
      </div>
    </div>
  );
}

export default function WeeklyMapRotationWidget() {
  const { language } = useLanguage();
  const currentWeek = WEEKLY_MAP_ROTATION.find((item) => item.status === "current");
  const nextWeek = WEEKLY_MAP_ROTATION.find((item) => item.status === "next");

  if (!currentWeek || !nextWeek) return null;

  const labels =
    language === "en"
      ? {
          title: "Weekly Map Rotation",
          now: "Live",
          thisWeek: "This Week",
          nextWeek: "Next Week",
        }
      : language === "ja"
        ? {
            title: "週間マップローテーション",
            now: "進行中",
            thisWeek: "今週のローテーション",
            nextWeek: "来週のローテーション",
          }
        : language === "zh"
          ? {
              title: "每周地图轮换",
              now: "进行中",
              thisWeek: "本周轮换",
              nextWeek: "下周轮换",
            }
          : {
              title: "주간 맵 로테이션",
              now: "현재 진행 중",
              thisWeek: "이번 주 로테이션",
              nextWeek: "다음 주 로테이션",
            };

  return (
    <section className="mt-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 md:p-5">
      <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white">{labels.title}</h3>

      <div className="mt-3 space-y-4">
        <article className="rounded-xl border border-emerald-400/30 bg-gray-50 dark:bg-dark-base/40 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-green-600 px-2 py-0.5 text-[10px] font-black text-white">
              {labels.now}
            </span>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              [{labels.thisWeek}] {currentWeek.weekLabel} ({currentWeek.period})
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {currentWeek.maps.map((map) => (
              <MapTile key={`${currentWeek.weekLabel}-${map.name}`} map={map} />
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base/30 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
              [{labels.nextWeek}] {nextWeek.weekLabel} ({nextWeek.period})
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {nextWeek.maps.map((map) => (
              <MapTile key={`${nextWeek.weekLabel}-${map.name}`} map={map} dimmed />
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

