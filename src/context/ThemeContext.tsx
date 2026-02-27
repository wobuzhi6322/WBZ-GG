"use client";

import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";

export type ThemeType = "dark" | "light";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function ThemeBridge({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme } = useNextTheme();
  const normalizedTheme: ThemeType = resolvedTheme === "light" ? "light" : "dark";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = normalizedTheme;
    document.documentElement.style.colorScheme = normalizedTheme;
  }, [normalizedTheme]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: normalizedTheme,
      setTheme: (nextTheme: ThemeType) => setTheme(nextTheme),
      toggleTheme: () => setTheme(normalizedTheme === "dark" ? "light" : "dark"),
    }),
    [normalizedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ThemeBridge>{children}</ThemeBridge>
    </NextThemesProvider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
