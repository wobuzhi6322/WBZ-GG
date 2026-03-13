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
import { useLanguage } from "@/context/LanguageContext";

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
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div>
        <div className="text-sm font-bold text-white">{label}</div>
        <div className="mt-0.5 text-xs text-wbz-mute">{description}</div>
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

function NumberInput(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { label, value, onChange } = props;

  return (
    <label className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-bold text-white">{label}</div>
      <input
        type="number"
        min={30}
        max={3600}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 30)}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
      />
    </label>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const labels = t.adminPage;

  const [settings, setSettings] = useState<AdminSettings>(getDefaultAdminSettings());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState("-");
  const [dbHealth, setDbHealth] = useState<HealthPayload | null>(null);
  const [systemCheck, setSystemCheck] = useState<SystemCheckPayload | null>(null);

  const loadAdminData = useCallback(async () => {
    setSaveState("loading");
    setMessage(labels.loadStatus);

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
        throw new Error(labels.loadFail);
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
      setMessage(error instanceof Error ? error.message : labels.loadFail);
    }
  }, [labels.loadFail, labels.loadStatus]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void loadAdminData();
  }, [loadAdminData, status]);

  const handleSave = async () => {
    setSaveState("saving");
    setMessage(labels.savePending);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const payload = (await response.json()) as AdminSettingsPayload | { error?: string };
      if (!response.ok || !("settings" in payload)) {
        throw new Error(("error" in payload && payload.error) || labels.saveFail);
      }

      setSettings(payload.settings);
      setUpdatedAt(payload.updatedAt || "-");
      setSaveState("success");
      setMessage(labels.saveSuccess);
      window.setTimeout(() => setSaveState("idle"), 1500);
    } catch (error) {
      console.error(error);
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : labels.saveFail);
    }
  };

  const healthBadge = useMemo(() => {
    const score = systemCheck?.healthScore ?? 0;
    if (score >= 85) return labels.healthBadge.ok;
    if (score >= 65) return labels.healthBadge.warn;
    return labels.healthBadge.critical;
  }, [labels.healthBadge, systemCheck?.healthScore]);

  const quickLinks = [
    { href: "/operations", label: labels.links.operations },
    { href: "/ranking", label: labels.links.ranking },
    { href: "/agents", label: labels.links.player },
    { href: "/arsenal", label: labels.links.arsenal },
    { href: "/intel", label: labels.links.intel },
    { href: "/updates", label: labels.links.updates },
  ];

  if (status === "loading") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-wbz-card p-8 text-wbz-mute">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {t.common.loginChecking}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-white/10 bg-wbz-card p-10 text-center">
          <h1 className="mb-2 text-3xl font-black text-white">{labels.loginTitle}</h1>
          <p className="mb-6 text-sm text-wbz-mute">{labels.loginBody}</p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/admin" })}
            className="inline-flex items-center gap-2 rounded-xl bg-wbz-gold px-5 py-3 text-sm font-black text-black transition-colors hover:bg-white"
          >
            <LogIn className="h-4 w-4" />
            {labels.loginButton}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-white md:text-4xl">{labels.title}</h1>
            <p className="mt-1 text-sm text-wbz-mute">{labels.subtitle}</p>
          </div>
          <div className="text-xs text-wbz-mute">
            {labels.updatedAt}: <span className="font-mono text-white">{updatedAt}</span>
          </div>
        </div>
      </section>

      {(saveState === "error" || saveState === "success" || message) && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            saveState === "error"
              ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
              : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {saveState === "error" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-white/10 bg-wbz-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-black text-white">
                <ShieldCheck className="h-4 w-4 text-wbz-gold" />
                {labels.summary}
              </h2>
              <button
                onClick={() => void loadAdminData()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-wbz-mute hover:border-wbz-gold/40 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {labels.refresh}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="text-[11px] text-wbz-mute">{labels.healthScore}</div>
                <div className="text-2xl font-black text-white">{systemCheck?.healthScore ?? "-"}</div>
                <div className="mt-1 text-[11px] text-wbz-mute">{healthBadge}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="text-[11px] text-wbz-mute">{labels.dbStatus}</div>
                <div className="text-2xl font-black text-white">
                  {dbHealth?.supabase?.connected ? labels.connected : labels.disconnected}
                </div>
                <div className="mt-1 text-[11px] text-wbz-mute">{dbHealth?.supabase?.message ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="text-[11px] text-wbz-mute">{labels.healthyModules}</div>
                <div className="text-2xl font-black text-emerald-300">{systemCheck?.summary?.ok ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="text-[11px] text-wbz-mute">{labels.warnModules}</div>
                <div className="text-2xl font-black text-amber-300">
                  {(systemCheck?.summary?.warn ?? 0) + (systemCheck?.summary?.error ?? 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-wbz-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
              <LayoutDashboard className="h-4 w-4 text-wbz-gold" />
              {labels.quickLinks}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold text-white transition-colors hover:border-wbz-gold/40 hover:text-wbz-gold"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-white/10 bg-wbz-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-white">
              <Settings2 className="h-4 w-4 text-wbz-gold" />
              {labels.settings}
            </h2>

            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow
                label={labels.toggles.maintenanceMode.label}
                description={labels.toggles.maintenanceMode.description}
                checked={settings.maintenanceMode}
                onChange={(next) => setSettings((prev) => ({ ...prev, maintenanceMode: next }))}
              />
              <ToggleRow
                label={labels.toggles.hideCommunity.label}
                description={labels.toggles.hideCommunity.description}
                checked={settings.hideCommunity}
                onChange={(next) => setSettings((prev) => ({ ...prev, hideCommunity: next }))}
              />
              <ToggleRow
                label={labels.toggles.disableGacha.label}
                description={labels.toggles.disableGacha.description}
                checked={settings.disableGacha}
                onChange={(next) => setSettings((prev) => ({ ...prev, disableGacha: next }))}
              />
              <ToggleRow
                label={labels.toggles.showDebugOverlay.label}
                description={labels.toggles.showDebugOverlay.description}
                checked={settings.showDebugOverlay}
                onChange={(next) => setSettings((prev) => ({ ...prev, showDebugOverlay: next }))}
              />
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-bold text-white">{labels.siteNotice}</div>
              <textarea
                rows={4}
                value={settings.siteNotice}
                onChange={(event) => setSettings((prev) => ({ ...prev, siteNotice: event.target.value }))}
                placeholder={labels.siteNoticePlaceholder}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <NumberInput
                label={labels.refreshSeconds.leaderboard}
                value={settings.leaderboardRefreshSeconds}
                onChange={(value) => setSettings((prev) => ({ ...prev, leaderboardRefreshSeconds: value }))}
              />
              <NumberInput
                label={labels.refreshSeconds.updates}
                value={settings.updatesRefreshSeconds}
                onChange={(value) => setSettings((prev) => ({ ...prev, updatesRefreshSeconds: value }))}
              />
              <NumberInput
                label={labels.refreshSeconds.mapIntel}
                value={settings.mapIntelRefreshSeconds}
                onChange={(value) => setSettings((prev) => ({ ...prev, mapIntelRefreshSeconds: value }))}
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-wbz-gold px-5 py-3 text-sm font-black text-black transition-colors hover:bg-white"
              >
                <Save className="h-4 w-4" />
                {labels.save}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
