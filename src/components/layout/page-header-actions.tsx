"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export const PAGE_HEADER_ACTIONS_SLOT_ID = "page-header-actions-slot";

/** Renders action buttons into the site header (above the page divider). */
export function PageHeaderActions({
  children,
}: {
  children: React.ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setSlot(document.getElementById(PAGE_HEADER_ACTIONS_SLOT_ID));
  }, []);

  if (!slot) return null;
  return createPortal(children, slot);
}
