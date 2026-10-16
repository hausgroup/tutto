"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminNav, operationNav } from "@/lib/navigation";

const PREFETCH_HREFS = [
  ...operationNav.filter((item) => !item.soon).map((item) => item.href),
  ...adminNav.map((item) => item.href),
];

/** Warm common dashboard routes after mount so sidebar clicks feel instant. */
export function NavRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      for (const href of PREFETCH_HREFS) {
        router.prefetch(href);
      }
    };

    const idle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(run, { timeout: 2500 })
        : window.setTimeout(run, 400);

    return () => {
      cancelled = true;
      if (typeof requestIdleCallback !== "undefined") {
        cancelIdleCallback(idle as number);
      } else {
        clearTimeout(idle);
      }
    };
  }, [router]);

  return null;
}
