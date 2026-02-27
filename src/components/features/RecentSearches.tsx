"use client";

import { motion } from "framer-motion";
import { Clock, Star } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";

export default function RecentSearches() {
  const { t } = useLanguage();
  const router = useRouter();
  const recentSearches: string[] = [];
  const favoritePlayers = ["My_Account", "Duo_Partner"];

  const handleChipClick = (name: string) => {
    const query = new URLSearchParams({
      platform: "steam",
    });
    router.push(`/profile/${encodeURIComponent(name)}?${query.toString()}`);
  };

  return (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4 mt-4 px-2"
    >
        <div className="flex items-center gap-2 text-xs text-wbz-mute font-mono">
            <Clock className="w-3 h-3" /> {t.hero.recent}
        </div>
        {recentSearches.length === 0 ? (
            <span className="text-xs text-wbz-mute/80 px-2 py-1">최근 검색 없음</span>
        ) : recentSearches.map((name) => (
            <button 
                key={name} 
                onClick={() => handleChipClick(name)}
                className="text-xs text-white/70 hover:text-black hover:bg-wbz-gold bg-wbz-card/50 px-2 py-1 rounded border border-white/5 transition-all duration-200"
            >
                {name}
            </button>
        ))}

        <div className="w-px h-4 bg-white/10 mx-2" />

        <div className="flex items-center gap-2 text-xs text-wbz-gold font-mono">
            <Star className="w-3 h-3" /> {t.hero.favorites}
        </div>
        {favoritePlayers.map((name) => (
            <button 
                key={name} 
                onClick={() => handleChipClick(name)}
                className="text-xs text-white/70 hover:text-black hover:bg-wbz-gold bg-wbz-card/50 px-2 py-1 rounded border border-white/5 transition-all duration-200"
            >
                {name}
            </button>
        ))}
    </motion.div>
  );
}
