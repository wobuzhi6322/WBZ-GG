"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface ProfileMainTabsProps {
  matchHistoryNode: React.ReactNode;
  weaponStatsNode: React.ReactNode;
  encountersNode: React.ReactNode;
}

export default function ProfileMainTabs({
  matchHistoryNode,
  weaponStatsNode,
  encountersNode,
}: ProfileMainTabsProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"matches" | "weapons" | "encounters">("matches");
  const labels = t.profileTabs;

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-6 border-b border-gray-200/50 px-2 dark:border-white/10 lg:px-0">
        <button
          onClick={() => setActiveTab("matches")}
          className={`pb-3 text-lg font-bold transition-all ${
            activeTab === "matches"
              ? "border-b-2 border-yellow-400 text-gray-900 dark:text-white"
              : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
        >
          {labels.matches}
        </button>
        <button
          onClick={() => setActiveTab("weapons")}
          className={`pb-3 text-lg font-bold transition-all ${
            activeTab === "weapons"
              ? "border-b-2 border-yellow-400 text-gray-900 dark:text-white"
              : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
        >
          {labels.weapons}
        </button>
        <button
          onClick={() => setActiveTab("encounters")}
          className={`pb-3 text-lg font-bold transition-all ${
            activeTab === "encounters"
              ? "border-b-2 border-yellow-400 text-yellow-400"
              : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          }`}
        >
          {labels.encounters}
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "matches" && matchHistoryNode}
        {activeTab === "weapons" && weaponStatsNode}
        {activeTab === "encounters" && encountersNode}
      </div>
    </div>
  );
}
