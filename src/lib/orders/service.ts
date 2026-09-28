import { randomUUID } from "node:crypto";
import { canUseDemoExperience, useMockReports } from "@/lib/env";
import { isTodayInBogota } from "@/lib/utils/date";
import { getDemoRestaurantStore } from "@/lib/demo/restaurant-store";
import { getDemoFloorStore } from "@/lib/floor/demo-store";
import { floorService } from "@/lib/floor/service";
import type { TableStatus } from "@/lib/floor/types";
import {
  fetchModifiersByIds,
  fetchProductById,
} from "@/lib/catalog/supabase-repository";
import { fetchCatalogSnapshot } from "@/lib/catalog/supabase-repository";
import { inventoryService } from "@/lib/inventory/service";
import {
  calculateLineItem,
  sumOrderTotals,
} from "@/lib/orders/calculate";
import { consolidateWithMealOrderLines } from "@/lib/orders/consolidate-lines";
import type {
  Order,
  OrderItem,
  Payment,
  SalesReportSummary,
} from "@/lib/orders/types";
import type { CashierSession } from "@/lib/orders/types";
import {
  aggregateRestaurantReports,
  currentYearMonthInBogota,
  type RestaurantReports,
} from "@/lib/orders/reports";
import { buildMockRestaurantReports } from "@/lib/orders/mock-reports";
import { pendingBarDrinksByTableFromOrders } from "@/lib/orders/bar-delivery";
import {
  canMoveBarUnitToWithMeal,
  catalogProductIsPosBarDrink,
  deriveOrderStatusFromItems,
  findWithMealLineToMerge,
  initialItemStatusForServeTiming,
  linesMatchForQuantityAdjust,
  pendingLinesMatch,
  resolveServeTiming,
} from "@/lib/orders/drink-serve";
import type { ProductCategory } from "@/lib/catalog/types";
import type { DrinkServeTiming } from "@/lib/orders/types";
import * as ordersDb from "@/lib/orders/supabase-repository";
import {
  getActiveMembership,
  PERMISSIONS,
  requirePermission,
  type AuthContext,
} from "@/lib/auth/permissions";
import { enqueueSiigoSyncJob } from "@/lib/siigo/sync-jobs";
import { printReceipt } from "@/lib/printing";

function recalculateOrder(order: Order) {
  const totals = sumOrderTotals(
    order.items.map((item) => ({
      lineSubtotalMinor: item.lineSubtotalMinor,
      lineTaxMinor: item.lineTaxMinor,
      lineTotalMinor: item.lineTotalMinor,
    })),
  );
  order.subtotalMinor = totals.subtotalMinor;
  order.taxMinor = totals.taxMinor;
  order.totalMinor = totals.totalMinor - order.discountMinor;
}

function findTableLabel(tableId: string | null) {
  if (!tableId) return null;
  const table = getDemoFloorStore().tables.find((t) => t.id === tableId);
  return table?.label ?? null;
}

function orderHasBill(order: Order): boolean {
  return order.items.some(
    (item) => item.status !== "cancelled" && item.quantity > 0,
  );
}

async function catalogCategoriesFor(
  restaurantId: string,
): Promise<ProductCategory[]> {
  if (canUseDemoExperience()) {
    return getDemoRestaurantStore().catalog.categories;
  }
  return (await fetchCatalogSnapshot(restaurantId)).categories;
}

function tableStatusForOrder(order: Order): TableStatus | null {
  switch (order.status) {
    case "completed":
    case "voided":
      return "available";
    case "ready":
      return orderHasBill(order) ? "order_ready" : "available";
    case "open":
    case "in_progress":
      // Empty tickets stay free — occupied only once there's a bill.
      return orderHasBill(order) ? "occupied" : "available";
    default:
      return null;
  }
}

async function syncTableForOrder(
  context: AuthContext,
  restaurantId: string,
  order: Order,
) {
  if (!order.tableId) return;
  const next = tableStatusForOrder(order);
  if (!next) return;

    if (canUseDemoExperience()) {
      const table = getDemoFloorStore().tables.find((t) => t.id === order.tableId);
      if (table) {
        if (next === "available" && table.status === "reserved") return;
        table.status = next;
        if (next !== "reserved") table.reservation = null;
      }
      return;
    }

    if (next === "available") {
      const table = await floorService.getTableById(
        context,
        restaurantId,
        order.tableId,
      );
      if (table?.status === "reserved") return;
    }

    await floorService.setTableStatusOperational(
    context,
    order.tableId,
    restaurantId,
    next,
  );
}

export const orderService = {
  async getOpenOrderForTable(
    context: AuthContext,
    restaurantId: string,
    tableId: string,
  ): Promise<Order | null> {
    getActiveMembership(context, restaurantId);
    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      return (
        store.orders.find(
          (o) =>
            o.tableId === tableId &&
            o.restaurantId === restaurantId &&
            o.status !== "completed" &&
            o.status !== "voided",
        ) ?? null
      );
    }
    return ordersDb.fetchOpenOrderForTable(restaurantId, tableId);
  },

  async getOrCreateTableOrder(
    context: AuthContext,
    restaurantId: string,
    tableId: string,
  ): Promise<Order> {
    requirePermission(context, PERMISSIONS.ORDERS_CREATE, restaurantId);

    const existing = await orderService.getOpenOrderForTable(
      context,
      restaurantId,
      tableId,
    );
    if (existing) {
      // Heal stuck "occupied" empty tickets.
      await syncTableForOrder(context, restaurantId, existing);
      return canUseDemoExperience() ? structuredClone(existing) : existing;
    }

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      store.orderCounter += 1;
      const order: Order = {
        id: randomUUID(),
        restaurantId,
        tableId,
        tableLabel: findTableLabel(tableId),
        orderNumber: store.orderCounter,
        status: "open",
        subtotalMinor: 0,
        taxMinor: 0,
        discountMinor: 0,
        totalMinor: 0,
        notes: null,
        openedAt: new Date().toISOString(),
        closedAt: null,
        items: [],
      };
      store.orders.unshift(order);
      // Empty ticket — leave the table free until items are added.
      await syncTableForOrder(context, restaurantId, order);
      return structuredClone(order);
    }

    const order = await ordersDb.insertTableOrder({
      restaurantId,
      tableId,
      openedBy: context.userId,
    });
    await syncTableForOrder(context, restaurantId, order);
    return order;
  },

  async voidEmptyOpenOrderForTable(
    context: AuthContext,
    restaurantId: string,
    tableId: string,
  ): Promise<void> {
    getActiveMembership(context, restaurantId);
    const order = await orderService.getOpenOrderForTable(
      context,
      restaurantId,
      tableId,
    );
    if (!order) return;
    if (orderHasBill(order)) {
      throw new Error("TABLE_HAS_ACTIVE_ORDER");
    }

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const live = store.orders.find((o) => o.id === order.id);
      if (live) {
        live.status = "voided";
        live.closedAt = new Date().toISOString();
        live.items = [];
      }
      return;
    }

    await ordersDb.voidOpenOrder(order.id);
  },

  async addProductToOrder(
    context: AuthContext,
    input: {
      restaurantId: string;
      orderId: string;
      productId: string;
      quantity?: number;
      modifierIds?: string[];
      notes?: string;
      serveTiming?: DrinkServeTiming;
    },
  ): Promise<Order> {
    requirePermission(context, PERMISSIONS.ORDERS_MODIFY, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const order = store.orders.find((o) => o.id === input.orderId);
      if (!order || order.status === "completed") throw new Error("ORDER_NOT_FOUND");

      const product = store.catalog.products.find((p) => p.id === input.productId);
      if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");

      const modifiers = store.catalog.modifiers.filter((m) =>
        (input.modifierIds ?? []).includes(m.id),
      );
      const modifierDelta = modifiers.reduce(
        (sum, m) => sum + m.priceMinorDelta,
        0,
      );
      const qty = input.quantity ?? 1;
      const categories = store.catalog.categories;
      const serveTiming = resolveServeTiming(
        product,
        categories,
        input.serveTiming,
      );
      const itemStatus = initialItemStatusForServeTiming(
        serveTiming,
        catalogProductIsPosBarDrink(product, categories),
      );
      const line = calculateLineItem({
        unitPriceMinor: product.priceMinor,
        quantity: qty,
        taxRateBps: product.taxRateBps,
        modifierDeltaMinor: modifierDelta,
      });

      const item: OrderItem = {
        id: randomUUID(),
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPriceMinor: product.priceMinor,
        taxRateBps: product.taxRateBps,
        lineSubtotalMinor: line.lineSubtotalMinor,
        lineTaxMinor: line.lineTaxMinor,
        lineTotalMinor: line.lineTotalMinor,
        status: itemStatus,
        preparationStation: product.preparationStation,
        serveTiming,
        notes: input.notes ?? null,
        modifiers: modifiers.map((m) => ({
          id: randomUUID(),
          modifierName: m.name,
          priceMinorDelta: m.priceMinorDelta,
        })),
      };

      order.items.push(item);
      order.status = deriveOrderStatusFromItems(order.items, order.status);
      recalculateOrder(order);
      await syncTableForOrder(context, input.restaurantId, order);
      return structuredClone(order);
    }

    const order = await ordersDb.fetchOrderById(input.orderId);
    if (
      !order ||
      order.restaurantId !== input.restaurantId ||
      order.status === "completed"
    ) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const product = await fetchProductById(input.restaurantId, input.productId);
    if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");

    const modifiers = await fetchModifiersByIds(
      input.restaurantId,
      input.modifierIds ?? [],
    );
    const modifierDelta = modifiers.reduce(
      (sum, m) => sum + m.priceMinorDelta,
      0,
    );
    const qty = input.quantity ?? 1;
    const categories = await catalogCategoriesFor(input.restaurantId);
    const serveTiming = resolveServeTiming(
      product,
      categories,
      input.serveTiming,
    );
    const itemStatus = initialItemStatusForServeTiming(
      serveTiming,
      catalogProductIsPosBarDrink(product, categories),
    );
    const line = calculateLineItem({
      unitPriceMinor: product.priceMinor,
      quantity: qty,
      taxRateBps: product.taxRateBps,
      modifierDeltaMinor: modifierDelta,
    });

    await ordersDb.insertOrderItem({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitPriceMinor: product.priceMinor,
      taxRateBps: product.taxRateBps,
      lineSubtotalMinor: line.lineSubtotalMinor,
      lineTaxMinor: line.lineTaxMinor,
      lineTotalMinor: line.lineTotalMinor,
      preparationStation: product.preparationStation,
      notes: input.notes ?? null,
      serveTiming,
      status: itemStatus,
      modifiers: modifiers.map((m) => ({
        modifierName: m.name,
        priceMinorDelta: m.priceMinorDelta,
      })),
    });

    const refreshed = await ordersDb.fetchOrderById(order.id);
    if (!refreshed) throw new Error("ORDER_NOT_FOUND");
    recalculateOrder(refreshed);
    await ordersDb.updateOrderTotals(order.id, {
      subtotalMinor: refreshed.subtotalMinor,
      taxMinor: refreshed.taxMinor,
      totalMinor: refreshed.totalMinor,
      status: deriveOrderStatusFromItems(refreshed.items, refreshed.status),
    });
    const withTotals = (await ordersDb.fetchOrderById(order.id))!;
    await syncTableForOrder(context, input.restaurantId, withTotals);
    return withTotals;
  },

  async adjustProductQuantity(
    context: AuthContext,
    input: {
      restaurantId: string;
      orderId: string;
      productId: string;
      delta: number;
      serveTiming?: DrinkServeTiming;
    },
  ): Promise<Order> {
    requirePermission(context, PERMISSIONS.ORDERS_MODIFY, input.restaurantId);
    if (input.delta === 0) {
      const existing = canUseDemoExperience()
        ? structuredClone(
            getDemoRestaurantStore().orders.find((o) => o.id === input.orderId)!,
          )
        : (await ordersDb.fetchOrderById(input.orderId))!;
      return existing;
    }

    if (input.delta > 0) {
      // Prefer merging into an existing pending line for the same product
      if (canUseDemoExperience()) {
        const store = getDemoRestaurantStore();
        const order = store.orders.find((o) => o.id === input.orderId);
        if (!order || order.status === "completed") {
          throw new Error("ORDER_NOT_FOUND");
        }
        const pending = order.items.find((item) =>
          pendingLinesMatch(item, input.productId, input.serveTiming),
        );
        if (pending) {
          pending.quantity += input.delta;
          const line = calculateLineItem({
            unitPriceMinor: pending.unitPriceMinor,
            quantity: pending.quantity,
            taxRateBps: pending.taxRateBps,
          });
          pending.lineSubtotalMinor = line.lineSubtotalMinor;
          pending.lineTaxMinor = line.lineTaxMinor;
          pending.lineTotalMinor = line.lineTotalMinor;
          recalculateOrder(order);
          await syncTableForOrder(context, input.restaurantId, order);
          return structuredClone(order);
        }
      } else {
        const order = await ordersDb.fetchOrderById(input.orderId);
        if (
          !order ||
          order.restaurantId !== input.restaurantId ||
          order.status === "completed"
        ) {
          throw new Error("ORDER_NOT_FOUND");
        }
        const pending = order.items.find((item) =>
          pendingLinesMatch(item, input.productId, input.serveTiming),
        );
        if (pending) {
          const nextQty = pending.quantity + input.delta;
          const line = calculateLineItem({
            unitPriceMinor: pending.unitPriceMinor,
            quantity: nextQty,
            taxRateBps: pending.taxRateBps,
          });
          await ordersDb.updateOrderItemLine({
            itemId: pending.id,
            quantity: nextQty,
            lineSubtotalMinor: line.lineSubtotalMinor,
            lineTaxMinor: line.lineTaxMinor,
            lineTotalMinor: line.lineTotalMinor,
          });
          const refreshed = await ordersDb.fetchOrderById(order.id);
          if (!refreshed) throw new Error("ORDER_NOT_FOUND");
          recalculateOrder(refreshed);
          await ordersDb.updateOrderTotals(order.id, {
            subtotalMinor: refreshed.subtotalMinor,
            taxMinor: refreshed.taxMinor,
            totalMinor: refreshed.totalMinor,
            status: "open",
          });
          const withTotals = (await ordersDb.fetchOrderById(order.id))!;
          await syncTableForOrder(context, input.restaurantId, withTotals);
          return withTotals;
        }
      }

      return this.addProductToOrder(context, {
        restaurantId: input.restaurantId,
        orderId: input.orderId,
        productId: input.productId,
        quantity: input.delta,
        serveTiming: input.serveTiming,
      });
    }

    const removeCount = Math.abs(input.delta);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const order = store.orders.find((o) => o.id === input.orderId);
      if (!order || order.status === "completed") {
        throw new Error("ORDER_NOT_FOUND");
      }

      let remaining = removeCount;
      for (const item of order.items) {
        if (remaining <= 0) break;
        if (
          !linesMatchForQuantityAdjust(
            item,
            input.productId,
            input.serveTiming ?? null,
            input.delta,
          )
        ) {
          continue;
        }
        if (item.quantity <= remaining) {
          remaining -= item.quantity;
          order.items = order.items.filter((i) => i.id !== item.id);
        } else {
          item.quantity -= remaining;
          const line = calculateLineItem({
            unitPriceMinor: item.unitPriceMinor,
            quantity: item.quantity,
            taxRateBps: item.taxRateBps,
            modifierDeltaMinor: item.modifiers.reduce(
              (s, m) => s + m.priceMinorDelta,
              0,
            ),
          });
          item.lineSubtotalMinor = line.lineSubtotalMinor;
          item.lineTaxMinor = line.lineTaxMinor;
          item.lineTotalMinor = line.lineTotalMinor;
          remaining = 0;
        }
      }

      recalculateOrder(order);
      await syncTableForOrder(context, input.restaurantId, order);
      return structuredClone(order);
    }

    const order = await ordersDb.fetchOrderById(input.orderId);
    if (
      !order ||
      order.restaurantId !== input.restaurantId ||
      order.status === "completed"
    ) {
      throw new Error("ORDER_NOT_FOUND");
    }

    let remaining = removeCount;
    for (const item of order.items) {
      if (remaining <= 0) break;
      if (
        !linesMatchForQuantityAdjust(
          item,
          input.productId,
          input.serveTiming ?? null,
          input.delta,
        )
      ) {
        continue;
      }
      if (item.quantity <= remaining) {
        remaining -= item.quantity;
        await ordersDb.deleteOrderItem(item.id);
      } else {
        const nextQty = item.quantity - remaining;
        const line = calculateLineItem({
          unitPriceMinor: item.unitPriceMinor,
          quantity: nextQty,
          taxRateBps: item.taxRateBps,
          modifierDeltaMinor: item.modifiers.reduce(
            (s, m) => s + m.priceMinorDelta,
            0,
          ),
        });
        await ordersDb.updateOrderItemLine({
          itemId: item.id,
          quantity: nextQty,
          lineSubtotalMinor: line.lineSubtotalMinor,
          lineTaxMinor: line.lineTaxMinor,
          lineTotalMinor: line.lineTotalMinor,
        });
        remaining = 0;
      }
    }

    const refreshed = await ordersDb.fetchOrderById(order.id);
    if (!refreshed) throw new Error("ORDER_NOT_FOUND");
    recalculateOrder(refreshed);
    await ordersDb.updateOrderTotals(order.id, {
      subtotalMinor: refreshed.subtotalMinor,
      taxMinor: refreshed.taxMinor,
      totalMinor: refreshed.totalMinor,
      status: refreshed.items.length === 0 ? "open" : refreshed.status,
    });
    const withTotals = (await ordersDb.fetchOrderById(order.id))!;
    await syncTableForOrder(context, input.restaurantId, withTotals);
    return withTotals;
  },

  async moveBarDrinkUnitToWithMeal(
    context: AuthContext,
    input: {
      restaurantId: string;
      orderId: string;
      itemId: string;
      productId: string;
    },
  ): Promise<Order> {
    requirePermission(context, PERMISSIONS.ORDERS_MODIFY, input.restaurantId);

    const resolveLine = async (order: Order) => {
      const product = await fetchProductById(
        input.restaurantId,
        input.productId,
      );
      const categories = await catalogCategoriesFor(input.restaurantId);
      const byId = order.items.find((i) => i.id === input.itemId);
      if (byId && canMoveBarUnitToWithMeal(byId, product, categories)) {
        return byId;
      }
      const byProduct = order.items.find(
        (i) =>
          i.productId === input.productId &&
          canMoveBarUnitToWithMeal(i, product, categories),
      );
      if (byProduct) return byProduct;
      throw new Error("ORDER_ITEM_NOT_FOUND");
    };

    const applyMove = (order: Order, item: OrderItem) => {
      const modifierDelta = item.modifiers.reduce(
        (sum, m) => sum + m.priceMinorDelta,
        0,
      );

      const recalc = (line: OrderItem, quantity: number): OrderItem => {
        const totals = calculateLineItem({
          unitPriceMinor: line.unitPriceMinor,
          quantity,
          taxRateBps: line.taxRateBps,
          modifierDeltaMinor: modifierDelta,
        });
        return {
          ...line,
          quantity,
          lineSubtotalMinor: totals.lineSubtotalMinor,
          lineTaxMinor: totals.lineTaxMinor,
          lineTotalMinor: totals.lineTotalMinor,
        };
      };

      if (item.quantity === 1) {
        order.items = order.items.filter((i) => i.id !== item.id);
      } else {
        const index = order.items.findIndex((i) => i.id === item.id);
        order.items[index] = recalc(item, item.quantity - 1);
      }

      const mealLine = findWithMealLineToMerge(order.items, item.productId);
      if (mealLine) {
        const index = order.items.findIndex((i) => i.id === mealLine.id);
        order.items[index] = recalc(mealLine, mealLine.quantity + 1);
      } else {
        const line = calculateLineItem({
          unitPriceMinor: item.unitPriceMinor,
          quantity: 1,
          taxRateBps: item.taxRateBps,
          modifierDeltaMinor: modifierDelta,
        });
        order.items.push({
          id: randomUUID(),
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity: 1,
          unitPriceMinor: item.unitPriceMinor,
          taxRateBps: item.taxRateBps,
          lineSubtotalMinor: line.lineSubtotalMinor,
          lineTaxMinor: line.lineTaxMinor,
          lineTotalMinor: line.lineTotalMinor,
          status: "pending",
          preparationStation: item.preparationStation,
          serveTiming: "with_meal",
          notes: item.notes,
          modifiers: structuredClone(item.modifiers),
        });
      }

      order.items = consolidateWithMealOrderLines(order.items);
      order.status = deriveOrderStatusFromItems(order.items, order.status);
      recalculateOrder(order);
    };

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const order = store.orders.find((o) => o.id === input.orderId);
      if (!order || order.status === "completed") {
        throw new Error("ORDER_NOT_FOUND");
      }
      const product = await fetchProductById(
        input.restaurantId,
        input.productId,
      );
      const categories = await catalogCategoriesFor(input.restaurantId);
      const byId = order.items.find((i) => i.id === input.itemId);
      const item =
        (byId && canMoveBarUnitToWithMeal(byId, product, categories)
          ? byId
          : null) ??
        order.items.find(
          (i) =>
            i.productId === input.productId &&
            canMoveBarUnitToWithMeal(i, product, categories),
        );
      if (!item) throw new Error("ORDER_ITEM_NOT_FOUND");
      applyMove(order, item);
      await syncTableForOrder(context, input.restaurantId, order);
      return structuredClone(order);
    }

    const order = await ordersDb.fetchOrderById(input.orderId);
    if (
      !order ||
      order.restaurantId !== input.restaurantId ||
      order.status === "completed"
    ) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const item = await resolveLine(order);
    const modifierDelta = item.modifiers.reduce(
      (sum, m) => sum + m.priceMinorDelta,
      0,
    );

    const newSourceQty = item.quantity - 1;
    if (newSourceQty === 0) {
      await ordersDb.deleteOrderItem(item.id);
    } else {
      const line = calculateLineItem({
        unitPriceMinor: item.unitPriceMinor,
        quantity: newSourceQty,
        taxRateBps: item.taxRateBps,
        modifierDeltaMinor: modifierDelta,
      });
      await ordersDb.updateOrderItemLine({
        itemId: item.id,
        quantity: newSourceQty,
        lineSubtotalMinor: line.lineSubtotalMinor,
        lineTaxMinor: line.lineTaxMinor,
        lineTotalMinor: line.lineTotalMinor,
      });
    }

    const mealLine = findWithMealLineToMerge(order.items, item.productId);
    if (mealLine) {
      const nextQty = mealLine.quantity + 1;
      const line = calculateLineItem({
        unitPriceMinor: mealLine.unitPriceMinor,
        quantity: nextQty,
        taxRateBps: mealLine.taxRateBps,
        modifierDeltaMinor: mealLine.modifiers.reduce(
          (sum, m) => sum + m.priceMinorDelta,
          0,
        ),
      });
      await ordersDb.updateOrderItemLine({
        itemId: mealLine.id,
        quantity: nextQty,
        lineSubtotalMinor: line.lineSubtotalMinor,
        lineTaxMinor: line.lineTaxMinor,
        lineTotalMinor: line.lineTotalMinor,
      });
    } else {
      const line = calculateLineItem({
        unitPriceMinor: item.unitPriceMinor,
        quantity: 1,
        taxRateBps: item.taxRateBps,
        modifierDeltaMinor: modifierDelta,
      });
      await ordersDb.insertOrderItem({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        quantity: 1,
        unitPriceMinor: item.unitPriceMinor,
        taxRateBps: item.taxRateBps,
        lineSubtotalMinor: line.lineSubtotalMinor,
        lineTaxMinor: line.lineTaxMinor,
        lineTotalMinor: line.lineTotalMinor,
        preparationStation: item.preparationStation,
        serveTiming: "with_meal",
        status: "pending",
        modifiers: item.modifiers.map((m) => ({
          modifierName: m.modifierName,
          priceMinorDelta: m.priceMinorDelta,
        })),
      });
    }

    await ordersDb.mergeDuplicateWithMealOrderItems(order.id);

    const refreshed = (await ordersDb.fetchOrderById(order.id))!;
    refreshed.status = deriveOrderStatusFromItems(
      refreshed.items,
      refreshed.status,
    );
    await ordersDb.updateOrderTotals(order.id, {
      subtotalMinor: refreshed.subtotalMinor,
      taxMinor: refreshed.taxMinor,
      totalMinor: refreshed.totalMinor,
      status: refreshed.status,
    });
    await syncTableForOrder(context, input.restaurantId, refreshed);
    return refreshed;
  },

  async sendOrderItems(
    context: AuthContext,
    restaurantId: string,
    orderId: string,
  ): Promise<Order> {
    requirePermission(context, PERMISSIONS.ORDERS_MODIFY, restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const order = store.orders.find((o) => o.id === orderId);
      if (!order) throw new Error("ORDER_NOT_FOUND");

      for (const item of order.items) {
        if (item.status === "pending") item.status = "sent";
      }
      order.status = "in_progress";
      await syncTableForOrder(context, restaurantId, order);
      return structuredClone(order);
    }

    const order = await ordersDb.fetchOrderById(orderId);
    if (!order || order.restaurantId !== restaurantId) {
      throw new Error("ORDER_NOT_FOUND");
    }

    await ordersDb.markPendingItemsSent(orderId);
    const refreshed = (await ordersDb.fetchOrderById(orderId))!;
    refreshed.status = "in_progress";
    await syncTableForOrder(context, restaurantId, refreshed);
    return refreshed;
  },

  async completePayment(
    context: AuthContext,
    input: {
      restaurantId: string;
      orderId: string;
      methodCode: string;
      amountMinor: number;
    },
  ): Promise<{ order: Order; payment: Payment }> {
    requirePermission(context, PERMISSIONS.PAYMENTS_PROCESS, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const order = store.orders.find((o) => o.id === input.orderId);
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (input.amountMinor < order.totalMinor) {
        throw new Error("INSUFFICIENT_PAYMENT");
      }

      for (const item of order.items) {
        if (item.status !== "cancelled") {
          item.status = "delivered";
          if (
            store.catalog.products.find((p) => p.id === item.productId)
              ?.trackInventory
          ) {
            await inventoryService.consumeForProductSale(
              input.restaurantId,
              item.productId,
              item.quantity,
              item.id,
            );
          }
        }
      }

      order.status = "completed";
      order.closedAt = new Date().toISOString();
      await syncTableForOrder(context, input.restaurantId, order);

      const payment: Payment = {
        id: randomUUID(),
        restaurantId: input.restaurantId,
        orderId: order.id,
        methodCode: input.methodCode,
        amountMinor: input.amountMinor,
        status: "completed",
        createdAt: new Date().toISOString(),
      };
      store.payments.unshift(payment);

      const session = store.cashierSessions.find((s) => s.status === "open");
      if (session) {
        if (input.methodCode === "cash") session.cashSalesMinor += payment.amountMinor;
        else if (input.methodCode === "card") session.cardSalesMinor += payment.amountMinor;
        else if (input.methodCode === "transfer") {
          session.transferSalesMinor += payment.amountMinor;
        }
      }

      await enqueueSiigoSyncJob({
        restaurantId: input.restaurantId,
        entityType: "order",
        entityId: order.id,
        operation: "create_invoice",
      });

      await printReceipt({
        restaurantId: input.restaurantId,
        payload: { orderId: order.id, orderNumber: order.orderNumber },
      });

      return { order: structuredClone(order), payment };
    }

    const order = await ordersDb.fetchOrderById(input.orderId);
    if (!order || order.restaurantId !== input.restaurantId) {
      throw new Error("ORDER_NOT_FOUND");
    }
    if (input.amountMinor < order.totalMinor) {
      throw new Error("INSUFFICIENT_PAYMENT");
    }

    for (const item of order.items) {
      if (item.status === "cancelled") continue;
      const product = await fetchProductById(input.restaurantId, item.productId);
      if (product?.trackInventory) {
        await inventoryService.consumeForProductSale(
          input.restaurantId,
          item.productId,
          item.quantity,
          item.id,
        );
      }
    }

    const payment = await ordersDb.completeOrderPayment({
      restaurantId: input.restaurantId,
      orderId: order.id,
      methodCode: input.methodCode,
      amountMinor: input.amountMinor,
      processedBy: context.userId,
    });

    await ordersDb.incrementCashierSessionSales({
      restaurantId: input.restaurantId,
      methodCode: input.methodCode,
      amountMinor: payment.amountMinor,
    });

    const completedOrder =
      (await ordersDb.fetchOrderById(order.id)) ?? {
        ...order,
        status: "completed" as const,
        closedAt: new Date().toISOString(),
      };
    await syncTableForOrder(context, input.restaurantId, completedOrder);

    await enqueueSiigoSyncJob({
      restaurantId: input.restaurantId,
      entityType: "order",
      entityId: order.id,
      operation: "create_invoice",
    });

    await printReceipt({
      restaurantId: input.restaurantId,
      payload: { orderId: order.id, orderNumber: order.orderNumber },
    });

    if (!(await ordersDb.fetchOrderById(order.id))) {
      throw new Error("ORDER_NOT_FOUND");
    }
    return { order: completedOrder, payment };
  },

  async listOrders(context: AuthContext, restaurantId: string) {
    getActiveMembership(context, restaurantId);
    if (canUseDemoExperience()) {
      return structuredClone(getDemoRestaurantStore().orders);
    }
    return ordersDb.listOrders(restaurantId);
  },

  /** Open-table bill totals only — avoids cloning the full order history. */
  async getOpenBillTotalsByTableId(
    context: AuthContext,
    restaurantId: string,
  ): Promise<Record<string, number>> {
    getActiveMembership(context, restaurantId);
    const totals: Record<string, number> = {};

    if (canUseDemoExperience()) {
      for (const order of getDemoRestaurantStore().orders) {
        if (
          order.restaurantId !== restaurantId ||
          !order.tableId ||
          order.status === "completed" ||
          order.status === "voided"
        ) {
          continue;
        }
        totals[order.tableId] =
          (totals[order.tableId] ?? 0) + order.totalMinor;
      }
      return totals;
    }

    const orders = await ordersDb.fetchOpenBillTotalsByTableId(restaurantId);
    return orders;
  },

  async getPendingBarDrinksByTableId(
    context: AuthContext,
    restaurantId: string,
  ): Promise<Record<string, true>> {
    getActiveMembership(context, restaurantId);

    if (canUseDemoExperience()) {
      return pendingBarDrinksByTableFromOrders(getDemoRestaurantStore().orders);
    }

    return ordersDb.fetchPendingBarDrinksByTableId(restaurantId);
  },
};

export const cashierService = {
  async getOpenSession(context: AuthContext, restaurantId: string) {
    getActiveMembership(context, restaurantId);
    if (canUseDemoExperience()) {
      return (
        getDemoRestaurantStore().cashierSessions.find(
          (s) => s.status === "open" && s.restaurantId === restaurantId,
        ) ?? null
      );
    }
    return ordersDb.fetchOpenCashierSession(restaurantId);
  },

  async openSession(
    context: AuthContext,
    restaurantId: string,
    openingCashMinor: number,
  ): Promise<CashierSession> {
    requirePermission(context, PERMISSIONS.CASHIER_MANAGE, restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      if (store.cashierSessions.some((s) => s.status === "open")) {
        throw new Error("SESSION_ALREADY_OPEN");
      }
      const session: CashierSession = {
        id: randomUUID(),
        restaurantId,
        status: "open",
        openingCashMinor,
        expectedCashMinor: null,
        actualCashMinor: null,
        cashSalesMinor: 0,
        cardSalesMinor: 0,
        transferSalesMinor: 0,
        openedAt: new Date().toISOString(),
        closedAt: null,
      };
      store.cashierSessions.unshift(session);
      return structuredClone(session);
    }

    const existing = await ordersDb.fetchOpenCashierSession(restaurantId);
    if (existing) throw new Error("SESSION_ALREADY_OPEN");

    return ordersDb.openCashierSession({
      restaurantId,
      openingCashMinor,
      openedBy: context.userId,
    });
  },

  async closeSession(
    context: AuthContext,
    input: {
      restaurantId: string;
      sessionId: string;
      actualCashMinor: number;
    },
  ): Promise<CashierSession> {
    requirePermission(context, PERMISSIONS.CASHIER_MANAGE, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const session = store.cashierSessions.find((s) => s.id === input.sessionId);
      if (!session || session.status !== "open") throw new Error("SESSION_NOT_FOUND");

      const expected = session.openingCashMinor + session.cashSalesMinor;
      session.expectedCashMinor = expected;
      session.actualCashMinor = input.actualCashMinor;
      session.status = "closed";
      session.closedAt = new Date().toISOString();
      return structuredClone(session);
    }

    return ordersDb.closeCashierSession({
      ...input,
      closedBy: context.userId,
    });
  },
};

export const reportService = {
  async getSalesSummary(
    context: AuthContext,
    restaurantId: string,
    options?: { period?: "today" | "all" },
  ): Promise<SalesReportSummary> {
    getActiveMembership(context, restaurantId);
    const period = options?.period ?? "all";

    if (useMockReports()) {
      const mock = buildMockRestaurantReports();
      if (period === "today") {
        const todayCell = mock.dailyHeatmap.find(
          (cell) => cell.inMonth && isTodayInBogota(`${cell.date}T12:00:00-05:00`),
        );
        const gross = todayCell?.grossSalesMinor ?? 0;
        const orderCount = todayCell?.orderCount ?? 0;
        return {
          grossSalesMinor: gross,
          netSalesMinor: Math.round(gross * 0.93),
          taxMinor: Math.round(gross * 0.07),
          orderCount,
          averageOrderMinor:
            orderCount > 0 ? Math.round(gross / orderCount) : 0,
          paymentsByMethod: mock.paymentsByMethod,
        };
      }
      return {
        grossSalesMinor: mock.grossSalesMinor,
        netSalesMinor: mock.netSalesMinor,
        taxMinor: mock.taxMinor,
        orderCount: mock.orderCount,
        averageOrderMinor: mock.averageOrderMinor,
        paymentsByMethod: mock.paymentsByMethod,
      };
    }

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const completed = store.orders.filter((o) => {
        if (o.status !== "completed") return false;
        if (period === "today") {
          return o.closedAt != null && isTodayInBogota(o.closedAt);
        }
        return true;
      });
      const completedIds = new Set(completed.map((o) => o.id));
      const gross = completed.reduce((s, o) => s + o.totalMinor, 0);
      const tax = completed.reduce((s, o) => s + o.taxMinor, 0);
      const paymentsByMethod: Record<string, number> = {};
      for (const payment of store.payments) {
        if (!completedIds.has(payment.orderId)) continue;
        paymentsByMethod[payment.methodCode] =
          (paymentsByMethod[payment.methodCode] ?? 0) + payment.amountMinor;
      }

      return {
        grossSalesMinor: gross,
        netSalesMinor: gross - tax,
        taxMinor: tax,
        orderCount: completed.length,
        averageOrderMinor:
          completed.length > 0 ? Math.round(gross / completed.length) : 0,
        paymentsByMethod,
      };
    }

    return ordersDb.fetchSalesSummary(restaurantId, period);
  },

  async getRestaurantReports(
    context: AuthContext,
    restaurantId: string,
    options?: { yearMonth?: string },
  ): Promise<RestaurantReports> {
    getActiveMembership(context, restaurantId);
    const yearMonth = options?.yearMonth ?? currentYearMonthInBogota();

    if (useMockReports()) {
      return buildMockRestaurantReports(yearMonth);
    }

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      return aggregateRestaurantReports({
        orders: store.orders,
        payments: store.payments,
        yearMonth,
      });
    }

    return ordersDb.fetchRestaurantReports(restaurantId, yearMonth);
  },
};
