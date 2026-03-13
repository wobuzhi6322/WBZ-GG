"use client";

import Image from "next/image";
import { LogIn, LogOut, RefreshCw, ShieldCheck, UserCircle2 } from "lucide-react";
import { supabase } from "@/supabase";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { useLanguage } from "@/context/LanguageContext";

function getLocale(language: "ko" | "en" | "ja" | "zh"): string {
  if (language === "en") return "en-US";
  if (language === "ja") return "ja-JP";
  if (language === "zh") return "zh-CN";
  return "ko-KR";
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, { hour12: false });
}

export default function MePage() {
  const { user, session, loading, refresh, logout } = useSupabaseAuth();
  const { t, language } = useLanguage();
  const labels = t.mePage;
  const locale = getLocale(language);

  const profileName =
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (user?.email ? user.email.split("@")[0] : labels.noName);
  const profileImage = typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "";

  const handleGoogleSignIn = async () => {
    const redirectOrigin =
      typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${redirectOrigin}/me`,
      },
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-wbz-card p-8 text-wbz-mute">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {labels.loading}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-wbz-card p-10 text-center">
          <h1 className="mb-2 text-2xl font-black text-white">{labels.title}</h1>
          <p className="mb-6 text-sm text-wbz-mute">{labels.loginRequired}</p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="inline-flex items-center gap-2 rounded-xl bg-wbz-gold px-5 py-3 text-sm font-black text-black transition-colors hover:bg-white"
          >
            <LogIn className="h-4 w-4" />
            {labels.googleLogin}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-5 px-4 py-8">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6">
        <h1 className="mb-2 text-3xl font-black text-white md:text-4xl">{labels.title}</h1>
        <p className="text-sm text-wbz-mute">{labels.subtitle}</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-wbz-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-black/30">
              {profileImage ? (
                <Image src={profileImage} alt={profileName} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-wbz-mute">
                  <UserCircle2 className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs text-wbz-mute">{labels.account}</p>
              <p className="truncate text-lg font-black text-white">{profileName}</p>
              <p className="truncate text-xs text-wbz-mute">{user.email ?? "-"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:border-wbz-gold/50"
            >
              <RefreshCw className="h-4 w-4" />
              {labels.refresh}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              {t.common.logout}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-wbz-card p-5">
        <h2 className="mb-3 text-sm font-black text-white">{labels.sessionInfo}</h2>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-wbz-mute">{labels.fields.provider}</dt>
            <dd className="font-mono text-white">
              {Array.isArray(user.app_metadata?.providers)
                ? user.app_metadata.providers.join(", ")
                : user.app_metadata?.provider ?? "google"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-wbz-mute">{labels.fields.createdAt}</dt>
            <dd className="font-mono text-white">{formatDate(user.created_at, locale)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-wbz-mute">{labels.fields.lastSignIn}</dt>
            <dd className="font-mono text-white">{formatDate(user.last_sign_in_at, locale)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-wbz-mute">{labels.fields.expiresAt}</dt>
            <dd className="font-mono text-white">
              {session?.expires_at ? formatDate(new Date(session.expires_at * 1000).toISOString(), locale) : "-"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-white/10 bg-wbz-card p-5">
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          {labels.realtimeHint}
        </div>
      </section>
    </div>
  );
}
