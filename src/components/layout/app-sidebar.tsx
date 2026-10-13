"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, PanelLeft } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  getActiveMembership,
  membershipHasPermission,
  PERMISSIONS,
  type AuthContext,
} from "@/lib/auth/permissions";
import {
  adminNav,
  operationNav,
  testingNav,
  type AppNavItem,
} from "@/lib/navigation";
import { RestaurantSwitcher } from "@/components/layout/restaurant-switcher";

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
        <Link href={item.soon ? "/floor" : item.href}>
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

function SidebarCollapseControl() {
  const { toggleSidebar, state } = useSidebar();
  const label = state === "collapsed" ? "Expandir panel" : "Colapsar panel";
  return (
    <SidebarMenuItem className="mt-4">
      <SidebarMenuButton
        type="button"
        tooltip={label}
        onClick={toggleSidebar}
      >
        <PanelLeft className="cn-rtl-flip" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ auth }: { auth: AuthContext }) {
  const pathname = usePathname();
  const activeMembership = getActiveMembership(auth);
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
        <RestaurantSwitcher auth={auth} />
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
        <SidebarGroup>
          <SidebarGroupLabel>Pruebas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItems items={testingNav} pathname={pathname} />
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
          <SidebarCollapseControl />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
