import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { DemoModeBanner } from "@/components/layout/demo-mode-banner";
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

  return (
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
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fcfcfd] md:rounded-xl dark:bg-background">
        <SiteHeader />
        <div
          data-dashboard-scroll
          className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-y-contain p-4 md:p-6"
        >
          <DemoModeBanner />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
