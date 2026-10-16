import type { CatalogSnapshot } from "@/lib/catalog/types";
import type { Order } from "@/lib/orders/types";
import { selectOrderItemsForStationTickets } from "@/lib/printing/order-ticket-items";
import {
  buildPerStationTicketPdfs,
  buildStationTicketsPdf,
} from "@/lib/printing/pdf-station-tickets";
import { buildStationTicket } from "@/lib/printing/station-ticket";
import type { PrintStation } from "@/lib/printing/station-routing";
import { splitOrderItemsByPrintStation } from "@/lib/printing/station-routing";
import type { StationTicket } from "@/lib/printing/station-ticket";

export type StationTicketPdfPayload = {
  combinedBytes?: Uint8Array;
  stationPdfs?: Array<{ station: PrintStation; bytes: Uint8Array }>;
  tickets: StationTicket[];
  itemIds: string[];
};

export async function buildStationTicketPdfsFromOrder(
  order: Order,
  catalog: CatalogSnapshot,
  input: {
    itemIds?: string[];
    reprint?: boolean;
    attendantName?: string | null;
  },
): Promise<StationTicketPdfPayload | null> {
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
        attendantName: input.attendantName,
      }),
      buildStationTicket("bar", order, bar, sentAt, {
        reprint: input.reprint,
        attendantName: input.attendantName,
      }),
    ] as const
  ).filter((t): t is NonNullable<typeof t> => t != null);

  if (tickets.length === 0) return null;

  if (tickets.length === 1) {
    const stationPdfs = await buildPerStationTicketPdfs(tickets);
    return {
      stationPdfs,
      tickets,
      itemIds: items.map((i) => i.id),
    };
  }

  const combinedBytes = await buildStationTicketsPdf(tickets);
  return {
    combinedBytes,
    tickets,
    itemIds: items.map((i) => i.id),
  };
}
