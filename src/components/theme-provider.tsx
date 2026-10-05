"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

/** Arc components read `data-theme` on `<html>`; Tailwind keeps using `class="dark"`. */
function ArcThemeSync() {
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme === "dark" ? "dark" : "light";
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ArcThemeSync />
      {children}
    </NextThemesProvider>
  );
}
