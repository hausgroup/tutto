import { describe, expect, it } from "vitest";
import { buildReportCsv, type ExportSaleRow } from "@/lib/reports/export";

const sales: ExportSaleRow[] = [
  {
    orderId: "o1",
    orderNumber: 1,
    tableLabel: "A1",
    closedAt: "2026-09-10T18:00:00.000-05:00",
    totalMinor: 32400,
    subtotalMinor: 30000,
    taxMinor: 2400,
    discountMinor: 0,
    status: "completed",
    paymentMethod: "cash",
    items: [
      { productName: "Burger", quantity: 1, lineTotalMinor: 30240 },
      { productName: "Cerveza", quantity: 1, lineTotalMinor: 2160 },
    ],
  },
  {
    orderId: "o2",
    orderNumber: 2,
    tableLabel: "B2",
    closedAt: "2026-09-11T20:00:00.000-05:00",
    totalMinor: 15000,
    subtotalMinor: 14000,
    taxMinor: 1000,
    discountMinor: 0,
    status: "completed",
    paymentMethod: "card",
    items: [{ productName: "Burger", quantity: 1, lineTotalMinor: 15000 }],
  },
];

describe("buildReportCsv", () => {
  it("aggregates daily sales in range", () => {
    const { csv, filename } = buildReportCsv(
      "daily_sales",
      sales,
      "2026-09-10",
      "2026-09-11",
    );
    expect(filename).toContain("ventas-diarias");
    expect(csv).toContain("2026-09-10");
    expect(csv).toContain("2026-09-11");
  });

  it("filters out days outside range", () => {
    const { csv } = buildReportCsv(
      "daily_sales",
      sales,
      "2026-09-11",
      "2026-09-11",
    );
    expect(csv).not.toContain("2026-09-10");
    expect(csv).toContain("2026-09-11");
  });
});
