"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Loader2, RefreshCw, Timer, Trophy } from "lucide-react";

type Mode = "normal" | "competitive";

interface DaekkollerEntry {
  rank: number;
  name: string;
  mode: Mode;
  score: number;
  avgPlacement: number;
  avgKills: number;
  avgDamage: number;
  avgSurvivalSec: number;
  sampleMatches: number;
  maps: string[];
}

interface DaekkollerPayload {
  category: "대꼴러";
  mode: Mode;
  title: string;
  rules: {
    placement: string;
    kills: string;
    damage: string;
    survival: string;
    maps: string;
  };
  updatedAt: string;
  entries: DaekkollerEntry[];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(seconds: number): string {
  const minute = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${minute}분 ${sec}초`;
}

export default function DaekkollerPage() {
  const [mode, setMode] = useState<Mode>("normal");
  const [payload, setPayload] = useState<DaekkollerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/daekkoller?mode=${mode}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const data = (await response.json()) as DaekkollerPayload;
      setPayload(data);
    } catch (fetchError) {
      console.error(fetchError);
      setPayload(null);
      setError("대꼴러 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const description = useMemo(() => {
    if (mode === "normal") {
      return "일반전 기준: 순위 18~25 / 킬 0.7~2 / 평균 딜량 90~230 / 평균 생존 10초~4분 (ASIA)";
    }
    return "경쟁전 기준: 순위 14~20 / 킬 0.7~2 / 평균 딜량 90~230 / 평균 생존 10초~4분 (ASIA)";
  }, [mode]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-8 mb-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2 flex items-center gap-2">
              <Flame className="w-8 h-8 text-orange-400" />
              대꼴러
            </h1>
            <p className="text-wbz-mute">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("normal")}
              className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                mode === "normal"
                  ? "bg-wbz-gold text-black border-wbz-gold"
                  : "bg-white/5 text-wbz-mute border-white/10 hover:border-white/30"
              }`}
            >
              일반게임
            </button>
            <button
              type="button"
              onClick={() => setMode("competitive")}
              className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                mode === "competitive"
                  ? "bg-wbz-gold text-black border-wbz-gold"
                  : "bg-white/5 text-wbz-mute border-white/10 hover:border-white/30"
              }`}
            >
              경쟁전
            </button>
            <button
              type="button"
              onClick={fetchBoard}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-wbz-mute hover:text-white hover:border-wbz-gold/40"
            >
              <RefreshCw className="w-4 h-4" />
              갱신
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="w-full h-64 flex items-center justify-center bg-wbz-card border border-white/5 rounded-xl">
          <Loader2 className="w-8 h-8 text-wbz-gold animate-spin" />
          <span className="ml-2 text-wbz-mute text-xs">대꼴러 집계 중...</span>
        </div>
      ) : error ? (
        <div className="bg-wbz-card border border-red-500/30 rounded-2xl p-10 text-center text-red-300">{error}</div>
      ) : !payload ? (
        <div className="bg-wbz-card border border-white/5 rounded-2xl p-10 text-center text-wbz-mute">데이터가 없습니다.</div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-wbz-card border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-wbz-mute mb-1">카테고리</div>
              <div className="text-sm font-black text-white">{payload.category}</div>
            </div>
            <div className="bg-wbz-card border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-wbz-mute mb-1">순위 필터</div>
              <div className="text-sm font-black text-white">{payload.rules.placement}</div>
            </div>
            <div className="bg-wbz-card border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-wbz-mute mb-1">킬/딜 필터</div>
              <div className="text-sm font-black text-white">K {payload.rules.kills} / D {payload.rules.damage}</div>
            </div>
            <div className="bg-wbz-card border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-wbz-mute mb-1">생존 필터</div>
              <div className="text-sm font-black text-white">{payload.rules.survival}</div>
            </div>
            <div className="bg-wbz-card border border-white/10 rounded-xl p-3">
              <div className="text-[10px] text-wbz-mute mb-1">업데이트</div>
              <div className="text-sm font-black text-white">{formatDate(payload.updatedAt)}</div>
            </div>
          </div>

          <div className="overflow-x-auto bg-wbz-card border border-white/5 rounded-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-xs text-wbz-mute uppercase tracking-wider">
                  <th className="p-4 w-16 text-center">#</th>
                  <th className="p-4">PLAYER</th>
                  <th className="p-4 text-center">SCORE</th>
                  <th className="p-4 text-center">AVG 순위</th>
                  <th className="p-4 text-center">AVG 킬</th>
                  <th className="p-4 text-center">AVG 딜량</th>
                  <th className="p-4 text-center">AVG 생존</th>
                  <th className="p-4 text-center">샘플</th>
                  <th className="p-4 text-center">맵</th>
                </tr>
              </thead>
              <tbody className="text-white text-sm">
                {payload.entries.map((entry, index) => (
                  <motion.tr
                    key={entry.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 text-center font-black text-wbz-gold">
                      {entry.rank <= 3 ? <Trophy className="w-4 h-4 inline-block mr-1 text-yellow-400" /> : null}
                      {entry.rank}
                    </td>
                    <td className="p-4 font-bold">{entry.name}</td>
                    <td className="p-4 text-center font-black text-orange-300">{entry.score.toFixed(2)}</td>
                    <td className="p-4 text-center">{entry.avgPlacement.toFixed(1)}</td>
                    <td className="p-4 text-center">{entry.avgKills.toFixed(2)}</td>
                    <td className="p-4 text-center">{entry.avgDamage.toFixed(1)}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1">
                        <Timer className="w-3.5 h-3.5 text-wbz-mute" />
                        {formatDuration(entry.avgSurvivalSec)}
                      </span>
                    </td>
                    <td className="p-4 text-center">{entry.sampleMatches}</td>
                    <td className="p-4 text-center text-xs text-wbz-mute">{entry.maps.join(", ")}</td>
                  </motion.tr>
                ))}
                {payload.entries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-wbz-mute">
                      조건에 맞는 플레이어가 없습니다. 잠시 후 다시 갱신해 주세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
