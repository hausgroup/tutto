"use client";

import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { ModeToggle } from "@/components/mode-toggle";
import { ReportsHeaderActions } from "@/components/reports/reports-header-actions";
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
  const isReports = pathname === "/reports" || pathname.startsWith("/reports/");

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-transparent px-4 md:px-6">
      <SidebarTrigger className={cn("-ml-1", !showTrigger && "hidden")} />
      <div className="flex min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
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
        {isReports ? <ReportsHeaderActions /> : null}
      </div>
    </header>
  );
}
