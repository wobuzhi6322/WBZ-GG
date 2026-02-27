"use client";

import { useState } from "react";
import Image from "next/image";
import HeroSection from "@/components/features/HeroSection";
import RecentSearches from "@/components/features/RecentSearches";
import WeeklyMapRotationWidget from "@/components/features/WeeklyMapRotationWidget";

const MAIN_LOGO_SRC = "/branding/wbz-main-logo.png";

export default function Home() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="relative min-h-[calc(100vh-120px)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-24 right-8 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,162,0,0.12),transparent_45%)]" />
      </div>

      <section className="container mx-auto max-w-6xl px-4 pb-16 pt-6 md:pt-8">
        <div className="relative overflow-hidden rounded-[30px] border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 p-4 md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,173,51,0.08),rgba(0,0,0,0)_40%,rgba(29,205,254,0.06))]" />

          <div className="relative mx-auto max-w-5xl">
            {!logoFailed ? (
              <Image
                src={MAIN_LOGO_SRC}
                alt="WBZ 메인 로고"
                width={1920}
                height={1080}
                priority
                className="mx-auto h-auto w-[min(100%,760px)] md:w-[min(100%,900px)] max-h-[220px] md:max-h-[300px] select-none object-contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="mx-auto flex min-h-[260px] w-full max-w-5xl items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-black/35 px-5 text-center text-sm text-wbz-mute">
                `public/branding/wbz-main-logo.png` 파일을 넣으면 메인 로고가 표시됩니다.
              </div>
            )}
          </div>

          <div className="relative mx-auto mt-3 max-w-4xl md:mt-4">
            <HeroSection />
            <RecentSearches />
            <WeeklyMapRotationWidget />
          </div>
        </div>
      </section>
    </div>
  );
}
