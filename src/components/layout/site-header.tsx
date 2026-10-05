"use client";

import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { ModeToggle } from "@/components/mode-toggle";
import { PAGE_HEADER_ACTIONS_SLOT_ID } from "@/components/layout/page-header-actions";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { getPageTitle } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { state, isMobile } = useSidebar();
  const showTrigger = isMobile || state === "collapsed";
  const isPanel = pathname === "/dashboard";
  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border/70 bg-transparent px-4 py-2 md:px-6 md:py-0 md:h-16">
      <SidebarTrigger className={cn("-ml-1", !showTrigger && "hidden")} />
      <div className="flex min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h1>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <div id={PAGE_HEADER_ACTIONS_SLOT_ID} className="contents" />
        {isPanel ? (
          <>
            <ModeToggle />
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Salir
              </Button>
            </form>
          </>
        ) : null}
      </div>
    </header>
  );
}
