"use client";

import { Search, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { sanitizePlayerSearchInput } from "@/lib/requestValidation";

const PLATFORM_OPTIONS = [
  { label: "STEAM", value: "steam" },
  { label: "KAKAO", value: "kakao" },
] as const;

export default function HeroSection() {
  const { t } = useLanguage();
  const router = useRouter();

  const [platform, setPlatform] = useState<"steam" | "kakao">("steam");
  const [query, setQuery] = useState("");

  const uiText = useMemo(
    () => ({
      platform: t.hero.platform,
      platformAria: t.hero.platformAria,
      searchAria: t.hero.searchAria,
    }),
    [t.hero]
  );

  const handleSearch = () => {
    const nickname = sanitizePlayerSearchInput(query).trim();
    if (!nickname) return;

    router.push(`/profile/${encodeURIComponent(nickname)}?platform=${encodeURIComponent(platform)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full relative z-10 mb-8"
    >
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-wbz-gold to-orange-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />

        <form
          className="relative grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <div className="rounded-lg border border-white/10 bg-wbz-card/80 px-3 py-2.5 shadow-2xl backdrop-blur-xl">
            <div className="text-[10px] text-wbz-mute mb-1">{uiText.platform}</div>
            <div className="relative">
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value === "kakao" ? "kakao" : "steam")}
                className="w-full appearance-none bg-transparent text-sm font-bold text-white pr-5 outline-none"
                aria-label={uiText.platformAria}
              >
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-zinc-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-wbz-mute" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-wbz-mute group-focus-within:text-wbz-gold transition-colors" />
            </div>

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(sanitizePlayerSearchInput(event.target.value))}
              autoComplete="off"
              className="block w-full pl-11 pr-14 py-4 bg-wbz-card/80 border border-white/10 rounded-lg text-lg text-white placeholder-wbz-mute focus:ring-2 focus:ring-wbz-gold/50 focus:border-transparent outline-none transition-all shadow-2xl backdrop-blur-xl"
              placeholder={t.hero.placeholder}
            />

            <div className="absolute inset-y-0 right-2 flex items-center">
              <button
                type="submit"
                className="bg-wbz-gold text-black font-bold text-sm w-9 h-9 rounded hover:bg-white transition-colors inline-flex items-center justify-center"
                aria-label={uiText.searchAria}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="absolute -bottom-6 right-0">
        <span className="text-[10px] font-mono text-wbz-mute bg-white/5 px-2 py-0.5 rounded border border-white/5">
          {t.hero.search_helper}
        </span>
      </div>
    </motion.div>
  );
}
