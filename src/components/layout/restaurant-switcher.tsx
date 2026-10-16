"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { switchRestaurantAction } from "@/lib/auth/actions";
import {
  useActiveRestaurantId,
  useSetActiveRestaurantOptimistic,
} from "@/lib/auth/active-restaurant-context";
import type { AuthContext, RestaurantMembership } from "@/lib/auth/permissions";
import { getActiveMembership } from "@/lib/auth/permissions";
import { prefetchPosCatalog } from "@/lib/pos/client-cache";
import {
  prefetchFloorBoot,
  seedDemoFloorBoot,
} from "@/lib/floor/client-cache";
import { RESTAURANT_BRANDS } from "@/lib/restaurants/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function brandShortLabel(name: string) {
  if (name === "Hunter & Butcher") return "H&B";
  return name;
}

function brandInitial(name: string) {
  return brandShortLabel(name).charAt(0).toUpperCase();
}

function orderedMemberships(
  memberships: RestaurantMembership[],
): RestaurantMembership[] {
  const byId = new Map(memberships.map((m) => [m.restaurantId, m]));
  const ordered: RestaurantMembership[] = [];
  for (const brand of RESTAURANT_BRANDS) {
    const m = byId.get(brand.id);
    if (m) ordered.push(m);
  }
  for (const m of memberships) {
    if (!ordered.some((o) => o.restaurantId === m.restaurantId)) {
      ordered.push(m);
    }
  }
  return ordered;
}

export function RestaurantSwitcher({
  auth,
  className,
}: {
  auth: AuthContext;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { state, isCompactNav } = useSidebar();
  const collapsed = state === "collapsed" && !isCompactNav;
  const active = getActiveMembership(auth);
  const options = useMemo(
    () => orderedMemberships(auth.memberships),
    [auth.memberships],
  );

  const activeRestaurantId = useActiveRestaurantId();
  const setActiveRestaurantOptimistic = useSetActiveRestaurantOptimistic();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (auth.activeRestaurantId) {
      setActiveRestaurantOptimistic(auth.activeRestaurantId);
    }
  }, [auth.activeRestaurantId, setActiveRestaurantOptimistic]);

  const activeMembership =
    options.find((m) => m.restaurantId === activeRestaurantId) ?? active;

  function prefetchRestaurant(restaurantId: string) {
    seedDemoFloorBoot(restaurantId);
    prefetchFloorBoot(restaurantId);
    prefetchPosCatalog(restaurantId);
  }

  async function select(restaurantId: string) {
    if (restaurantId === activeRestaurantId || inFlight.current) return;

    const previousId = activeRestaurantId;
    inFlight.current = true;
    setSyncingId(restaurantId);

    setActiveRestaurantOptimistic(restaurantId);
    prefetchRestaurant(restaurantId);

    const targetPath =
      pathname.startsWith("/pos/") || pathname.startsWith("/floor/editor")
        ? "/floor"
        : pathname;

    if (targetPath !== pathname) {
      router.replace(targetPath);
    }

    try {
      const result = await switchRestaurantAction({ restaurantId });
      if (result.error) {
        setActiveRestaurantOptimistic(previousId);
        toast.error(result.error);
        return;
      }
      router.refresh();
    } catch {
      setActiveRestaurantOptimistic(previousId);
      toast.error("No pudimos cambiar de restaurante.");
    } finally {
      inFlight.current = false;
      setSyncingId(null);
    }
  }

  if (options.length <= 1) {
    return (
      <div className={cn("min-w-0 px-1 py-0.5", className)}>
        <p className="truncate text-base font-semibold leading-tight tracking-tight">
          {active?.restaurantName ?? "Restaurante"}
        </p>
      </div>
    );
  }

  const menuItems = options.map((membership) => {
    const isActive = membership.restaurantId === activeRestaurantId;
    const isSyncing = syncingId === membership.restaurantId;
    return (
      <DropdownMenuItem
        key={membership.restaurantId}
        onPointerEnter={() => prefetchRestaurant(membership.restaurantId)}
        onFocus={() => prefetchRestaurant(membership.restaurantId)}
        onClick={() => select(membership.restaurantId)}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold"
          >
            {brandInitial(membership.restaurantName)}
          </span>
          <span className="truncate">{membership.restaurantName}</span>
        </span>
        {isSyncing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isActive ? (
          <Check className="size-4 text-muted-foreground" />
        ) : null}
      </DropdownMenuItem>
    );
  });

  if (collapsed) {
    const name = activeMembership?.restaurantName ?? "Restaurante";
    return (
      <SidebarMenu className={className}>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={name}
                className="data-[state=open]:bg-sidebar-accent"
              >
                <div
                  className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground"
                >
                  {syncingId ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    brandInitial(name)
                  )}
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="min-w-44">
              {menuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const activeName = activeMembership?.restaurantName ?? "Restaurante";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors",
            "hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          aria-label="Cambiar restaurante"
        >
          <div
            className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground"
          >
            {syncingId ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              brandInitial(activeName)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-tight tracking-tight">
              {activeName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Cambiar local
            </p>
          </div>
          <ChevronsUpDown
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {menuItems}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
