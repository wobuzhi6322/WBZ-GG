"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, RefreshCw, Server, Wifi, WifiOff } from "lucide-react";

interface StatusPayload {
  checkedAt: string;
  state: "online" | "degraded" | "down";
  message: string;
  latencyMs: number;
  usagePercent: number;
  usageAveragePercent: number;
  errorRatePercent: number;
  latencyAverageMs: number;
  responseStatus: number;
  gateway: {
    pop: string | null;
    requestId: string | null;
    cacheTrace: string | null;
  };
}

function stateBadgeClass(state: StatusPayload["state"]): string {
  if (state === "online") return "border-emerald-300/40 bg-emerald-500/10 text-emerald-200";
  if (state === "degraded") return "border-amber-300/40 bg-amber-500/10 text-amber-200";
  return "border-rose-300/40 bg-rose-500/10 text-rose-200";
}

function stateLabel(state: StatusPayload["state"]): string {
  if (state === "online") return "정상";
  if (state === "degraded") return "혼잡";
  return "장애";
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function PubgServerStatusPanel() {
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    setError("");

    try {
      const response = await fetch("/api/pubg-server-status", { cache: "no-store" });
      const data = (await response.json()) as StatusPayload | { error?: string };
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "서버 상태를 불러오지 못했습니다.");
      }
      setPayload(data as StatusPayload);
    } catch (fetchError) {
      console.error(fetchError);
      setPayload(null);
      setError("PUBG 서버 상태 조회에 실패했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = window.setInterval(() => {
      fetchStatus(true);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [fetchStatus]);

  const usageBarClass = useMemo(() => {
    if (!payload) return "from-zinc-500 to-zinc-300";
    if (payload.usagePercent >= 85) return "from-rose-500 to-red-300";
    if (payload.usagePercent >= 65) return "from-amber-500 to-yellow-300";
    return "from-emerald-500 to-emerald-200";
  }, [payload]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex items-center gap-2 text-sm text-wbz-mute">
          <RefreshCw className="w-4 h-4 animate-spin" />
          PUBG 서버 상태를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-5">
        <div className="flex items-center gap-2 text-sm text-rose-200">
          <AlertTriangle className="w-4 h-4" />
          {error || "서버 상태 데이터가 없습니다."}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-black text-white inline-flex items-center gap-2">
          <Server className="w-4 h-4 text-wbz-gold" />
          PUBG 실시간 서버 상태
        </h3>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-bold ${stateBadgeClass(payload.state)}`}>
          {payload.state === "down" ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          {stateLabel(payload.state)}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-3">
        <div className="flex items-center justify-between text-[11px] text-wbz-mute mb-1.5">
          <span>서버 사용량 (추정)</span>
          <span>{payload.usagePercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${usageBarClass}`} style={{ width: `${payload.usagePercent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
          <div className="text-wbz-mute">지연</div>
          <div className="font-bold text-white">{payload.latencyMs}ms</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
          <div className="text-wbz-mute">평균 지연</div>
          <div className="font-bold text-white">{payload.latencyAverageMs}ms</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
          <div className="text-wbz-mute">오류율</div>
          <div className="font-bold text-white">{payload.errorRatePercent}%</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
          <div className="text-wbz-mute">Gateway POP</div>
          <div className="font-bold text-white">{payload.gateway.pop ?? "-"}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-wbz-mute">
        <span>응답 코드 {payload.responseStatus}</span>
        <span className="inline-flex items-center gap-1">
          <Activity className={`w-3 h-3 ${refreshing ? "animate-pulse text-wbz-gold" : ""}`} />
          갱신 {formatTime(payload.checkedAt)}
        </span>
      </div>
    </div>
  );
}
