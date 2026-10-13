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
import { buildStationTicketPdfsFromOrder } from "@/lib/printing/build-station-ticket-pdfs";
import {
  printBarTicket,
  printKitchenTicket,
} from "@/lib/printing/index";
import { bytesToBase64 } from "@/lib/printing/pdf-station-tickets";
import type { PrintStation } from "@/lib/printing/station-routing";

export type StationTicketPrintPayload = {
  combinedPdfBase64?: string;
  stationPdfs?: Array<{ station: PrintStation; pdfBase64: string }>;
  stations: PrintStation[];
};

async function loadOrderForPrint(
  context: AuthContext,
  restaurantId: string,
  orderId: string,
): Promise<Order> {
  if (canUseDemoExperience()) {
    const order = getDemoRestaurantStore(restaurantId).orders.find(
      (o) => o.id === orderId,
    );
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

  const built = await buildStationTicketPdfsFromOrder(order, catalog, {
    itemIds: input.itemIds,
    reprint: input.reprint,
  });
  if (!built) return null;

  const sentAt = built.tickets[0]?.sentAt ?? new Date().toISOString();
  const printPayload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    tableLabel: order.tableLabel,
    itemIds: built.itemIds,
    sentAt,
    reprint: input.reprint ?? false,
  };

  void Promise.all(
    built.tickets.map((ticket) => {
      const job = {
        restaurantId: input.restaurantId,
        payload: { ...printPayload, station: ticket.station },
      };
      return ticket.station === "kitchen"
        ? printKitchenTicket(job)
        : printBarTicket(job);
    }),
  );

  return {
    combinedPdfBase64: built.combinedBytes
      ? bytesToBase64(built.combinedBytes)
      : undefined,
    stationPdfs: built.stationPdfs?.map(({ station, bytes }) => ({
      station,
      pdfBase64: bytesToBase64(bytes),
    })),
    stations: built.tickets.map((t) => t.station),
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
