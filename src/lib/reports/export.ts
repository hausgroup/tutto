import { calendarDateInBogota } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/money";

export const EXPORT_REPORT_KINDS = [
  "daily_sales",
  "product_sales",
  "payments_by_method",
  "orders_detail",
] as const;

export type ExportReportKind = (typeof EXPORT_REPORT_KINDS)[number];

export const EXPORT_REPORT_LABELS: Record<ExportReportKind, string> = {
  daily_sales: "Ventas diarias",
  product_sales: "Ventas por producto",
  payments_by_method: "Pagos por método",
  orders_detail: "Detalle de pedidos",
};

export type ExportSaleRow = {
  orderId: string;
  orderNumber: number;
  tableLabel: string | null;
  closedAt: string;
  totalMinor: number;
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  status: string;
  paymentMethod: string | null;
  items: { productName: string; quantity: number; lineTotalMinor: number }[];
};

function csvEscape(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replaceAll('"', '""')}"`;
  return raw;
}

function toCsv(headers: string[], rows: (string | number | null)[][]) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}

function inRange(iso: string, from: string, to: string) {
  const day = calendarDateInBogota(iso);
  return day >= from && day <= to;
}

export function buildReportCsv(
  kind: ExportReportKind,
  sales: ExportSaleRow[],
  from: string,
  to: string,
): { filename: string; csv: string } {
  const filtered = sales.filter((sale) => inRange(sale.closedAt, from, to));

  if (kind === "daily_sales") {
    const byDay = new Map<string, { orders: number; total: number }>();
    for (const sale of filtered) {
      const day = calendarDateInBogota(sale.closedAt);
      const current = byDay.get(day) ?? { orders: 0, total: 0 };
      current.orders += 1;
      current.total += sale.totalMinor;
      byDay.set(day, current);
    }
    const rows = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, agg]) => [day, agg.orders, agg.total, formatCurrency(agg.total)]);
    return {
      filename: `ventas-diarias_${from}_${to}.csv`,
      csv: toCsv(["fecha", "pedidos", "total_minor", "total"], rows),
    };
  }

  if (kind === "product_sales") {
    const byProduct = new Map<
      string,
      { quantity: number; revenue: number }
    >();
    for (const sale of filtered) {
      for (const item of sale.items) {
        const current = byProduct.get(item.productName) ?? {
          quantity: 0,
          revenue: 0,
        };
        current.quantity += item.quantity;
        current.revenue += item.lineTotalMinor;
        byProduct.set(item.productName, current);
      }
    }
    const rows = [...byProduct.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([name, agg]) => [
        name,
        agg.quantity,
        agg.revenue,
        formatCurrency(agg.revenue),
      ]);
    return {
      filename: `ventas-producto_${from}_${to}.csv`,
      csv: toCsv(["producto", "cantidad", "ingresos_minor", "ingresos"], rows),
    };
  }

  if (kind === "payments_by_method") {
    const byMethod = new Map<string, number>();
    for (const sale of filtered) {
      const method = sale.paymentMethod ?? "desconocido";
      byMethod.set(method, (byMethod.get(method) ?? 0) + sale.totalMinor);
    }
    const rows = [...byMethod.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([method, total]) => [method, total, formatCurrency(total)]);
    return {
      filename: `pagos-metodo_${from}_${to}.csv`,
      csv: toCsv(["metodo", "total_minor", "total"], rows),
    };
  }

  const rows = filtered.flatMap((sale) => {
    if (sale.items.length === 0) {
      return [
        [
          sale.orderNumber,
          calendarDateInBogota(sale.closedAt),
          sale.tableLabel,
          sale.paymentMethod,
          "",
          "",
          sale.totalMinor,
          formatCurrency(sale.totalMinor),
        ],
      ];
    }
    return sale.items.map((item) => [
      sale.orderNumber,
      calendarDateInBogota(sale.closedAt),
      sale.tableLabel,
      sale.paymentMethod,
      item.productName,
      item.quantity,
      item.lineTotalMinor,
      formatCurrency(item.lineTotalMinor),
    ]);
  });

  return {
    filename: `detalle-pedidos_${from}_${to}.csv`,
    csv: toCsv(
      [
        "pedido",
        "fecha",
        "mesa",
        "pago",
        "producto",
        "cantidad",
        "linea_minor",
        "linea",
      ],
      rows,
    ),
  };
}
