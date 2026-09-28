"use server";

import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { floorService } from "@/lib/floor/service";
import type { FloorSnapshot } from "@/lib/floor/types";
import { orderService } from "@/lib/orders/service";

export type FloorBootstrap = {
  snapshot: FloorSnapshot;
  billTotalsByTableId: Record<string, number>;
  pendingBarDrinksByTableId: Record<string, true>;
  canManage: boolean;
};

export async function bootstrapFloorAction(): Promise<
  FloorBootstrap | { error: string }
> {
  try {
    const auth = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(auth);
    if (!restaurantId) return { error: "RESTAURANT_NOT_FOUND" };

    const [snapshot, billTotalsByTableId, pendingBarDrinksByTableId] =
      await Promise.all([
        floorService.getSnapshot(auth, restaurantId),
        orderService
          .getOpenBillTotalsByTableId(auth, restaurantId)
          .catch(() => ({}) as Record<string, number>),
        orderService
          .getPendingBarDrinksByTableId(auth, restaurantId)
          .catch(() => ({}) as Record<string, true>),
      ]);

    return {
      snapshot,
      billTotalsByTableId,
      pendingBarDrinksByTableId,
      canManage: floorService.canManageFloor(auth, restaurantId),
    };
  } catch {
    return { error: "BOOTSTRAP_FAILED" };
  }
}
