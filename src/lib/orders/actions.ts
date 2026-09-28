"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthContext, getDefaultRestaurantId } from "@/lib/auth/resolve-context";
import { tableReservationSchema } from "@/lib/floor/schemas";
import { floorService } from "@/lib/floor/service";
import { orderService } from "@/lib/orders/service";
import { inventoryService } from "@/lib/inventory/service";
import { cashierService } from "@/lib/orders/service";
import type { Order } from "@/lib/orders/types";

export type PosActionState = {
  ok?: boolean;
  error?: string;
  order?: Order;
};

function mapError(error: unknown): PosActionState {
  if (error instanceof Error) {
    switch (error.message) {
      case "FORBIDDEN":
        return { error: "No tienes permiso." };
      case "INSUFFICIENT_PAYMENT":
        return { error: "El monto pagado es menor al total." };
      case "TABLE_HAS_ACTIVE_ORDER":
        return {
          error:
            "Hay productos en la cuenta. Envía o elimina el pedido antes de reservar.",
        };
      case "TABLE_NOT_AVAILABLE":
        return { error: "Esta mesa no está disponible para reservar." };
      case "TABLE_NOT_FOUND":
        return { error: "Mesa no encontrada." };
      case "ORDER_ITEM_NOT_FOUND":
      case "ORDER_ITEM_NOT_EDITABLE":
        return { error: "No se puede mover esta bebida." };
      case "SESSION_ALREADY_OPEN":
        return { error: "Ya hay una caja abierta." };
      default:
        return { error: "No pudimos completar la operación." };
    }
  }
  return { error: "No pudimos completar la operación." };
}

function revalidateFloorSurfaces() {
  revalidatePath("/floor");
  revalidatePath("/dashboard");
}

function revalidateAfterPayment() {
  revalidateFloorSurfaces();
  revalidatePath("/cashier");
  revalidatePath("/reports");
  revalidatePath("/inventory");
}

export async function addProductToOrderAction(input: {
  orderId: string;
  productId: string;
  modifierIds?: string[];
  quantity?: number;
}): Promise<PosActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    const order = await orderService.addProductToOrder(context, {
      restaurantId,
      orderId: input.orderId,
      productId: input.productId,
      modifierIds: input.modifierIds,
      quantity: input.quantity,
    });
    return { ok: true, order };
  } catch (error) {
    return mapError(error);
  }
}

export async function adjustOrderProductQuantityAction(input: {
  orderId: string;
  productId: string;
  delta: number;
  serveTiming?: "immediate" | "with_meal";
}): Promise<PosActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    const order = await orderService.adjustProductQuantity(context, {
      restaurantId,
      orderId: input.orderId,
      productId: input.productId,
      delta: input.delta,
      serveTiming: input.serveTiming,
    });
    // No broad revalidation — POS keeps local state for snappy taps.
    return { ok: true, order };
  } catch (error) {
    return mapError(error);
  }
}

export async function sendOrderAction(orderId: string): Promise<PosActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    const order = await orderService.sendOrderItems(
      context,
      restaurantId,
      orderId,
    );
    revalidateFloorSurfaces();
    return { ok: true, order };
  } catch (error) {
    return mapError(error);
  }
}

export async function moveBarDrinkUnitToWithMealAction(input: {
  orderId: string;
  itemId: string;
  productId: string;
}): Promise<PosActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    const order = await orderService.moveBarDrinkUnitToWithMeal(context, {
      restaurantId,
      orderId: input.orderId,
      itemId: input.itemId,
      productId: input.productId,
    });
    return { ok: true, order };
  } catch (error) {
    return mapError(error);
  }
}

export async function reserveTableFromPosAction(input: {
  tableId: string;
  guestName: string;
  partySize: number;
  occasion: string;
}): Promise<PosActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    const parsed = tableReservationSchema.parse({
      restaurantId,
      tableId: input.tableId,
      guestName: input.guestName,
      partySize: input.partySize,
      occasion: input.occasion,
    });
    await floorService.reserveTable(context, parsed);
    revalidateFloorSurfaces();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function payOrderAction(input: {
  orderId: string;
  methodCode: string;
  amountMinor: number;
}): Promise<PosActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    const { order } = await orderService.completePayment(context, {
      restaurantId,
      orderId: input.orderId,
      methodCode: input.methodCode,
      amountMinor: input.amountMinor,
    });
    revalidateAfterPayment();
    return { ok: true, order };
  } catch (error) {
    return mapError(error);
  }
}

export async function adjustInventoryAction(input: {
  ingredientId: string;
  quantityDelta: number;
  notes?: string;
}): Promise<PosActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    await inventoryService.adjustStock(context, {
      restaurantId,
      ingredientId: input.ingredientId,
      quantityDelta: input.quantityDelta,
      notes: input.notes,
    });
    revalidatePath("/inventory");
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function openCashierAction(
  openingCashMinor: number,
): Promise<PosActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    await cashierService.openSession(context, restaurantId, openingCashMinor);
    revalidatePath("/cashier");
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function closeCashierAction(input: {
  sessionId: string;
  actualCashMinor: number;
}): Promise<PosActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    await cashierService.closeSession(context, {
      restaurantId,
      sessionId: input.sessionId,
      actualCashMinor: input.actualCashMinor,
    });
    revalidatePath("/cashier");
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}
