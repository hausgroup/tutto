export const THEME_STORAGE_KEY = "theme";
export const THEME_DEFAULT = "system";
export const THEME_OPTIONS = ["light", "dark", "system"] as const;

export type ThemeSetting = (typeof THEME_OPTIONS)[number];
export type ResolvedTheme = "light" | "dark";
