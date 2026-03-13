"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Crosshair, Loader2, LogIn, LogOut, ShieldAlert, UserCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/supabase";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { user, loading, logout } = useSupabaseAuth();
  const { t } = useLanguage();
  const labels = t.loginPage;

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isLoggedOutNotice = useMemo(() => searchParams.get("logout") === "1", [searchParams]);
  const authError = useMemo(() => searchParams.get("error"), [searchParams]);

  const profileName =
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (user?.email ? user.email.split("@")[0] : labels.noName);
  const profileImage = typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 z-10 bg-wbz-dark/90" />
        <Image
          src="https://images.unsplash.com/photo-1542261777-4badfa41ed47?q=80&w=2000&auto=format&fit=crop"
          fill
          className="object-cover blur-sm grayscale"
          alt={labels.backgroundAlt}
          priority
        />
      </div>

      {(isSigningIn || isSigningOut || loading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-wbz-gold/30 bg-zinc-950/95 p-6 text-center">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-wbz-gold" />
            <p className="text-lg font-black text-white">
              {isSigningOut ? labels.signOutTitle : labels.processingTitle}
            </p>
            <p className="mt-1 text-xs text-wbz-mute">{labels.processingBody}</p>
          </div>
        </div>
      )}

      <div className="relative z-20 w-full max-w-md p-8">
        {isLoggedOutNotice && (
          <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {labels.loggedOutNotice}
          </div>
        )}

        {authError && (
          <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {labels.authError}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-wbz-card/60 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-wbz-gold/50 bg-wbz-gold/10">
              <Crosshair className="h-8 w-8 text-wbz-gold" />
            </div>
          </div>

          <h1 className="mb-2 text-3xl font-black tracking-tighter text-white">{labels.title}</h1>
          <p className="mb-8 text-sm font-mono text-wbz-mute">{labels.subtitle}</p>

          {user ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-left">
                <p className="mb-2 text-xs text-wbz-mute">{labels.currentUser}</p>
                <div className="flex items-center gap-3">
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt={profileName}
                      width={44}
                      height={44}
                      className="rounded-lg border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/40">
                      <UserCircle2 className="h-6 w-6 text-wbz-mute" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{profileName}</p>
                    <p className="truncate text-xs text-wbz-mute">{user.email ?? "-"}</p>
                  </div>
                </div>
              </div>

              <Link
                href="/me"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-wbz-gold py-3 font-black text-black transition-colors hover:bg-white"
              >
                <UserCircle2 className="h-4 w-4" />
                {labels.viewProfile}
              </Link>

              <button
                onClick={handleSignOut}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 font-bold text-white transition-colors hover:border-red-400 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                {t.common.logout}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-4 font-bold text-black transition-colors duration-300 hover:bg-wbz-gold disabled:opacity-60"
                disabled={isSigningIn}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                  />
                </svg>
                <LogIn className="h-4 w-4" />
                {labels.googleLogin}
              </button>
            </div>
          )}

          <div className="mt-8 border-t border-white/5 pt-6">
            <div className="flex items-center justify-center gap-2 font-mono text-xs text-red-500">
              <ShieldAlert className="h-3 w-3" />
              {labels.security}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs text-wbz-mute transition-colors hover:text-white">
            {labels.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
