import { ko } from "@/data/locales/ko";
import { en } from "@/data/locales/en";
import { ja } from "@/data/locales/ja";
import { zh } from "@/data/locales/zh";

export type LanguageType = "ko" | "en" | "ja" | "zh";

export const translations = {
  ko,
  en,
  ja,
  zh,
} as const;
