import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { ThemeSettings } from "../types";
import { applyTheme, defaultTheme, themeStorageKey } from "./theme";

type ThemeContextValue = {
  theme: ThemeSettings;
  updateTheme: (patch: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readTheme(): ThemeSettings {
  const saved = localStorage.getItem(themeStorageKey);
  const preferredMode = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : defaultTheme.mode;
  if (!saved) return { ...defaultTheme, mode: preferredMode };

  try {
    return { ...defaultTheme, mode: preferredMode, ...JSON.parse(saved) };
  } catch {
    return { ...defaultTheme, mode: preferredMode };
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ThemeSettings>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(themeStorageKey, JSON.stringify(theme));
    document.title = `${theme.appName} | Smart Business Dashboard`;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      updateTheme: (patch) => setTheme((current) => ({ ...current, ...patch })),
      resetTheme: () => setTheme(defaultTheme),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSettings() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useThemeSettings must be used inside ThemeProvider");
  return value;
}
