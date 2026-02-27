"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ServerCrash, ShieldCheck } from "lucide-react";

type ModuleStatus = "ok" | "warn" | "error";

interface ModuleCheck {
  key: string;
  name: string;
  status: ModuleStatus;
  message: string;
  latencyMs: number;
  meta?: Record<string, unknown>;
}

interface SystemCheckPayload {
  checkedAt: string;
  healthScore: number;
  summary: {
    ok: number;
    warn: number;
    error: number;
  };
  modules: ModuleCheck[];
  nextActions: string[];
}

function toStatusLabel(status: ModuleStatus): string {
  if (status === "ok") return "정상";
  if (status === "warn") return "주의";
  return "오류";
}

function toStatusClass(status: ModuleStatus): string {
  if (status === "ok") return "border-emerald-300/40 bg-emerald-500/10 text-emerald-200";
  if (status === "warn") return "border-amber-300/40 bg-amber-500/10 text-amber-200";
  return "border-rose-300/40 bg-rose-500/10 text-rose-200";
}

function toHealthClass(score: number): string {
  if (score >= 90) return "text-emerald-300";
  if (score >= 70) return "text-amber-300";
  return "text-rose-300";
}

function formatCheckedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function SystemCheckPanel() {
  const [payload, setPayload] = useState<SystemCheckPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSystemCheck = useCallback(async () => {
    try {
      const response = await fetch("/api/system-check", { cache: "no-store" });
      const data = (await response.json()) as SystemCheckPayload;
      if (!response.ok) {
        throw new Error("System check API failed.");
      }
      setPayload(data);
      setError("");
    } catch (fetchError) {
      console.error(fetchError);
      setError("시스템 점검 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemCheck();
    const timer = setInterval(fetchSystemCheck, 1000 * 60);
    return () => clearInterval(timer);
  }, [fetchSystemCheck]);

  const worstStatus = useMemo<ModuleStatus>(() => {
    if (!payload?.modules?.length) return "warn";
    if (payload.modules.some((item) => item.status === "error")) return "error";
    if (payload.modules.some((item) => item.status === "warn")) return "warn";
    return "ok";
  }, [payload?.modules]);

  return (
    <section className="bg-wbz-card border border-white/5 rounded-2xl p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-wbz-gold" />
          <h2 className="text-xl font-black text-white">SYSTEM CHECK</h2>
          <span className={`text-[10px] font-black px-2 py-1 rounded border ${toStatusClass(worstStatus)}`}>
            {toStatusLabel(worstStatus)}
          </span>
        </div>
        <button
          type="button"
          onClick={fetchSystemCheck}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-wbz-mute hover:text-white hover:border-wbz-gold/40"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          다시 점검
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-wbz-mute">
          시스템 점검 중...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : !payload ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-wbz-mute">
          점검 결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="text-[11px] text-wbz-mute">헬스 점수</div>
              <div className={`text-2xl font-black ${toHealthClass(payload.healthScore)}`}>{payload.healthScore}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="text-[11px] text-wbz-mute">정상</div>
              <div className="text-2xl font-black text-emerald-300">{payload.summary.ok}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="text-[11px] text-wbz-mute">주의</div>
              <div className="text-2xl font-black text-amber-300">{payload.summary.warn}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-3">
              <div className="text-[11px] text-wbz-mute">오류</div>
              <div className="text-2xl font-black text-rose-300">{payload.summary.error}</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-wbz-mute mb-2">모듈 상태</div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {payload.modules.map((module) => (
                <div key={module.key} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-white truncate">{module.name}</div>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${toStatusClass(module.status)}`}>
                      {toStatusLabel(module.status)}
                    </span>
                  </div>
                  <div className="text-[11px] text-wbz-mute mt-1">{module.message}</div>
                  {typeof module.meta?.key === "string" && (
                    <div className="text-[10px] text-wbz-mute mt-1 font-mono">KEY: {module.meta.key}</div>
                  )}
                  <div className="text-[10px] text-wbz-mute mt-1 font-mono">{module.latencyMs}ms</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs text-wbz-mute mb-2">자동 개선 제안</div>
            <div className="space-y-1.5">
              {payload.nextActions.map((action, index) => (
                <div key={`action-${index}`} className="text-xs text-white flex items-start gap-2">
                  {worstStatus === "error" ? (
                    <ServerCrash className="w-3.5 h-3.5 text-rose-300 mt-0.5 shrink-0" />
                  ) : worstStatus === "warn" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-300 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 mt-0.5 shrink-0" />
                  )}
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-wbz-mute font-mono">
            마지막 점검: {formatCheckedAt(payload.checkedAt)}
          </div>
        </div>
      )}
    </section>
  );
}
