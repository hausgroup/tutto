import { calculateLineItem, sumOrderTotals } from "@/lib/orders/calculate";
import type { Order, Payment } from "@/lib/orders/types";
import { currentYearMonthInBogota } from "@/lib/orders/reports";
import { calendarDateInBogota } from "@/lib/utils/date";
import { DEMO_RESTAURANT_ID } from "@/lib/floor/demo-data";

type SampleProduct = {
  id: string;
  name: string;
  priceMinor: number;
  taxRateBps: number;
  preparationStation: "kitchen" | "bar";
};

/** Deterministic sample sales so Reportes looks populated in demo mode. */
export function createDemoSampleSales(input: {
  products: SampleProduct[];
  yearMonth?: string;
}): { orders: Order[]; payments: Payment[] } {
  const restaurantId = DEMO_RESTAURANT_ID;
  const yearMonth = input.yearMonth ?? currentYearMonthInBogota();
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const today = Number(calendarDateInBogota(new Date()).split("-")[2]);

  const burger = input.products.find((p) => p.name.includes("Burger"));
  const beer = input.products.find((p) => p.name.includes("Cerveza"));
  const coffee = input.products.find((p) => p.name.includes("Café"));
  if (!burger || !beer || !coffee) {
    return { orders: [], payments: [] };
  }

  const templates: Array<{
    day: number;
    hour: number;
    method: string;
    lines: Array<{ product: SampleProduct; qty: number }>;
  }> = [];

  // Varied intensity across the month (heavier weekends / lunch & dinner peaks)
  for (let day = 1; day <= Math.min(daysInMonth, today); day++) {
    const date = new Date(`${yearMonth}-${String(day).padStart(2, "0")}T12:00:00-05:00`);
    const weekday = date.getUTCDay(); // approx; fine for pattern
    const isWeekend = weekday === 0 || weekday === 6;
    const orderCount = isWeekend ? 3 + (day % 2) : 1 + (day % 3 === 0 ? 1 : 0);

    for (let i = 0; i < orderCount; i++) {
      const hour = i === 0 ? 12 + (day % 3) : i === 1 ? 19 + (day % 2) : 21;
      const lines =
        i % 3 === 0
          ? [
              { product: burger, qty: 1 + (day % 2) },
              { product: beer, qty: 2 },
            ]
          : i % 3 === 1
            ? [
                { product: coffee, qty: 1 },
                { product: burger, qty: 1 },
              ]
            : [
                { product: beer, qty: 1 + (day % 3) },
                { product: coffee, qty: day % 2 === 0 ? 1 : 0 },
              ].filter((l) => l.qty > 0);

      templates.push({
        day,
        hour,
        method: i % 3 === 0 ? "cash" : i % 3 === 1 ? "card" : "transfer",
        lines,
      });
    }
  }

  // Guarantee a few weak coffee-only days so “worst sellers” is meaningful
  if (today >= 4) {
    templates.push({
      day: 2,
      hour: 10,
      method: "cash",
      lines: [{ product: coffee, qty: 1 }],
    });
  }

  const orders: Order[] = [];
  const payments: Payment[] = [];

  templates.forEach((tpl, index) => {
    const orderId = `demo-report-order-${String(index + 1).padStart(3, "0")}`;
    const dayStr = String(tpl.day).padStart(2, "0");
    const hourStr = String(tpl.hour).padStart(2, "0");
    const openedAt = `${yearMonth}-${dayStr}T${hourStr}:05:00.000-05:00`;
    const closedAt = `${yearMonth}-${dayStr}T${hourStr}:42:00.000-05:00`;

    const items = tpl.lines.map((line, lineIndex) => {
      const totals = calculateLineItem({
        unitPriceMinor: line.product.priceMinor,
        quantity: line.qty,
        taxRateBps: line.product.taxRateBps,
      });
      return {
        id: `${orderId}-item-${lineIndex + 1}`,
        orderId,
        productId: line.product.id,
        productName: line.product.name,
        quantity: line.qty,
        unitPriceMinor: line.product.priceMinor,
        taxRateBps: line.product.taxRateBps,
        lineSubtotalMinor: totals.lineSubtotalMinor,
        lineTaxMinor: totals.lineTaxMinor,
        lineTotalMinor: totals.lineTotalMinor,
        status: "delivered" as const,
        preparationStation: line.product.preparationStation,
        notes: null,
        serveTiming: null,
        modifiers: [],
      };
    });

    const totals = sumOrderTotals(items);
    orders.push({
      id: orderId,
      restaurantId,
      tableId: null,
      tableLabel: null,
      orderNumber: 2000 + index,
      status: "completed",
      subtotalMinor: totals.subtotalMinor,
      taxMinor: totals.taxMinor,
      discountMinor: 0,
      totalMinor: totals.totalMinor,
      notes: null,
      openedAt,
      closedAt,
      items,
    });

    payments.push({
      id: `${orderId}-pay`,
      restaurantId,
      orderId,
      methodCode: tpl.method,
      amountMinor: totals.totalMinor,
      status: "completed",
      createdAt: closedAt,
    });
  });

  return { orders, payments };
}
