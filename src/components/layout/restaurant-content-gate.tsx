"use client";

import { Loader2 } from "lucide-react";
import { useActiveRestaurantId } from "@/lib/auth/active-restaurant-context";

/**
 * Hides stale RSC output while the active-restaurant cookie catches up after a switch.
 */
export function RestaurantContentGate({
  serverRestaurantId,
  children,
}: {
  serverRestaurantId: string;
  children: React.ReactNode;
}) {
  const activeRestaurantId = useActiveRestaurantId();
  const syncing = activeRestaurantId !== serverRestaurantId;

  if (syncing) {
    return (
      <div
        className="flex min-h-[12rem] flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"
        aria-busy="true"
        aria-live="polite"
      >
        <Loader2 className="size-8 animate-spin" aria-hidden />
        <p className="text-sm">Cambiando de local…</p>
      </div>
    );
  }

  return children;
}
