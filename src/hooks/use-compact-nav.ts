import * as React from "react";

const MOBILE_MAX_WIDTH = 767;
/** iPad landscape and similar tablets */
const TABLET_MAX_WIDTH = 1366;

function detectCompactNav(): boolean {
  if (typeof window === "undefined") return false;

  const width = window.innerWidth;
  if (width <= MOBILE_MAX_WIDTH) return true;

  const touchPoints = navigator.maxTouchPoints ?? 0;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const isIpad =
    /iPad/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && touchPoints > 1);

  if (isIpad && width <= TABLET_MAX_WIDTH) return true;
  if (touchPoints > 0 && coarsePointer && noHover && width <= TABLET_MAX_WIDTH) {
    return true;
  }

  return false;
}

/**
 * True on phones and iPad-like tablets: sidebar is a sheet; header shows the menu toggle.
 */
export function useCompactNav() {
  const [compact, setCompact] = React.useState(() => detectCompactNav());

  React.useEffect(() => {
    const update = () => setCompact(detectCompactNav());
    update();
    window.addEventListener("resize", update);
    const coarse = window.matchMedia("(pointer: coarse)");
    coarse.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      coarse.removeEventListener("change", update);
    };
  }, []);

  return compact;
}
