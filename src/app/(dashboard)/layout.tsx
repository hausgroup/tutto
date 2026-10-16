import type { CSSProperties } from "react";
import { Suspense } from "react";
import { DashboardRouteLoading } from "@/components/layout/dashboard-route-loading";
import { redirect } from "next/navigation";
import { ActiveRestaurantProvider } from "@/lib/auth/active-restaurant-context";
import { getDefaultRestaurantId } from "@/lib/auth/resolve-context";
import { DemoModeBanner } from "@/components/layout/demo-mode-banner";
import { RestaurantContentGate } from "@/components/layout/restaurant-content-gate";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CompactNavShell } from "@/components/layout/compact-nav-shell";
import { SidebarNavAutoClose } from "@/components/layout/sidebar-nav-auto-close";
import { SiteHeader } from "@/components/layout/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { resolveOptionalAuthContext } from "@/lib/auth/resolve-context";
import { canUseDemoExperience, isSupabaseConfigured } from "@/lib/env";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured() && !canUseDemoExperience()) {
    redirect("/login");
  }

  const auth = await resolveOptionalAuthContext();
  if (!auth) {
    redirect("/login");
  }

  const activeRestaurantId = getDefaultRestaurantId(auth);
  if (!activeRestaurantId) {
    redirect("/settings");
  }

  return (
    <ActiveRestaurantProvider initialRestaurantId={activeRestaurantId}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "16rem",
          } as CSSProperties
        }
      >
        <CompactNavShell />
        <SidebarNavAutoClose />
        <AppSidebar auth={auth} />
        <SidebarInset className="flex max-h-svh min-h-0 flex-1 flex-col overflow-hidden bg-[#fcfcfd] md:rounded-xl dark:bg-background">
          <SiteHeader />
          <div
            data-dashboard-scroll
            className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-y-contain p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] md:p-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] has-[data-floor-layout]:gap-3 has-[data-floor-layout]:overflow-hidden has-[data-floor-layout]:p-4 has-[data-floor-layout]:md:p-6"
          >
            <DemoModeBanner />
            <div
              className="flex min-h-min min-w-0 flex-col has-[data-floor-layout]:min-h-0 has-[data-floor-layout]:flex-1 has-[data-floor-layout]:overflow-hidden"
            >
              <RestaurantContentGate serverRestaurantId={activeRestaurantId}>
                <Suspense fallback={<DashboardRouteLoading />}>
                  {children}
                </Suspense>
              </RestaurantContentGate>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ActiveRestaurantProvider>
  );
}
