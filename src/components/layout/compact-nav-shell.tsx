"use client";

import * as React from "react";
import { useCompactNav } from "@/hooks/use-compact-nav";
import { useStandalone } from "@/hooks/use-standalone";

/** Full-viewport shell for iPad and home-screen (standalone) launches. */
export function CompactNavShell() {
  const compact = useCompactNav();
  const standalone = useStandalone();
  const immersive = compact || standalone;

  React.useEffect(() => {
    if (immersive) {
      document.documentElement.dataset.compactNav = "true";
    } else {
      delete document.documentElement.dataset.compactNav;
    }

    if (standalone) {
      document.documentElement.dataset.standalone = "true";
    } else {
      delete document.documentElement.dataset.standalone;
    }

    return () => {
      delete document.documentElement.dataset.compactNav;
      delete document.documentElement.dataset.standalone;
    };
  }, [immersive, standalone]);

  return null;
}
