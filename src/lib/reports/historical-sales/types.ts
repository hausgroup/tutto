export type HistoricalSaleLine = {
  productName: string;
  quantity: number;
  lineTotalMinor: number;
  preparationStation?: string;
};

export type HistoricalSaleRecord = {
  id: string;
  restaurantId: string;
  importId: string | null;
  sourceKey: string;
  closedAt: string;
  orderNumber: number | null;
  tableLabel: string | null;
  paymentMethod: string | null;
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  items: HistoricalSaleLine[];
};

export const IMPORT_PROFILE_IDS = [
  "auto",
  "haus_daily_sales",
  "haus_product_sales",
  "haus_orders_detail",
  "haus_payments_by_method",
  "generic_order_lines",
  "generic_daily_totals",
] as const;

export type ImportProfileId = (typeof IMPORT_PROFILE_IDS)[number];

export const IMPORT_PROFILE_LABELS: Record<ImportProfileId, string> = {
  auto: "Detectar automáticamente",
  haus_daily_sales: "Haus — ventas diarias (CSV)",
  haus_product_sales: "Haus — ventas por producto (CSV)",
  haus_orders_detail: "Haus — detalle de pedidos (CSV)",
  haus_payments_by_method: "Haus — pagos por método (CSV)",
  generic_order_lines: "Genérico — líneas por pedido (CSV/XML)",
  generic_daily_totals: "Genérico — totales diarios (CSV/XML)",
};

export type ImportPreview = {
  fileFormat: "csv" | "xml";
  detectedProfile: ImportProfileId;
  suggestedProfile: ImportProfileId;
  saleCount: number;
  dateRange: { from: string; to: string } | null;
  totalMinor: number;
  sampleSales: {
    closedAt: string;
    orderNumber: number | null;
    totalMinor: number;
    paymentMethod: string | null;
    itemCount: number;
  }[];
  warnings: string[];
};
