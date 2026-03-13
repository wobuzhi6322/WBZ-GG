"use client";

import { useLanguage } from "@/context/LanguageContext";

interface RotationMapCard {
  id: string;
  nameKey: "erangel" | "taego" | "miramar" | "paramo" | "rondo";
  imageUrl: string;
}

interface RotationSection {
  titleKey: "normalMatch" | "rankedMatch";
  subtitleKey: "normalSubtitle" | "rankedSubtitle";
  tone: "primary" | "secondary";
  maps: RotationMapCard[];
}

const NORMAL_MATCH_ROTATION: RotationSection = {
  titleKey: "normalMatch",
  subtitleKey: "normalSubtitle",
  tone: "primary",
  maps: [
    { id: "erangel", nameKey: "erangel", imageUrl: "/maps/rotation/erangel.webp" },
    { id: "taego", nameKey: "taego", imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp" },
    { id: "miramar", nameKey: "miramar", imageUrl: "/maps/rotation/miramar.webp" },
    { id: "paramo", nameKey: "paramo", imageUrl: "https://battlegrounds.party/map/map/Chimera/tiles/0/0/0.webp" },
    { id: "rondo", nameKey: "rondo", imageUrl: "/maps/rotation/rondo.webp" },
  ],
};

const RANKED_MATCH_ROTATION: RotationSection = {
  titleKey: "rankedMatch",
  subtitleKey: "rankedSubtitle",
  tone: "secondary",
  maps: [
    { id: "erangel", nameKey: "erangel", imageUrl: "/maps/rotation/erangel.webp" },
    { id: "miramar", nameKey: "miramar", imageUrl: "/maps/rotation/miramar.webp" },
    { id: "taego", nameKey: "taego", imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp" },
    { id: "rondo", nameKey: "rondo", imageUrl: "/maps/rotation/rondo.webp" },
  ],
};

const ROTATION_SECTIONS = [NORMAL_MATCH_ROTATION, RANKED_MATCH_ROTATION] as const;

function MapTile({ mapName, imageUrl, dimmed = false }: { mapName: string; imageUrl: string; dimmed?: boolean }) {
  return (
    <div
      className={`relative h-16 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 md:h-20 ${dimmed ? "opacity-80" : ""}`}
      style={{
        backgroundImage: `url('${imageUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#121212",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-x-3 bottom-2">
        <p className="truncate text-sm font-black text-white drop-shadow-md">{mapName}</p>
      </div>
    </div>
  );
}

export default function WeeklyMapRotationWidget() {
  const { t } = useLanguage();
  const labels = t.weeklyMapRotation;

  return (
    <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-dark-surface md:p-5">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h3 className="text-base font-black text-gray-900 dark:text-white md:text-lg">{labels.title}</h3>
        <p className="text-[11px] text-wbz-mute">{labels.source}</p>
      </div>

      <div className="mt-3 space-y-4">
        {ROTATION_SECTIONS.map((section) => {
          const title = labels[section.titleKey];
          const subtitle = labels[section.subtitleKey];

          return (
            <article
              key={title}
              className={`rounded-xl border p-3 ${
                section.tone === "primary"
                  ? "border-emerald-400/25 bg-gray-50 dark:bg-dark-base/40"
                  : "border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-dark-base/30"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-gray-900 dark:text-gray-100">{title}</p>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                    section.tone === "primary"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300"
                  }`}
                >
                  {subtitle}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {section.maps.map((map) => (
                  <MapTile
                    key={`${title}-${map.id}`}
                    mapName={labels.maps[map.nameKey]}
                    imageUrl={map.imageUrl}
                    dimmed={section.tone === "secondary"}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
