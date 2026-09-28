import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { DemoModeBanner } from "@/components/layout/demo-mode-banner";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
      <AppSidebar auth={auth} />
      <SidebarInset className="overflow-hidden bg-[#fcfcfd] md:rounded-xl dark:bg-background">
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
          <DemoModeBanner />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
