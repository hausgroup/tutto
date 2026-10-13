"use server";

import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import type { AuthContext } from "@/lib/auth/permissions";
import { catalogService } from "@/lib/catalog/service";
import { orderService } from "@/lib/orders/service";
import type { CatalogSnapshot } from "@/lib/catalog/types";
import type { TableReservation } from "@/lib/floor/types";
import type { Order } from "@/lib/orders/types";
import { floorService } from "@/lib/floor/service";

export type PosBootstrap = {
  catalog: CatalogSnapshot;
  order: Order;
  tableLabel: string;
  attendantName: string;
  restaurantId: string;
  tableReservation: TableReservation | null;
};

export type PosTableBootstrap = Omit<PosBootstrap, "catalog">;

export type PosCatalogWarm = {
  catalog: CatalogSnapshot;
  attendantName: string;
  restaurantId: string;
};

function mapBootstrapError(error: unknown): string {
  if (!(error instanceof Error)) return "BOOTSTRAP_FAILED";
  switch (error.message) {
    case "FORBIDDEN":
    case "UNAUTHORIZED":
    case "RESTAURANT_NOT_FOUND":
      return error.message;
    default:
      // Surface actionable detail without dumping stacks to the client.
      if (error.message.length > 0 && error.message.length < 180) {
        return error.message;
      }
      return "BOOTSTRAP_FAILED";
  }
}

export async function warmPosCatalogAction(): Promise<
  PosCatalogWarm | { error: string }
> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) return { error: "RESTAURANT_NOT_FOUND" };
    const catalog = await catalogService.getSnapshot(context, restaurantId);
    return {
      catalog,
      attendantName: context.fullName || context.email,
      restaurantId,
    };
  } catch (error) {
    return { error: mapBootstrapError(error) };
  }
}

async function loadPosTableBootstrap(
  context: AuthContext,
  restaurantId: string,
  tableId: string,
): Promise<PosTableBootstrap> {
  const [order, table] = await Promise.all([
    orderService.getOrCreateTableOrder(context, restaurantId, tableId),
    floorService.getTableById(context, restaurantId, tableId),
  ]);

  return {
    order,
    tableLabel: order.tableLabel ?? table?.label ?? tableId,
    attendantName: context.fullName || context.email,
    restaurantId,
    tableReservation:
      table?.status === "reserved" ? table.reservation : null,
  };
}

export async function bootstrapPosTableAction(
  tableId: string,
): Promise<PosTableBootstrap | { error: string }> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) return { error: "RESTAURANT_NOT_FOUND" };
    return await loadPosTableBootstrap(context, restaurantId, tableId);
  } catch (error) {
    console.error("[bootstrapPosTableAction]", error);
    return { error: mapBootstrapError(error) };
  }
}

export async function bootstrapPosAction(
  tableId: string,
): Promise<PosBootstrap | { error: string }> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) return { error: "RESTAURANT_NOT_FOUND" };

    const [catalog, tableBoot] = await Promise.all([
      catalogService.getSnapshot(context, restaurantId),
      loadPosTableBootstrap(context, restaurantId, tableId),
    ]);

    return { ...tableBoot, catalog };
  } catch (error) {
    console.error("[bootstrapPosAction]", error);
    return { error: mapBootstrapError(error) };
  }
}
