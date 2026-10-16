"use client";

import { useEffect, useState } from "react";
import { FloorPlanEditor } from "@/components/floor/floor-plan-editor";
import { useActiveRestaurantId } from "@/lib/auth/active-restaurant-context";
import type { FloorSnapshot } from "@/lib/floor/types";
import {
  getCachedFloorBoot,
  getPendingFloorBoot,
  warmFloorBoot,
} from "@/lib/floor/client-cache";

function bootSnapshot(restaurantId: string): FloorSnapshot | null {
  return getCachedFloorBoot(restaurantId)?.snapshot ?? null;
}

export function FloorEditorClientEntry({
  restaurantId: serverRestaurantId,
}: {
  restaurantId: string;
}) {
  const restaurantId = useActiveRestaurantId();
  const [snapshot, setSnapshot] = useState<FloorSnapshot | null>(() =>
    bootSnapshot(restaurantId) ?? bootSnapshot(serverRestaurantId),
  );

  useEffect(() => {
    const cached = bootSnapshot(restaurantId);
    if (cached) {
      setSnapshot(cached);
      return;
    }

    setSnapshot(null);
    const pending =
      getPendingFloorBoot(restaurantId) ?? warmFloorBoot({ restaurantId });
    void pending.then((boot) => {
      if (boot.restaurantId === restaurantId) setSnapshot(boot.snapshot);
    });
  }, [restaurantId]);

  if (!snapshot) {
    return (
      <div className="flex min-h-[min(70vh,calc(100dvh-12rem))] flex-col gap-3">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="min-h-0 flex-1 animate-pulse rounded-[20px] bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-3 md:min-h-[calc(100dvh-8.5rem)]">
      <FloorPlanEditor
        key={restaurantId}
        initialSnapshot={snapshot}
        restaurantId={restaurantId}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
