"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type LanguageType } from "@/data/locales";

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (typeof translations)[LanguageType];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "wbz-language";
const SUPPORTED_LANGUAGES: LanguageType[] = ["ko", "en", "ja", "zh"];

function isLanguageType(value: string): value is LanguageType {
  return SUPPORTED_LANGUAGES.includes(value as LanguageType);
}

function getBrowserLanguage(): LanguageType {
  if (typeof navigator === "undefined") {
    return "ko";
  }

  const normalized = navigator.language.toLowerCase();
  if (normalized.startsWith("ko")) return "ko";
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("zh")) return "zh";
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageType>("ko");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isLanguageType(stored)) {
      setLanguageState(stored);
      return;
    }

    setLanguageState(getBrowserLanguage());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.cookie = `${STORAGE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [language]);

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(isLanguageType(lang) ? lang : "ko");
  };

  const t = useMemo(() => translations[language] ?? translations.ko, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
