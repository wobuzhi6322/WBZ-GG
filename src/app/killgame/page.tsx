"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dice6, Plus, Target, Trophy } from "lucide-react";

interface TeamScore {
  team: string;
  kills: number;
  chickens: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const MAX_TEAMS = 16;

export default function KillgamePage() {
  const [teams, setTeams] = useState<string[]>(["A팀", "B팀", "C팀", "D팀"]);
  const [newTeam, setNewTeam] = useState("");
  const [pickedTeam, setPickedTeam] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [ballPos, setBallPos] = useState({ x: 12, y: 20 });
  const spinTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const [options, setOptions] = useState({
    useKillPoint: true,
    useChickenPoint: true,
    useTotalPoint: true,
    useTeamValidation: true,
  });
  const [pointConfig, setPointConfig] = useState({
    killPoint: 1,
    chickenPoint: 10,
    bonusPoint: 0,
  });
  const [rows, setRows] = useState<TeamScore[]>([
    { team: "A팀", kills: 0, chickens: 0 },
    { team: "B팀", kills: 0, chickens: 0 },
    { team: "C팀", kills: 0, chickens: 0 },
    { team: "D팀", kills: 0, chickens: 0 },
  ]);

  const stopSpin = () => {
    if (spinTimerRef.current) {
      window.clearInterval(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    setSpinning(false);
  };

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) {
        window.clearInterval(spinTimerRef.current);
      }
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
      }
    };
  }, []);

  const runPinball = () => {
    if (spinning || teams.length < 2) return;

    setSpinning(true);
    setPickedTeam(null);

    spinTimerRef.current = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % teams.length);
      setBallPos((prev) => ({
        x: clamp(prev.x + (Math.random() * 26 - 13), 5, 95),
        y: clamp(prev.y + (Math.random() * 22 - 11), 6, 92),
      }));
    }, 90);

    stopTimerRef.current = window.setTimeout(() => {
      const finalIndex = Math.floor(Math.random() * teams.length);
      setActiveIndex(finalIndex);
      setPickedTeam(teams[finalIndex]);
      setBallPos({
        x: clamp(8 + finalIndex * (80 / Math.max(1, teams.length - 1)), 6, 94),
        y: 86,
      });
      stopSpin();
    }, 2600);
  };

  const addTeam = () => {
    const trimmed = newTeam.trim();
    if (!trimmed) return;
    if (teams.includes(trimmed)) return;

    setTeams((prev) => [...prev, trimmed].slice(0, MAX_TEAMS));
    setRows((prev) => [...prev, { team: trimmed, kills: 0, chickens: 0 }].slice(0, MAX_TEAMS));
    setNewTeam("");
  };

  const totals = useMemo(() => {
    return rows.map((row) => {
      const killScore = options.useKillPoint ? row.kills * pointConfig.killPoint : 0;
      const chickenScore = options.useChickenPoint ? row.chickens * pointConfig.chickenPoint : 0;
      const total = options.useTotalPoint ? killScore + chickenScore + pointConfig.bonusPoint : 0;
      return {
        ...row,
        killScore,
        chickenScore,
        total,
      };
    });
  }, [rows, options, pointConfig]);

  const sortedTotals = useMemo(() => {
    return [...totals].sort((a, b) => b.total - a.total || b.kills - a.kills);
  }, [totals]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-8">
        <h1 className="text-4xl font-black text-white mb-2">킬내기</h1>
        <p className="text-sm text-wbz-mute">
          팀 뽑기 + 점수 검증 베이스 화면입니다. 시트지 자동 업로드 연동은 다음 단계에서 붙일 수 있게 뼈대를 만들어두었습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black text-white inline-flex items-center gap-2">
            <Dice6 className="w-5 h-5 text-wbz-gold" />
            핀볼 팀 뽑기
          </h2>
          <div className="flex items-center gap-2">
            <input
              value={newTeam}
              onChange={(event) => setNewTeam(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addTeam()}
              placeholder="팀 이름 추가"
              className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-wbz-mute outline-none"
            />
            <button
              type="button"
              onClick={addTeam}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white hover:border-wbz-gold/50"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </div>
        </div>

        <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-black/90 p-3 h-64 overflow-hidden">
          <div className="absolute inset-0">
            {Array.from({ length: 18 }).map((_, idx) => {
              const x = 8 + (idx % 6) * 16;
              const y = 12 + Math.floor(idx / 6) * 20;
              return <span key={`peg-${idx}`} className="absolute w-2 h-2 rounded-full bg-white/25" style={{ left: `${x}%`, top: `${y}%` }} />;
            })}
          </div>

          <motion.div
            animate={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
            transition={{ type: "spring", damping: 12, stiffness: 130 }}
            className="absolute w-5 h-5 rounded-full bg-wbz-gold shadow-[0_0_16px_rgba(250,204,21,0.9)]"
            style={{ transform: "translate(-50%, -50%)" }}
          />

          <div className="absolute left-3 right-3 bottom-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {teams.slice(0, 8).map((team, idx) => (
              <div
                key={`${team}-${idx}`}
                className={`rounded-lg border px-2 py-1.5 text-xs font-bold text-center ${
                  activeIndex === idx ? "border-wbz-gold bg-wbz-gold/15 text-wbz-gold" : "border-white/15 bg-white/5 text-white"
                }`}
              >
                {team}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={spinning || teams.length < 2}
            onClick={runPinball}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-wbz-gold text-black font-bold disabled:opacity-50"
          >
            <Target className="w-4 h-4" />
            {spinning ? "핀볼 진행 중..." : "핀볼 시작"}
          </button>
          <div className="text-sm">
            <span className="text-wbz-mute mr-2">선정 팀:</span>
            <span className="font-black text-white">{pickedTeam ?? "-"}</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <h2 className="text-lg font-black text-white inline-flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-wbz-gold" />
          점수 검증 옵션 (뼈대)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
            <label className="flex items-center justify-between text-sm text-white">
              킬 점수 적용
              <input type="checkbox" checked={options.useKillPoint} onChange={(e) => setOptions((p) => ({ ...p, useKillPoint: e.target.checked }))} />
            </label>
            <label className="flex items-center justify-between text-sm text-white">
              치킨 점수 적용
              <input type="checkbox" checked={options.useChickenPoint} onChange={(e) => setOptions((p) => ({ ...p, useChickenPoint: e.target.checked }))} />
            </label>
            <label className="flex items-center justify-between text-sm text-white">
              토탈 점수 계산
              <input type="checkbox" checked={options.useTotalPoint} onChange={(e) => setOptions((p) => ({ ...p, useTotalPoint: e.target.checked }))} />
            </label>
            <label className="flex items-center justify-between text-sm text-white">
              팀 합산 검증
              <input type="checkbox" checked={options.useTeamValidation} onChange={(e) => setOptions((p) => ({ ...p, useTeamValidation: e.target.checked }))} />
            </label>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 grid grid-cols-3 gap-2">
            <label className="text-xs text-wbz-mute">
              킬 점수
              <input
                type="number"
                value={pointConfig.killPoint}
                onChange={(e) => setPointConfig((p) => ({ ...p, killPoint: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
              />
            </label>
            <label className="text-xs text-wbz-mute">
              치킨 점수
              <input
                type="number"
                value={pointConfig.chickenPoint}
                onChange={(e) => setPointConfig((p) => ({ ...p, chickenPoint: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
              />
            </label>
            <label className="text-xs text-wbz-mute">
              보너스
              <input
                type="number"
                value={pointConfig.bonusPoint}
                onChange={(e) => setPointConfig((p) => ({ ...p, bonusPoint: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
              />
            </label>
            <button type="button" disabled className="col-span-3 mt-1 rounded border border-dashed border-white/20 py-2 text-xs text-wbz-mute">
              시트지 업로드 연동 (준비중)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-wbz-mute">
              <tr>
                <th className="px-3 py-2 text-left">팀</th>
                <th className="px-3 py-2 text-center">킬</th>
                <th className="px-3 py-2 text-center">치킨</th>
                <th className="px-3 py-2 text-center">킬 점수</th>
                <th className="px-3 py-2 text-center">치킨 점수</th>
                <th className="px-3 py-2 text-center">토탈</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const calc = totals[idx];
                return (
                  <tr key={`${row.team}-${idx}`} className="border-t border-white/10">
                    <td className="px-3 py-2 text-white font-bold">{row.team}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        value={row.kills}
                        onChange={(e) =>
                          setRows((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], kills: Number(e.target.value) || 0 };
                            return next;
                          })
                        }
                        className="w-16 text-center rounded border border-white/15 bg-black/30 text-white px-1 py-1"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        value={row.chickens}
                        onChange={(e) =>
                          setRows((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], chickens: Number(e.target.value) || 0 };
                            return next;
                          })
                        }
                        className="w-16 text-center rounded border border-white/15 bg-black/30 text-white px-1 py-1"
                      />
                    </td>
                    <td className="px-3 py-2 text-center text-cyan-200">{calc.killScore}</td>
                    <td className="px-3 py-2 text-center text-amber-200">{calc.chickenScore}</td>
                    <td className="px-3 py-2 text-center font-black text-white">{calc.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-wbz-mute">
          검증 결과 미리보기: {options.useTeamValidation ? `${sortedTotals[0]?.team ?? "-"} 선두` : "팀 검증 옵션 꺼짐"}
        </div>
      </section>
    </div>
  );
}
