"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  X,
  LogIn,
  LogOut,
  UserCircle2,
  Loader2,
  Languages,
  ChevronDown,
  MoonStar,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import type { UserProfileRecord } from "@/lib/userCustomProfile";
import type { AdminSettings } from "@/lib/adminSettings";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import type { LanguageType } from "@/data/locales";

const NAV_ITEMS = [
  // { href: "/operations", key: "operations" }, // temporarily hidden for review
  { href: "/ranking", key: "leaderboard" },
  // { href: "/agents", key: "agents" }, // temporarily hidden for review
  { href: "/arsenal", key: "arsenal" },
  { href: "/intel", key: "intel" },
  { href: "/updates", key: "updates" },
  { href: "/daekkoller", key: "daekkoller" },
  // { href: "/killgame", key: "killgame" }, // temporarily hidden for review
  // { href: "/community", key: "community" }, // temporarily hidden for review
] as const;

const LANGUAGE_OPTIONS: Array<{ value: LanguageType; short: string; labelKey: "korean" | "english" | "japanese" | "chinese" }> = [
  { value: "ko", short: "KO", labelKey: "korean" },
  { value: "en", short: "EN", labelKey: "english" },
  { value: "zh", short: "中文", labelKey: "chinese" },
  { value: "ja", short: "日本語", labelKey: "japanese" },
];

export default function Navbar() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [customDisplayName, setCustomDisplayName] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const [adminRuntime, setAdminRuntime] = useState<Pick<AdminSettings, "hideCommunity" | "maintenanceMode" | "siteNotice">>({
    hideCommunity: false,
    maintenanceMode: false,
    siteNotice: "",
  });

  const { data: session, status: nextAuthStatus } = useSession();
  const { user, loading: authLoading, logout } = useSupabaseAuth();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsLanguageMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLanguageMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!languageMenuRef.current) return;
      if (languageMenuRef.current.contains(event.target as Node)) return;
      setIsLanguageMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isLanguageMenuOpen]);

  useEffect(() => {
    if (!session?.user?.email) {
      setCustomDisplayName("");
      return;
    }

    let ignore = false;

    const run = async () => {
      try {
        const response = await fetch("/api/me/profile", { cache: "no-store" });
        const payload = (await response.json()) as { profile?: UserProfileRecord };
        if (!response.ok || !payload.profile || ignore) return;
        setCustomDisplayName(payload.profile.displayName.trim());
      } catch {
        if (!ignore) {
          setCustomDisplayName("");
        }
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, [session?.user?.email]);

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      try {
        const response = await fetch("/api/admin/settings", { cache: "no-store" });
        const payload = (await response.json()) as { settings?: AdminSettings };
        if (!response.ok || !payload.settings || ignore) return;

        setAdminRuntime({
          hideCommunity: payload.settings.hideCommunity,
          maintenanceMode: payload.settings.maintenanceMode,
          siteNotice: payload.settings.siteNotice,
        });
      } catch {
        if (!ignore) {
          setAdminRuntime({
            hideCommunity: false,
            maintenanceMode: false,
            siteNotice: "",
          });
        }
      }
    };

    run();

    return () => {
      ignore = true;
    };
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
    }
  };

  const navItems = useMemo(() => NAV_ITEMS, []);

  const currentLanguageLabel = useMemo(() => {
    const current = LANGUAGE_OPTIONS.find((item) => item.value === language);
    if (!current) return t.common.korean;
    return t.common[current.labelKey];
  }, [language, t.common]);

  const noticeText = adminRuntime.siteNotice.trim();
  const hasBanner = adminRuntime.maintenanceMode || noticeText.length > 0;
  const isLoggedIn = Boolean(session?.user?.email || user?.id);
  const isResolvingAuth = nextAuthStatus === "loading" || authLoading;
  const supabaseUserName =
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name) ||
    (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (user?.email ? user.email.split("@")[0] : "");
  const profileName = customDisplayName || session?.user?.name || supabaseUserName || "-";
  const profileImage =
    session?.user?.image ||
    (typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "");

  return (
    <>
      {isSigningOut && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl border border-wbz-gold/30 bg-zinc-950/95 p-6 text-center">
            <Loader2 className="w-7 h-7 mx-auto text-wbz-gold animate-spin mb-3" />
            <p className="text-gray-900 dark:text-white font-black text-lg">{t.common.signingOutTitle}</p>
            <p className="text-xs text-wbz-mute mt-1">{t.common.signingOutDesc}</p>
          </div>
        </div>
      )}

      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b border-white/5 ${
          isScrolled ? "bg-white/90 dark:bg-wbz-dark/80 backdrop-blur-md py-3.5" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 relative flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center group flex-shrink-0 z-20">
            <Image
              src="/branding/wbz-main-logo.png"
              alt="WBZ"
              width={360}
              height={120}
              priority
              className="h-10 w-auto object-contain"
            />
          </Link>

          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 z-10 px-2">
            <div className="max-w-[640px] overflow-x-auto no-scrollbar">
              <div className="inline-flex items-center gap-1.5 bg-wbz-card/60 p-1 rounded-full border border-white/5 backdrop-blur-sm">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`h-9 inline-flex items-center text-xs font-bold px-3 lg:px-4 rounded-full transition-all duration-200 tracking-tight whitespace-nowrap leading-none ${
                      pathname === item.href
                        ? "bg-wbz-gold text-black shadow-lg shadow-wbz-gold/20"
                        : "text-wbz-mute hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                    }`}
                  >
                    {t.nav[item.key]}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 z-20 ml-auto">
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-wbz-card border border-gray-200 dark:border-white/10 hover:border-wbz-gold/50 hover:text-wbz-gold transition-all duration-200"
              title={`${t.common.theme}: ${theme === "dark" ? t.common.themeDark : t.common.themeLight}`}
              aria-label={`${t.common.theme}: ${theme === "dark" ? t.common.themeDark : t.common.themeLight}`}
            >
              {theme === "dark" ? <MoonStar className="w-4 h-4 text-wbz-gold" /> : <Sun className="w-4 h-4 text-wbz-gold" />}
              <span className="text-xs font-bold text-wbz-mute hidden lg:inline">
                {theme === "dark" ? t.common.themeDark : t.common.themeLight}
              </span>
            </button>

            <div ref={languageMenuRef} className="hidden md:block relative">
              <button
                type="button"
                onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-wbz-card border border-gray-200 dark:border-white/10 hover:border-wbz-gold/50 transition-all duration-200"
                aria-label={t.common.language}
                aria-expanded={isLanguageMenuOpen}
                aria-haspopup="listbox"
              >
                <Languages className="w-4 h-4 text-wbz-mute" />
                <span className="text-xs font-bold text-wbz-mute">{currentLanguageLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-wbz-mute transition-transform duration-200 ${isLanguageMenuOpen ? "rotate-180" : ""}`} />
              </button>

              <div
                className={`absolute right-0 top-full mt-1 w-40 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950/95 p-1.5 shadow-2xl transition-all duration-200 z-30 ${
                  isLanguageMenuOpen ? "opacity-100 pointer-events-auto translate-y-0 scale-100" : "opacity-0 pointer-events-none -translate-y-1 scale-95"
                }`}
                role="listbox"
                aria-label={t.common.language}
              >
                {LANGUAGE_OPTIONS.map((option) => {
                  const isActive = language === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setLanguage(option.value);
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                        isActive ? "bg-wbz-gold text-black" : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="min-w-8 text-[10px] font-black opacity-80">{option.short}</span>
                        <span>{t.common[option.labelKey]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isLoggedIn ? (
              <div className="hidden md:flex items-center gap-2 animate-fadeIn">
                <div className="hidden lg:flex flex-col items-end mr-1">
                  <span className="text-xs text-wbz-mute font-mono">{t.common.player}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white tracking-wide max-w-36 truncate">
                    {profileName}
                  </span>
                </div>

                <Link
                  href="/me"
                  className="p-2 rounded-full bg-wbz-card border border-gray-200 dark:border-white/10 hover:border-wbz-gold/50 hover:text-wbz-gold transition-colors"
                  title={t.common.profile}
                >
                  <UserCircle2 className="w-5 h-5 text-wbz-mute" />
                </Link>

                {session?.user?.email && (
                  <Link
                    href="/admin"
                    className="px-2.5 py-2 rounded-lg bg-wbz-card border border-gray-200 dark:border-white/10 hover:border-wbz-gold/50 text-[11px] font-bold text-wbz-mute hover:text-wbz-gold transition-colors whitespace-nowrap"
                    title={t.common.admin}
                  >
                    {t.common.admin}
                  </Link>
                )}

                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-full bg-wbz-card border border-gray-200 dark:border-white/10 hover:border-red-500 hover:text-red-500 transition-colors group relative"
                  title={t.common.logout}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden absolute inset-0 m-auto opacity-20 group-hover:opacity-0 transition-opacity">
                    {profileImage && (
                      <Image src={profileImage} alt="User" width={32} height={32} className="object-cover" />
                    )}
                  </div>
                  <LogOut className="w-5 h-5 text-wbz-mute group-hover:text-red-500 relative z-10" />
                </button>
              </div>
            ) : isResolvingAuth ? (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-wbz-card border border-gray-200 dark:border-white/10 text-wbz-mute text-xs font-bold">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.common.loginChecking}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-wbz-gold text-black rounded-lg font-bold text-xs hover:bg-white transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {t.common.login}
              </Link>
            )}

            <button
                className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6 text-gray-900 dark:text-white" /> : <Menu className="w-6 h-6 text-gray-900 dark:text-white" />}
            </button>
          </div>
        </div>

        {hasBanner && (
          <div className="max-w-7xl mx-auto px-6 mt-3">
            <div
              className={`rounded-xl border px-3 py-2 text-xs flex items-center justify-between gap-3 ${
                adminRuntime.maintenanceMode
                  ? "border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-100"
                  : "border-cyan-300/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-100"
              }`}
            >
              <span className="font-bold">{adminRuntime.maintenanceMode ? t.common.maintenanceEnabled : t.common.operationNotice}</span>
              <span className="truncate">{noticeText || t.common.noticeFallback}</span>
            </div>
          </div>
        )}

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-white/95 dark:bg-wbz-dark/95 backdrop-blur-xl mt-3">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2 mb-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-3 py-2 rounded-lg text-xs font-bold bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 flex items-center justify-center gap-1.5"
                >
                  {theme === "dark" ? <MoonStar className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  {theme === "dark" ? t.common.themeDark : t.common.themeLight}
                </button>

                <div className="rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-2">
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as LanguageType)}
                    className="w-full bg-transparent py-2 text-xs font-bold text-gray-900 dark:text-white outline-none"
                    aria-label={t.common.language}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-zinc-900 text-white">
                        {t.common[option.labelKey]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
                    pathname === item.href
                      ? "bg-wbz-gold text-black"
                      : "bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  {t.nav[item.key]}
                </Link>
              ))}

              {isLoggedIn ? (
                <>
                  <Link
                    href="/me"
                    className="mt-2 px-4 py-3 rounded-lg font-bold text-sm bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:border-wbz-gold/50 hover:text-wbz-gold transition-colors flex items-center justify-center gap-2"
                  >
                    <UserCircle2 className="w-4 h-4" />
                    {t.common.profile}
                  </Link>
                  {session?.user?.email && (
                    <Link
                      href="/admin"
                      className="px-4 py-3 rounded-lg font-bold text-sm bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:border-wbz-gold/50 hover:text-wbz-gold transition-colors text-center"
                    >
                      {t.common.admin}
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-3 rounded-lg font-bold text-sm bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 hover:border-red-500 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    {t.common.logout}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="mt-2 px-4 py-3 rounded-lg font-bold text-sm bg-wbz-gold text-black hover:bg-white transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {t.common.login}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
