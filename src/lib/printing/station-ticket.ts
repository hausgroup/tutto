import { DRINK_SERVE_LABELS } from "@/lib/orders/drink-serve";
import type { Order, OrderItem } from "@/lib/orders/types";
import type { PrintStation } from "@/lib/printing/station-routing";

export type StationTicketLine = {
  quantity: number;
  name: string;
  /** Shown under the line (e.g. Comida timing for bar drinks). */
  note: string | null;
  modifiers: string[];
};

export type StationTicket = {
  station: PrintStation;
  title: string;
  orderNumber: number;
  tableLabel: string | null;
  openedAt: string;
  sentAt: string;
  reprint?: boolean;
  lines: StationTicketLine[];
};

const STATION_TITLES: Record<PrintStation, string> = {
  kitchen: "Cocina",
  bar: "Bar",
};

function lineNote(item: OrderItem): string | null {
  if (item.serveTiming === "with_meal") {
    return "Comida — servir con el resto del pedido";
  }
  if (item.serveTiming === "immediate") {
    return DRINK_SERVE_LABELS.immediate.title;
  }
  return item.notes;
}

export function buildStationTicket(
  station: PrintStation,
  order: Pick<Order, "orderNumber" | "tableLabel" | "openedAt">,
  items: OrderItem[],
  sentAt: Date = new Date(),
  options?: { reprint?: boolean },
): StationTicket | null {
  if (items.length === 0) return null;
  return {
    station,
    title: STATION_TITLES[station],
    orderNumber: order.orderNumber,
    tableLabel: order.tableLabel,
    openedAt: order.openedAt,
    sentAt: sentAt.toISOString(),
    reprint: options?.reprint,
    lines: items.map((item) => ({
      quantity: item.quantity,
      name: item.productName,
      note: lineNote(item),
      modifiers: item.modifiers.map((m) => m.modifierName),
    })),
  };
}
