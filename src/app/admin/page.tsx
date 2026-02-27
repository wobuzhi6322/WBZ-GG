"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LayoutDashboard,
  LogIn,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { getDefaultAdminSettings, type AdminSettings } from "@/lib/adminSettings";

type SaveState = "idle" | "loading" | "saving" | "success" | "error";

interface HealthPayload {
  checkedAt: string;
  supabase?: {
    connected: boolean;
    message: string;
  };
}

interface SystemCheckPayload {
  healthScore: number;
  summary: {
    ok: number;
    warn: number;
    error: number;
  };
}

interface AdminSettingsPayload {
  settings: AdminSettings;
  updatedAt: string;
}

function ToggleRow(props: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const { label, description, checked, onChange } = props;
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 cursor-pointer">
      <div>
        <div className="text-sm font-bold text-white">{label}</div>
        <div className="text-xs text-wbz-mute mt-0.5">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-wbz-gold"
      />
    </label>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();

  const [settings, setSettings] = useState<AdminSettings>(getDefaultAdminSettings());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string>("-");
  const [dbHealth, setDbHealth] = useState<HealthPayload | null>(null);
  const [systemCheck, setSystemCheck] = useState<SystemCheckPayload | null>(null);

  const loadAdminData = useCallback(async () => {
    setSaveState("loading");
    setMessage("관리자 설정과 상태를 불러오는 중...");

    try {
      const [settingsRes, dbRes, systemRes] = await Promise.all([
        fetch("/api/admin/settings", { cache: "no-store" }),
        fetch("/api/db-health", { cache: "no-store" }),
        fetch("/api/system-check", { cache: "no-store" }),
      ]);

      const settingsJson = (await settingsRes.json()) as AdminSettingsPayload;
      const dbJson = (await dbRes.json()) as HealthPayload;
      const systemJson = (await systemRes.json()) as SystemCheckPayload;

      if (!settingsRes.ok) {
        throw new Error("관리자 설정을 불러오지 못했습니다.");
      }

      setSettings(settingsJson.settings);
      setUpdatedAt(settingsJson.updatedAt || "-");
      setDbHealth(dbJson);
      setSystemCheck(systemJson);
      setSaveState("idle");
      setMessage("");
    } catch (error) {
      console.error(error);
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "상태 조회 실패");
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadAdminData();
  }, [status, loadAdminData]);

  const handleSave = async () => {
    setSaveState("saving");
    setMessage("설정을 저장하는 중...");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const payload = (await response.json()) as AdminSettingsPayload | { error?: string };
      if (!response.ok || !("settings" in payload)) {
        throw new Error(("error" in payload && payload.error) || "설정 저장 실패");
      }

      setSettings(payload.settings);
      setUpdatedAt(payload.updatedAt || "-");
      setSaveState("success");
      setMessage("관리자 설정이 저장되었습니다.");
      setTimeout(() => {
        setSaveState("idle");
      }, 1500);
    } catch (error) {
      console.error(error);
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "설정 저장 실패");
    }
  };

  const healthBadge = useMemo(() => {
    const score = systemCheck?.healthScore ?? 0;
    if (score >= 85) return "정상";
    if (score >= 65) return "주의";
    return "점검 필요";
  }, [systemCheck?.healthScore]);

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 max-w-7xl py-8">
        <div className="rounded-2xl border border-white/10 bg-wbz-card p-8 text-wbz-mute flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          로그인 상태 확인 중...
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 max-w-5xl py-8">
        <div className="rounded-2xl border border-white/10 bg-wbz-card p-10 text-center">
          <h1 className="text-3xl font-black text-white mb-2">관리자 콘솔</h1>
          <p className="text-sm text-wbz-mute mb-6">관리 페이지는 로그인 후 접근할 수 있습니다.</p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/admin" })}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-wbz-gold text-black font-black text-sm hover:bg-white transition-colors"
          >
            <LogIn className="w-4 h-4" />
            구글로 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl py-8 space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white">통합 관리자 콘솔</h1>
            <p className="text-sm text-wbz-mute mt-1">서비스 상태 확인, 운영 설정, 빠른 이동을 한 곳에서 관리합니다.</p>
          </div>
          <div className="text-xs text-wbz-mute">
            마지막 갱신: <span className="font-mono text-white">{updatedAt}</span>
          </div>
        </div>
      </section>

      {(saveState === "error" || saveState === "success" || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
            saveState === "error"
              ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
              : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {saveState === "error" ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-wbz-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-wbz-gold" />
                상태 요약
              </h2>
              <button
                onClick={loadAdminData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-wbz-mute hover:text-white hover:border-wbz-gold/40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                새로고침
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="text-[11px] text-wbz-mute">시스템 점수</div>
                <div className="text-2xl font-black text-white">{systemCheck?.healthScore ?? "-"}</div>
                <div className="text-[11px] text-wbz-mute mt-1">{healthBadge}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="text-[11px] text-wbz-mute">DB 상태</div>
                <div className="text-2xl font-black text-white">
                  {dbHealth?.supabase?.connected ? "연결됨" : "미연결"}
                </div>
                <div className="text-[11px] text-wbz-mute mt-1">{dbHealth?.supabase?.message ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="text-[11px] text-wbz-mute">정상 모듈</div>
                <div className="text-2xl font-black text-emerald-300">{systemCheck?.summary?.ok ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="text-[11px] text-wbz-mute">주의/오류</div>
                <div className="text-2xl font-black text-amber-300">
                  {(systemCheck?.summary?.warn ?? 0) + (systemCheck?.summary?.error ?? 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-wbz-card p-5">
            <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-wbz-gold" />
              빠른 이동
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/operations", label: "대시보드" },
                { href: "/ranking", label: "랭킹" },
                { href: "/agents", label: "플레이어" },
                { href: "/arsenal", label: "무기 정보" },
                { href: "/intel", label: "맵 정보" },
                { href: "/updates", label: "업데이트" },
                { href: "/community", label: "커뮤니티" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white hover:border-wbz-gold/50 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-white/10 bg-wbz-card p-5">
          <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-wbz-gold" />
            운영 설정
          </h2>

          <div className="space-y-3">
            <ToggleRow
              label="점검 모드"
              description="활성화하면 관리자 공지와 함께 점검 상태를 노출합니다."
              checked={settings.maintenanceMode}
              onChange={(next) => setSettings((prev) => ({ ...prev, maintenanceMode: next }))}
            />
            <ToggleRow
              label="커뮤니티 메뉴 숨김"
              description="상단 내비게이션에서 커뮤니티 메뉴를 숨깁니다."
              checked={settings.hideCommunity}
              onChange={(next) => setSettings((prev) => ({ ...prev, hideCommunity: next }))}
            />
            <ToggleRow
              label="가챠 기능 제한"
              description="가챠 시뮬레이터 접근을 임시 제한할 때 사용합니다."
              checked={settings.disableGacha}
              onChange={(next) => setSettings((prev) => ({ ...prev, disableGacha: next }))}
            />
            <ToggleRow
              label="디버그 오버레이"
              description="운영자용 디버그 상태 표시를 활성화합니다."
              checked={settings.showDebugOverlay}
              onChange={(next) => setSettings((prev) => ({ ...prev, showDebugOverlay: next }))}
            />

            <label className="block">
              <span className="text-xs text-wbz-mute">운영 공지</span>
              <textarea
                rows={3}
                value={settings.siteNotice}
                onChange={(event) => setSettings((prev) => ({ ...prev, siteNotice: event.target.value }))}
                className="mt-1 w-full glass-input rounded-lg px-3 py-2 text-sm text-white resize-none"
                placeholder="예: 22:00~22:30 점검 예정"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs text-wbz-mute">랭킹 갱신(초)</span>
                <input
                  type="number"
                  min={30}
                  max={3600}
                  value={settings.leaderboardRefreshSeconds}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      leaderboardRefreshSeconds: Number.parseInt(event.target.value || "120", 10),
                    }))
                  }
                  className="mt-1 w-full glass-input rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs text-wbz-mute">업데이트 갱신(초)</span>
                <input
                  type="number"
                  min={30}
                  max={3600}
                  value={settings.updatesRefreshSeconds}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      updatesRefreshSeconds: Number.parseInt(event.target.value || "180", 10),
                    }))
                  }
                  className="mt-1 w-full glass-input rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs text-wbz-mute">맵 정보 갱신(초)</span>
                <input
                  type="number"
                  min={30}
                  max={3600}
                  value={settings.mapIntelRefreshSeconds}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      mapIntelRefreshSeconds: Number.parseInt(event.target.value || "300", 10),
                    }))
                  }
                  className="mt-1 w-full glass-input rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              disabled={saveState === "saving"}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-wbz-gold text-black font-black text-sm hover:bg-white transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              설정 저장
            </button>
            <button
              onClick={() => setSettings(getDefaultAdminSettings())}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-white font-black text-sm hover:border-wbz-gold/50"
            >
              기본값
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
