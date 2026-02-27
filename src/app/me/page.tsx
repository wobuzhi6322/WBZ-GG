"use client";

import Image from "next/image";
import { LogIn, LogOut, RefreshCw, ShieldCheck, UserCircle2 } from "lucide-react";
import { supabase } from "@/supabase";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { hour12: false });
}

export default function MePage() {
  const { user, session, loading, refresh, logout } = useSupabaseAuth();

  const profileName =
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (user?.email ? user.email.split("@")[0] : "이름 없음");
  const profileImage =
    typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "";

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
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="rounded-2xl border border-white/10 bg-wbz-card p-8 flex items-center justify-center gap-2 text-wbz-mute">
          <RefreshCw className="w-4 h-4 animate-spin" />
          로그인 상태 확인 중...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="rounded-2xl border border-white/10 bg-wbz-card p-10 text-center">
          <h1 className="text-2xl font-black text-white mb-2">내 정보</h1>
          <p className="text-sm text-wbz-mute mb-6">로그인 후 계정 정보를 확인할 수 있습니다.</p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
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
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-5">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">내 정보</h1>
        <p className="text-wbz-mute text-sm">현재 로그인된 계정 정보를 표시합니다.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-wbz-card p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-white/10 bg-black/30">
              {profileImage ? (
                <Image src={profileImage} alt="프로필 이미지" fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-wbz-mute">
                  <UserCircle2 className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs text-wbz-mute">로그인 계정</p>
              <p className="text-lg font-black text-white truncate">{profileName}</p>
              <p className="text-xs text-wbz-mute truncate">{user.email ?? "-"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white text-xs font-bold hover:border-wbz-gold/50"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-400/40 bg-red-500/10 text-red-200 text-xs font-bold hover:bg-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-wbz-card p-5">
        <h2 className="text-sm font-black text-white mb-3">세션 정보</h2>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-wbz-mute">사용자 ID</dt>
            <dd className="text-white font-mono break-all text-right">{user.id}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-wbz-mute">인증 제공자</dt>
            <dd className="text-white font-mono">
              {Array.isArray(user.app_metadata?.providers)
                ? user.app_metadata.providers.join(", ")
                : user.app_metadata?.provider ?? "google"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-wbz-mute">계정 생성</dt>
            <dd className="text-white font-mono">{formatDate(user.created_at)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-wbz-mute">최근 로그인</dt>
            <dd className="text-white font-mono">{formatDate(user.last_sign_in_at)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-wbz-mute">세션 만료</dt>
            <dd className="text-white font-mono">
              {session?.expires_at ? formatDate(new Date(session.expires_at * 1000).toISOString()) : "-"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-white/10 bg-wbz-card p-5">
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <ShieldCheck className="w-4 h-4" />
          로그인 상태를 실시간으로 감지하며, 상단 네비게이션 버튼도 자동으로 전환됩니다.
        </div>
      </section>
    </div>
  );
}
