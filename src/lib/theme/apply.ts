import type { ResolvedTheme } from "@/lib/theme/constants";

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(stored: string): ResolvedTheme {
  if (stored === "system") return getSystemTheme();
  if (stored === "dark" || stored === "light") return stored;
  return getSystemTheme();
}

export function applyThemeToDocument(
  resolved: ResolvedTheme,
  options?: { disableTransition?: boolean },
) {
  const root = document.documentElement;
  let restoreTransitions: (() => void) | undefined;

  if (options?.disableTransition) {
    restoreTransitions = disableTransitionsBriefly();
  }

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;

  restoreTransitions?.();
}

function disableTransitionsBriefly(): () => void {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(style);
  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
}
