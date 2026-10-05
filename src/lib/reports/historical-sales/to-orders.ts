import type { PreparationStation } from "@/lib/catalog/types";
import type { Order, Payment } from "@/lib/orders/types";
import type { ExportSaleRow } from "@/lib/reports/export";
import type { HistoricalSaleRecord } from "@/lib/reports/historical-sales/types";
import { IMPORTED_PRODUCT_ID } from "@/lib/reports/import/normalize";

function stationFromRaw(raw?: string): PreparationStation {
  const value = (raw ?? "kitchen").toLowerCase();
  if (value === "bar" || value === "barra") return "bar";
  if (value === "dessert" || value === "postres") return "dessert";
  if (value === "pastry" || value === "reposteria") return "dessert";
  if (value === "other" || value === "otra") return "other";
  return "kitchen";
}

export function historicalRecordsToOrdersAndPayments(
  records: HistoricalSaleRecord[],
): { orders: Order[]; payments: Payment[] } {
  const orders: Order[] = [];
  const payments: Payment[] = [];

  for (const record of records) {
    const orderId = `historical-${record.id}`;
    const openedAt = record.closedAt;
    orders.push({
      id: orderId,
      restaurantId: record.restaurantId,
      tableId: null,
      tableLabel: record.tableLabel,
      orderNumber: record.orderNumber ?? 0,
      status: "completed",
      subtotalMinor: record.subtotalMinor,
      taxMinor: record.taxMinor,
      discountMinor: record.discountMinor,
      totalMinor: record.totalMinor,
      notes: "Importación histórica",
      openedAt,
      closedAt: record.closedAt,
      items: record.items.map((line, index) => ({
        id: `${orderId}-line-${index}`,
        orderId,
        productId: IMPORTED_PRODUCT_ID,
        productName: line.productName,
        quantity: line.quantity,
        unitPriceMinor: Math.round(line.lineTotalMinor / line.quantity),
        taxRateBps: 0,
        lineSubtotalMinor: line.lineTotalMinor,
        lineTaxMinor: 0,
        lineTotalMinor: line.lineTotalMinor,
        status: "delivered",
        preparationStation: stationFromRaw(line.preparationStation),
        serveTiming: null,
        notes: null,
        modifiers: [],
      })),
    });

    if (record.paymentMethod && record.totalMinor > 0) {
      payments.push({
        id: `historical-pay-${record.id}`,
        restaurantId: record.restaurantId,
        orderId,
        methodCode: record.paymentMethod,
        amountMinor: record.totalMinor,
        status: "completed",
        createdAt: record.closedAt,
      });
    }
  }

  return { orders, payments };
}

export function historicalRecordsToExportRows(
  records: HistoricalSaleRecord[],
): ExportSaleRow[] {
  return records.map((record) => ({
    orderId: `historical-${record.id}`,
    orderNumber: record.orderNumber ?? 0,
    tableLabel: record.tableLabel,
    closedAt: record.closedAt,
    totalMinor: record.totalMinor,
    subtotalMinor: record.subtotalMinor,
    taxMinor: record.taxMinor,
    discountMinor: record.discountMinor,
    status: "completed",
    paymentMethod: record.paymentMethod,
    items: record.items.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      lineTotalMinor: line.lineTotalMinor,
    })),
  }));
}
