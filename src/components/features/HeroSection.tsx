"use client";

import { ChevronDown, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { isValidPlayerSearchInput, sanitizePlayerSearchInput } from "@/lib/requestValidation";

interface PlayerSuggestionResponse {
  suggestions?: string[];
}

const PLATFORM_OPTIONS = [
  { label: "STEAM", value: "steam" },
  { label: "KAKAO", value: "kakao" },
] as const;

const SUGGESTION_REGION_OPTIONS = [
  { label: "KR", value: "pc-as" },
  { label: "SEA", value: "pc-sea" },
  { label: "NA", value: "pc-na" },
  { label: "EU", value: "pc-eu" },
  { label: "KAKAO", value: "pc-kakao" },
] as const;

export default function HeroSection() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [platform, setPlatform] = useState<"steam" | "kakao">("steam");
  const [query, setQuery] = useState("");
  const [suggestRegion, setSuggestRegion] = useState<string>("pc-as");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const moveToProfile = (target?: string) => {
    const candidate = sanitizePlayerSearchInput(target ?? query);
    if (!candidate || !isValidPlayerSearchInput(candidate)) return;

    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    const search = new URLSearchParams({ platform });
    router.push(`/profile/${encodeURIComponent(candidate)}?${search.toString()}`);
  };

  const handleSuggestionSelect = (name: string) => {
    setQuery(name);
    moveToProfile(name);
  };

  useEffect(() => {
    if (platform === "kakao") {
      setSuggestRegion("pc-kakao");
      return;
    }
    if (suggestRegion === "pc-kakao") {
      setSuggestRegion("pc-as");
    }
  }, [platform, suggestRegion]);

  useEffect(() => {
    const trimmed = sanitizePlayerSearchInput(query);
    if (trimmed.length < 3 || !isValidPlayerSearchInput(trimmed)) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      setSuggestionLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSuggestionLoading(true);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: "10",
          region: suggestRegion,
        });
        const response = await fetch(`/api/player-suggestions?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json()) as PlayerSuggestionResponse;
        const names = Array.isArray(payload.suggestions) ? payload.suggestions : [];

        setSuggestions(names);
        setSuggestionsOpen(names.length > 0);
        setActiveSuggestionIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load nickname suggestions:", error);
          setSuggestions([]);
          setSuggestionsOpen(false);
          setActiveSuggestionIndex(-1);
        }
      } finally {
        setSuggestionLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, suggestRegion]);

  const regionOptions = useMemo(() => {
    if (platform === "kakao") {
      return SUGGESTION_REGION_OPTIONS.filter((option) => option.value === "pc-kakao");
    }
    return SUGGESTION_REGION_OPTIONS.filter((option) => option.value !== "pc-kakao");
  }, [platform]);

  const uiText = useMemo(() => {
    if (language === "ko") {
      return {
        platform: "플랫폼",
        server: "서버",
        platformAria: "플랫폼 선택",
        serverAria: "검색 서버 선택",
        searchAria: "닉네임 검색",
        searching: "닉네임을 검색 중입니다...",
        emptySuggestion: "일치하는 닉네임이 없습니다.",
        suggestionGuide: "닉네임을 클릭하면 바로 검색됩니다. (최대 10개)",
      };
    }
    if (language === "ja") {
      return {
        platform: "プラットフォーム",
        server: "サーバー",
        platformAria: "プラットフォーム選択",
        serverAria: "サーバー選択",
        searchAria: "ニックネーム検索",
        searching: "ニックネームを検索中...",
        emptySuggestion: "一致するニックネームがありません。",
        suggestionGuide: "ニックネームをクリックすると即検索します。(最大10件)",
      };
    }
    if (language === "zh") {
      return {
        platform: "平台",
        server: "服务器",
        platformAria: "选择平台",
        serverAria: "选择服务器",
        searchAria: "搜索昵称",
        searching: "正在搜索昵称...",
        emptySuggestion: "没有匹配的昵称。",
        suggestionGuide: "点击昵称可立即搜索。（最多10条）",
      };
    }
    return {
      platform: "Platform",
      server: "Server",
      platformAria: "Select platform",
      serverAria: "Select server",
      searchAria: "Search nickname",
      searching: "Searching nicknames...",
      emptySuggestion: "No matching nickname found.",
      suggestionGuide: "Click a nickname to search instantly. (up to 10)",
    };
  }, [language]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const target = event.target as Node | null;
      if (target && containerRef.current.contains(target)) return;
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestionIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (suggestionsOpen && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        handleSuggestionSelect(suggestions[activeSuggestionIndex]);
        return;
      }
      moveToProfile();
    }
  };

  const handleInputFocus = () => {
    if (query.trim().length >= 3 && suggestions.length > 0) {
      setSuggestionsOpen(true);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full relative z-10 mb-8"
    >
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-wbz-gold to-orange-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />

        <div className="relative grid grid-cols-1 sm:grid-cols-[102px_102px_1fr] gap-2">
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

          <div className="rounded-lg border border-white/10 bg-wbz-card/80 px-3 py-2.5 shadow-2xl backdrop-blur-xl">
            <div className="text-[10px] text-wbz-mute mb-1">{uiText.server}</div>
            <div className="relative">
              <select
                value={suggestRegion}
                onChange={(event) => setSuggestRegion(event.target.value)}
                disabled={platform === "kakao"}
                className={`w-full appearance-none bg-transparent text-sm font-bold pr-5 outline-none ${
                  platform === "kakao" ? "text-wbz-mute cursor-not-allowed" : "text-white"
                }`}
                aria-label={uiText.serverAria}
              >
                {regionOptions.map((option) => (
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
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              autoComplete="off"
              className="block w-full pl-11 pr-14 py-4 bg-wbz-card/80 border border-white/10 rounded-lg text-lg text-white placeholder-wbz-mute focus:ring-2 focus:ring-wbz-gold/50 focus:border-transparent outline-none transition-all shadow-2xl backdrop-blur-xl"
              placeholder={t.hero.placeholder}
            />

            <div className="absolute inset-y-0 right-2 flex items-center">
              <button
                type="button"
                onClick={() => moveToProfile()}
                className="bg-wbz-gold text-black font-bold text-sm w-9 h-9 rounded hover:bg-white transition-colors inline-flex items-center justify-center"
                aria-label={uiText.searchAria}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {(suggestionsOpen || suggestionLoading) && (
          <div className="absolute z-30 mt-2 left-0 sm:left-[220px] right-0 rounded-xl border border-white/10 bg-zinc-950/95 shadow-2xl overflow-hidden">
            {suggestionLoading ? (
              <div className="px-4 py-3 text-xs text-wbz-mute">{uiText.searching}</div>
            ) : suggestions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-wbz-mute">{uiText.emptySuggestion}</div>
            ) : (
              <>
                <div className="px-4 py-2 text-[11px] text-wbz-mute border-b border-white/10">
                  {uiText.suggestionGuide}
                </div>
                <ul className="max-h-80 overflow-y-auto">
                  {suggestions.map((name, index) => (
                    <li key={`${name}-${index}`}>
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleSuggestionSelect(name);
                        }}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                          activeSuggestionIndex === index
                            ? "bg-wbz-gold/20 text-white"
                            : "text-white/90 hover:bg-white/10"
                        }`}
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <div className="absolute -bottom-6 right-0">
        <span className="text-[10px] font-mono text-wbz-mute bg-white/5 px-2 py-0.5 rounded border border-white/5">
          {t.hero.search_helper}
        </span>
      </div>
    </motion.div>
  );
}

