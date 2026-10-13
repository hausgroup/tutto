"use client";

import * as React from "react";
import {
  THEME_DEFAULT,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeSetting,
} from "@/lib/theme/constants";
import {
  applyThemeToDocument,
  getSystemTheme,
  resolveTheme,
} from "@/lib/theme/apply";

type ThemeContextValue = {
  theme: ThemeSetting;
  setTheme: (value: ThemeSetting | ((prev: ThemeSetting) => ThemeSetting)) => void;
  resolvedTheme: ResolvedTheme;
  themes: ThemeSetting[];
  systemTheme?: ResolvedTheme;
  forcedTheme?: undefined;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined,
);

const emptyThemeContext: ThemeContextValue = {
  theme: THEME_DEFAULT,
  setTheme: () => {},
  resolvedTheme: "light",
  themes: [...THEME_OPTIONS],
};

export function useTheme(): ThemeContextValue {
  return React.useContext(ThemeContext) ?? emptyThemeContext;
}

function readStoredTheme(): ThemeSetting {
  if (typeof window === "undefined") return THEME_DEFAULT;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* private mode */
  }
  return THEME_DEFAULT;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeSetting>(() =>
    readStoredTheme(),
  );
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(
    () =>
      typeof window === "undefined"
        ? "light"
        : resolveTheme(readStoredTheme()),
  );
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>();

  React.useLayoutEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved, { disableTransition: true });

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  React.useLayoutEffect(() => {
    setSystemTheme(getSystemTheme());
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const nextSystem = getSystemTheme();
      setSystemTheme(nextSystem);
      if (theme === "system") {
        setResolvedTheme(nextSystem);
        applyThemeToDocument(nextSystem, { disableTransition: true });
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = event.newValue;
      if (next === "light" || next === "dark" || next === "system") {
        setThemeState(next);
      } else if (!next) {
        setThemeState(THEME_DEFAULT);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = React.useCallback(
    (value: ThemeSetting | ((prev: ThemeSetting) => ThemeSetting)) => {
      setThemeState((prev) =>
        typeof value === "function" ? value(prev) : value,
      );
    },
    [],
  );

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      themes: [...THEME_OPTIONS],
      systemTheme,
    }),
    [theme, setTheme, resolvedTheme, systemTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
