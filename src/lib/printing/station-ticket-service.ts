import { canUseDemoExperience } from "@/lib/env";
import { getDemoRestaurantStore } from "@/lib/demo/restaurant-store";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { PERMISSIONS, requirePermission, type AuthContext } from "@/lib/auth/permissions";
import { catalogService } from "@/lib/catalog/service";
import { fetchOrderById } from "@/lib/orders/supabase-repository";
import type { Order } from "@/lib/orders/types";
import {
  printBarTicket,
  printKitchenTicket,
} from "@/lib/printing/index";
import {
  buildPerStationTicketPdfs,
  buildStationTicketsPdf,
  bytesToBase64,
} from "@/lib/printing/pdf-station-tickets";
import { buildStationTicket } from "@/lib/printing/station-ticket";
import { selectOrderItemsForStationTickets } from "@/lib/printing/order-ticket-items";
import { splitOrderItemsByPrintStation } from "@/lib/printing/station-routing";
import type { PrintStation } from "@/lib/printing/station-routing";

export type StationTicketPrintPayload = {
  combinedPdfBase64: string;
  stationPdfs: Array<{ station: PrintStation; pdfBase64: string }>;
  stations: PrintStation[];
};

async function loadOrderForPrint(
  context: AuthContext,
  restaurantId: string,
  orderId: string,
): Promise<Order> {
  if (canUseDemoExperience()) {
    const order = getDemoRestaurantStore().orders.find((o) => o.id === orderId);
    if (!order || order.restaurantId !== restaurantId) {
      throw new Error("ORDER_NOT_FOUND");
    }
    return structuredClone(order);
  }
  const order = await fetchOrderById(orderId);
  if (!order || order.restaurantId !== restaurantId) {
    throw new Error("ORDER_NOT_FOUND");
  }
  return order;
}

export async function buildStationTicketPrintPayload(
  context: AuthContext,
  input: {
    restaurantId: string;
    orderId: string;
    itemIds?: string[];
    reprint?: boolean;
  },
): Promise<StationTicketPrintPayload | null> {
  requirePermission(context, PERMISSIONS.ORDERS_MODIFY, input.restaurantId);

  const [order, catalog] = await Promise.all([
    loadOrderForPrint(context, input.restaurantId, input.orderId),
    catalogService.getSnapshot(context, input.restaurantId),
  ]);

  let items = selectOrderItemsForStationTickets(order.items);
  if (input.itemIds?.length) {
    const idSet = new Set(input.itemIds);
    items = items.filter((item) => idSet.has(item.id));
  }
  if (items.length === 0) return null;

  const { kitchen, bar } = splitOrderItemsByPrintStation(items, catalog);
  const sentAt = new Date();
  const tickets = (
    [
      buildStationTicket("kitchen", order, kitchen, sentAt, {
        reprint: input.reprint,
      }),
      buildStationTicket("bar", order, bar, sentAt, {
        reprint: input.reprint,
      }),
    ] as const
  ).filter((t): t is NonNullable<typeof t> => t != null);

  if (tickets.length === 0) return null;

  const [combinedBytes, perStation] = await Promise.all([
    buildStationTicketsPdf(tickets),
    buildPerStationTicketPdfs(tickets),
  ]);

  const printPayload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    tableLabel: order.tableLabel,
    itemIds: items.map((i) => i.id),
    sentAt: sentAt.toISOString(),
    reprint: input.reprint ?? false,
  };

  for (const ticket of tickets) {
    const job = {
      restaurantId: input.restaurantId,
      payload: { ...printPayload, station: ticket.station },
    };
    if (ticket.station === "kitchen") {
      await printKitchenTicket(job);
    } else {
      await printBarTicket(job);
    }
  }

  return {
    combinedPdfBase64: bytesToBase64(combinedBytes),
    stationPdfs: perStation.map(({ station, bytes }) => ({
      station,
      pdfBase64: bytesToBase64(bytes),
    })),
    stations: tickets.map((t) => t.station),
  };
}

export async function buildStationTicketPrintPayloadForUser(input: {
  orderId: string;
  itemIds?: string[];
  reprint?: boolean;
}): Promise<{ error?: string; print?: StationTicketPrintPayload | null }> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    const print = await buildStationTicketPrintPayload(context, {
      restaurantId,
      orderId: input.orderId,
      itemIds: input.itemIds,
      reprint: input.reprint,
    });
    return { print };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "No tienes permiso." };
    }
    return { error: "No pudimos generar los tickets." };
  }
}
