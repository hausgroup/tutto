import * as React from "react";

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/** True when opened from iOS/Android home screen (no Safari URL bar). */
export function useStandalone() {
  const [standalone, setStandalone] = React.useState(() => detectStandalone());

  React.useEffect(() => {
    const update = () => setStandalone(detectStandalone());
    update();
    window.addEventListener("resize", update);
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      mq.removeEventListener("change", update);
    };
  }, []);

  return standalone;
}
