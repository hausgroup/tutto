import type { HistoricalSaleRecord } from "@/lib/reports/historical-sales/types";

const store = new Map<string, HistoricalSaleRecord[]>();

export function getDemoHistoricalSales(restaurantId: string) {
  return store.get(restaurantId) ?? [];
}

export function appendDemoHistoricalSales(
  restaurantId: string,
  records: HistoricalSaleRecord[],
) {
  const current = store.get(restaurantId) ?? [];
  const byKey = new Map(current.map((r) => [r.sourceKey, r]));
  for (const record of records) {
    byKey.set(record.sourceKey, record);
  }
  store.set(restaurantId, [...byKey.values()]);
}
