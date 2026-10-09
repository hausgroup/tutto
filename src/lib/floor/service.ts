import {
  getActiveMembership,
  membershipHasPermission,
  PERMISSIONS,
  requirePermission,
  type AuthContext,
} from "@/lib/auth/permissions";
import { canUseDemoExperience } from "@/lib/env";
import { DemoFloorRepository } from "@/lib/floor/demo-repository";
import { getDemoFloorStore } from "@/lib/floor/demo-store";
import type {
  CreateFloorAreaInput,
  CreateTableInput,
  FloorRepository,
  UpdateFloorAreaInput,
  UpdateTableLayoutInput,
  UpdateTablePropertiesInput,
} from "@/lib/floor/repository";
import { SupabaseFloorRepository } from "@/lib/floor/supabase-repository";
import type { TableStatus } from "@/lib/floor/types";

function getRepository(): FloorRepository {
  if (canUseDemoExperience()) {
    return new DemoFloorRepository();
  }
  return new SupabaseFloorRepository();
}

function resolveRestaurantId(context: AuthContext, restaurantId?: string) {
  const membership = getActiveMembership(context, restaurantId);
  if (!membership) {
    throw new Error("RESTAURANT_NOT_FOUND");
  }
  return membership.restaurantId;
}

function assertCanViewFloor(context: AuthContext, restaurantId: string) {
  if (canUseDemoExperience()) return;
  const membership = getActiveMembership(context, restaurantId);
  if (!membership) throw new Error("FORBIDDEN");
}

function assertCanManageFloor(context: AuthContext, restaurantId: string) {
  if (canUseDemoExperience()) return;
  requirePermission(context, PERMISSIONS.FLOOR_MANAGE, restaurantId);
}

export const floorService = {
  async getSnapshot(context: AuthContext, restaurantId?: string) {
    const resolvedRestaurantId = resolveRestaurantId(context, restaurantId);
    assertCanViewFloor(context, resolvedRestaurantId);
    return getRepository().getSnapshot(resolvedRestaurantId);
  },

  async getSummary(context: AuthContext, restaurantId?: string) {
    const resolvedRestaurantId = resolveRestaurantId(context, restaurantId);
    assertCanViewFloor(context, resolvedRestaurantId);
    return getRepository().getSummary(resolvedRestaurantId);
  },

  async getTableById(
    context: AuthContext,
    restaurantId: string,
    tableId: string,
  ) {
    getActiveMembership(context, restaurantId);
    return getRepository().getTableById(tableId, restaurantId);
  },

  canManageFloor(context: AuthContext, restaurantId?: string) {
    if (canUseDemoExperience()) return true;
    const membership = getActiveMembership(context, restaurantId);
    if (!membership) return false;
    return membershipHasPermission(membership, PERMISSIONS.FLOOR_MANAGE);
  },

  async createArea(context: AuthContext, input: CreateFloorAreaInput) {
    assertCanManageFloor(context, input.restaurantId);
    return getRepository().createArea(input);
  },

  async updateArea(context: AuthContext, input: UpdateFloorAreaInput) {
    assertCanManageFloor(context, input.restaurantId);
    return getRepository().updateArea(input);
  },

  async deleteArea(context: AuthContext, id: string, restaurantId: string) {
    assertCanManageFloor(context, restaurantId);
    return getRepository().deleteArea(id, restaurantId);
  },

  async createTable(context: AuthContext, input: CreateTableInput) {
    assertCanManageFloor(context, input.restaurantId);
    return getRepository().createTable(input);
  },

  async updateTableLayout(
    context: AuthContext,
    input: UpdateTableLayoutInput,
  ) {
    assertCanManageFloor(context, input.restaurantId);
    return getRepository().updateTableLayout(input);
  },

  async updateTableProperties(
    context: AuthContext,
    input: UpdateTablePropertiesInput,
  ) {
    assertCanManageFloor(context, input.restaurantId);
    return getRepository().updateTableProperties(input);
  },

  async updateTableStatus(
    context: AuthContext,
    id: string,
    restaurantId: string,
    status: TableStatus,
  ) {
    assertCanManageFloor(context, restaurantId);
    return getRepository().updateTableStatus(id, restaurantId, status);
  },

  /** POS / pedidos: actualiza estado de mesa sin permiso de editor de plano. */
  async setTableStatusOperational(
    context: AuthContext,
    tableId: string,
    restaurantId: string,
    status: TableStatus,
  ) {
    const membership = getActiveMembership(context, restaurantId);
    if (!membership) throw new Error("FORBIDDEN");
    if (canUseDemoExperience()) {
      const table = getDemoFloorStore().tables.find((t) => t.id === tableId);
      if (table) table.status = status;
      return;
    }
    return getRepository().updateTableStatus(tableId, restaurantId, status);
  },

  async deleteTable(context: AuthContext, id: string, restaurantId: string) {
    assertCanManageFloor(context, restaurantId);
    return getRepository().deleteTable(id, restaurantId);
  },

  async reserveTable(
    context: AuthContext,
    input: import("@/lib/floor/repository").ReserveTableInput,
  ) {
    const { orderService } = await import("@/lib/orders/service");
    requirePermission(context, PERMISSIONS.ORDERS_MODIFY, input.restaurantId);
    resolveRestaurantId(context, input.restaurantId);
    await orderService.voidEmptyOpenOrderForTable(
      context,
      input.restaurantId,
      input.tableId,
    );
    return getRepository().reserveTable(input);
  },

  async reserveTables(
    context: AuthContext,
    input: import("@/lib/floor/repository").ReserveTablesInput,
  ) {
    const { orderService } = await import("@/lib/orders/service");
    requirePermission(context, PERMISSIONS.ORDERS_MODIFY, input.restaurantId);
    resolveRestaurantId(context, input.restaurantId);
    for (const tableId of [...new Set(input.tableIds)]) {
      await orderService.voidEmptyOpenOrderForTable(
        context,
        input.restaurantId,
        tableId,
      );
    }
    return getRepository().reserveTables(input);
  },

  async cancelReservationForTable(
    context: AuthContext,
    restaurantId: string,
    tableId: string,
  ) {
    const { orderService } = await import("@/lib/orders/service");
    requirePermission(context, PERMISSIONS.ORDERS_MODIFY, restaurantId);
    resolveRestaurantId(context, restaurantId);

    const table = await getRepository().getTableById(tableId, restaurantId);
    if (!table || table.status !== "reserved") {
      throw new Error("RESERVATION_NOT_FOUND");
    }

    const groupId = table.reservation?.groupId;
    const snapshot = await getRepository().getSnapshot(restaurantId);
    const tableIds = groupId
      ? snapshot.tables
          .filter((t) => t.reservation?.groupId === groupId)
          .map((t) => t.id)
      : [tableId];

    const billTotals = await orderService.getOpenBillTotalsByTableId(
      context,
      restaurantId,
    );
    for (const id of tableIds) {
      if ((billTotals[id] ?? 0) > 0) {
        throw new Error("TABLE_HAS_OPEN_BILL");
      }
    }

    return getRepository().cancelReservationForTable(restaurantId, tableId);
  },
};
