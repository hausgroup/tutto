"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, UtensilsCrossed } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  membershipHasPermission,
  PERMISSIONS,
  type AuthContext,
} from "@/lib/auth/permissions";
import { adminNav, operationNav, type AppNavItem } from "@/lib/navigation";

function NavItems({
  items,
  pathname,
}: {
  items: AppNavItem[];
  pathname: string;
}) {
  return items.map((item) => (
    <SidebarMenuItem key={item.href}>
      <SidebarMenuButton
        asChild
        isActive={
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        }
        tooltip={item.title}
      >
        <Link href={item.soon ? "/dashboard" : item.href}>
          <item.icon />
          <span>{item.title}</span>
          {item.soon ? (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Pronto
            </Badge>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ));
}

export function AppSidebar({ auth }: { auth: AuthContext }) {
  const pathname = usePathname();
  const activeMembership = auth.memberships[0];
  const canManageFloor =
    activeMembership &&
    membershipHasPermission(activeMembership, PERMISSIONS.FLOOR_MANAGE);
  const canManageStaff =
    activeMembership &&
    membershipHasPermission(activeMembership, PERMISSIONS.STAFF_MANAGE);
  const showAdmin = Boolean(canManageFloor || canManageStaff);

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <UtensilsCrossed className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Haus POS</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {activeMembership?.restaurantName ?? "Restaurante"}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItems items={operationNav} pathname={pathname} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {showAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItems
                  items={adminNav.filter((item) => {
                    if (item.href === "/floor/editor")
                      return Boolean(canManageFloor);
                    if (item.href === "/staff") return Boolean(canManageStaff);
                    return true;
                  })}
                  pathname={pathname}
                />
                {canManageFloor ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Vista operativa">
                      <Link href="/floor">
                        <LayoutGrid />
                        <span>Vista operativa</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {auth.fullName || auth.email}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeMembership?.roleName ?? "Sin rol"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
