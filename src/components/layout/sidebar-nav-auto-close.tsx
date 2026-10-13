"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";

/** Close the navigation sheet after route changes (iPad / phone). */
export function SidebarNavAutoClose() {
  const pathname = usePathname();
  const { isCompactNav, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (isCompactNav) setOpenMobile(false);
  }, [pathname, isCompactNav, setOpenMobile]);

  return null;
}
