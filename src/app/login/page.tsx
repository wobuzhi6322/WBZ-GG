"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Crosshair, Loader2, LogIn, LogOut, ShieldAlert, UserCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/supabase";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { user, loading, logout } = useSupabaseAuth();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isLoggedOutNotice = useMemo(() => searchParams.get("logout") === "1", [searchParams]);
  const authError = useMemo(() => searchParams.get("error"), [searchParams]);

  const profileName =
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (user?.email ? user.email.split("@")[0] : "이름 없음");
  const profileImage =
    typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "";

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const redirectOrigin =
        typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectOrigin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Supabase Google login failed:", error);
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-wbz-dark/90 z-10" />
        <Image
          src="https://images.unsplash.com/photo-1542261777-4badfa41ed47?q=80&w=2000&auto=format&fit=crop"
          fill
          className="object-cover filter grayscale blur-sm"
          alt="전술 배경"
          priority
        />
      </div>

      {(isSigningIn || isSigningOut || loading) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl border border-wbz-gold/30 bg-zinc-950/95 p-6 text-center">
            <Loader2 className="w-7 h-7 mx-auto text-wbz-gold animate-spin mb-3" />
            <p className="text-white font-black text-lg">
              {isSigningOut ? "로그아웃 처리 중..." : "인증 처리 중..."}
            </p>
            <p className="text-xs text-wbz-mute mt-1">세션과 사용자 상태를 확인하고 있습니다.</p>
          </div>
        </div>
      )}

      <div className="relative z-20 w-full max-w-md p-8">
        {isLoggedOutNotice && (
          <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            로그아웃이 완료되었습니다.
          </div>
        )}
        {authError && (
          <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        )}

        <div className="bg-wbz-card/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-wbz-gold/10 rounded-full flex items-center justify-center border border-wbz-gold/50">
              <Crosshair className="w-8 h-8 text-wbz-gold" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">WBZ 로그인</h1>
          <p className="text-wbz-mute text-sm mb-8 font-mono">구글 계정 연동 및 사용자 인증</p>

          {user ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-left">
                <p className="text-xs text-wbz-mute mb-2">현재 로그인된 사용자</p>
                <div className="flex items-center gap-3">
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt="프로필"
                      width={44}
                      height={44}
                      className="rounded-lg object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-lg border border-white/10 bg-black/40 flex items-center justify-center">
                      <UserCircle2 className="w-6 h-6 text-wbz-mute" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{profileName}</p>
                    <p className="text-xs text-wbz-mute truncate">{user.email ?? "-"}</p>
                  </div>
                </div>
              </div>

              <Link
                href="/me"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-wbz-gold text-black font-black hover:bg-white transition-colors"
              >
                <UserCircle2 className="w-4 h-4" />내 정보 보기
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-white font-bold hover:border-red-400 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-xl font-bold hover:bg-wbz-gold transition-colors duration-300 disabled:opacity-60"
                disabled={isSigningIn}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                  />
                </svg>
                <LogIn className="w-4 h-4" />
                구글로 로그인
              </button>

              <p className="text-xs text-wbz-mute">로그인 시 계정 정보가 인증 세션에 동기화됩니다.</p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex items-center justify-center gap-2 text-xs text-red-500 font-mono">
              <ShieldAlert className="w-3 h-3" />
              보안 연결 암호화 적용
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-wbz-mute text-xs hover:text-white transition-colors">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
