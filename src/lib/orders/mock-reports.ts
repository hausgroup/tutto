import { calculateLineItem, sumOrderTotals } from "@/lib/orders/calculate";
import {
  aggregateRestaurantReports,
  currentYearMonthInBogota,
  type RestaurantReports,
} from "@/lib/orders/reports";
import type { Order, Payment } from "@/lib/orders/types";
import { calendarDateInBogota } from "@/lib/utils/date";

type MockProduct = {
  id: string;
  name: string;
  priceMinor: number;
  taxRateBps: number;
  preparationStation: "kitchen" | "bar" | "dessert";
  weight: number;
};

const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "mock-burger",
    name: "Classic Burger",
    priceMinor: 28000,
    taxRateBps: 800,
    preparationStation: "kitchen",
    weight: 10,
  },
  {
    id: "mock-smash",
    name: "Smash Burger",
    priceMinor: 32000,
    taxRateBps: 800,
    preparationStation: "kitchen",
    weight: 8,
  },
  {
    id: "mock-ribs",
    name: "Costillas BBQ",
    priceMinor: 48000,
    taxRateBps: 800,
    preparationStation: "kitchen",
    weight: 5,
  },
  {
    id: "mock-salad",
    name: "Ensalada César",
    priceMinor: 22000,
    taxRateBps: 800,
    preparationStation: "kitchen",
    weight: 3,
  },
  {
    id: "mock-beer",
    name: "Cerveza artesanal",
    priceMinor: 14000,
    taxRateBps: 800,
    preparationStation: "bar",
    weight: 9,
  },
  {
    id: "mock-cocktail",
    name: "Cóctel de la casa",
    priceMinor: 26000,
    taxRateBps: 800,
    preparationStation: "bar",
    weight: 6,
  },
  {
    id: "mock-coffee",
    name: "Café americano",
    priceMinor: 7000,
    taxRateBps: 800,
    preparationStation: "bar",
    weight: 4,
  },
  {
    id: "mock-lemonade",
    name: "Limonada natural",
    priceMinor: 9000,
    taxRateBps: 800,
    preparationStation: "bar",
    weight: 5,
  },
  {
    id: "mock-brownie",
    name: "Brownie con helado",
    priceMinor: 16000,
    taxRateBps: 800,
    preparationStation: "dessert",
    weight: 3,
  },
  {
    id: "mock-cheesecake",
    name: "Cheesecake",
    priceMinor: 18000,
    taxRateBps: 800,
    preparationStation: "dessert",
    weight: 2,
  },
  {
    id: "mock-soup",
    name: "Sopa del día",
    priceMinor: 15000,
    taxRateBps: 800,
    preparationStation: "kitchen",
    weight: 1,
  },
  {
    id: "mock-kids",
    name: "Menú infantil",
    priceMinor: 19000,
    taxRateBps: 800,
    preparationStation: "kitchen",
    weight: 1,
  },
];

function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pickProducts(seed: number, count: number): MockProduct[] {
  const weighted = MOCK_PRODUCTS.flatMap((p) =>
    Array.from({ length: p.weight }, () => p),
  );
  const picked: MockProduct[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(pseudoRandom(seed + i * 17) * weighted.length);
    picked.push(weighted[idx]!);
  }
  return picked;
}

function weekdayInBogota(yearMonth: string, day: number) {
  return new Date(
    `${yearMonth}-${String(day).padStart(2, "0")}T12:00:00-05:00`,
  ).getUTCDay();
}

/** Rich mock month of sales for UI preview before launch. */
let mockReportsCache: { yearMonth: string; reports: RestaurantReports } | null =
  null;

export function buildMockRestaurantReports(
  yearMonth = currentYearMonthInBogota(),
): RestaurantReports {
  if (mockReportsCache?.yearMonth === yearMonth) {
    return mockReportsCache.reports;
  }

  const restaurantId = "mock-restaurant";
  const [yearStr, monthStr] = yearMonth.split("-");
  const daysInMonth = new Date(
    Date.UTC(Number(yearStr), Number(monthStr), 0),
  ).getUTCDate();
  const todayKey = calendarDateInBogota(new Date());
  const todayDay = todayKey.startsWith(yearMonth)
    ? Number(todayKey.split("-")[2])
    : daysInMonth;

  const orders: Order[] = [];
  const payments: Payment[] = [];
  let orderIndex = 0;

  for (let day = 1; day <= Math.min(daysInMonth, todayDay); day++) {
    const weekday = weekdayInBogota(yearMonth, day);
    const isWeekend = weekday === 0 || weekday === 6;
    const baseOrders = isWeekend ? 8 : 4 + (day % 3);
    // Mid-month and Fridays spike for a vivid heatmap
    const spike =
      weekday === 5 ? 4 : day === 12 || day === 20 || day === 27 ? 5 : 0;
    const dayOrders = baseOrders + spike;

    for (let i = 0; i < dayOrders; i++) {
      orderIndex += 1;
      const seed = day * 100 + i;
      const hourPool = isWeekend
        ? [11, 12, 13, 14, 18, 19, 20, 21, 22]
        : [12, 13, 13, 14, 19, 20, 20, 21];
      const hour = hourPool[Math.floor(pseudoRandom(seed) * hourPool.length)]!;
      const lineCount = 1 + Math.floor(pseudoRandom(seed + 3) * 3);
      const products = pickProducts(seed, lineCount);

      const dayStr = String(day).padStart(2, "0");
      const hourStr = String(hour).padStart(2, "0");
      const openedAt = `${yearMonth}-${dayStr}T${hourStr}:08:00.000-05:00`;
      const durationMin = 25 + Math.floor(pseudoRandom(seed + 9) * 50);
      const closeHour = hour + Math.floor(durationMin / 60);
      const closeMin = (8 + durationMin) % 60;
      const closedAt = `${yearMonth}-${dayStr}T${String(Math.min(closeHour, 23)).padStart(2, "0")}:${String(closeMin).padStart(2, "0")}:00.000-05:00`;

      const orderId = `mock-order-${orderIndex}`;
      const items = products.map((product, lineIndex) => {
        const qty = 1 + Math.floor(pseudoRandom(seed + lineIndex * 7) * 2);
        const totals = calculateLineItem({
          unitPriceMinor: product.priceMinor,
          quantity: qty,
          taxRateBps: product.taxRateBps,
        });
        return {
          id: `${orderId}-item-${lineIndex + 1}`,
          orderId,
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPriceMinor: product.priceMinor,
          taxRateBps: product.taxRateBps,
          lineSubtotalMinor: totals.lineSubtotalMinor,
          lineTaxMinor: totals.lineTaxMinor,
          lineTotalMinor: totals.lineTotalMinor,
          status: "delivered" as const,
          preparationStation: product.preparationStation,
          notes: null,
          serveTiming: null,
          modifiers: [],
        };
      });

      const totals = sumOrderTotals(items);
      const discountMinor =
        pseudoRandom(seed + 11) > 0.92
          ? Math.round(totals.totalMinor * 0.1)
          : 0;

      orders.push({
        id: orderId,
        restaurantId,
        tableId: null,
        tableLabel: null,
        orderNumber: 3000 + orderIndex,
        status: "completed",
        subtotalMinor: totals.subtotalMinor,
        taxMinor: totals.taxMinor,
        discountMinor,
        totalMinor: totals.totalMinor - discountMinor,
        notes: null,
        openedAt,
        closedAt,
        items,
      });

      const method =
        pseudoRandom(seed + 13) > 0.55
          ? "card"
          : pseudoRandom(seed + 15) > 0.5
            ? "cash"
            : "transfer";

      payments.push({
        id: `${orderId}-pay`,
        restaurantId,
        orderId,
        methodCode: method,
        amountMinor: totals.totalMinor - discountMinor,
        status: "completed",
        createdAt: closedAt,
      });
    }
  }

  // A couple of voided tickets for the KPI card
  for (let v = 1; v <= 3; v++) {
    const day = Math.min(todayDay, 3 + v * 4);
    const dayStr = String(day).padStart(2, "0");
    orders.push({
      id: `mock-void-${v}`,
      restaurantId,
      tableId: null,
      tableLabel: null,
      orderNumber: 2900 + v,
      status: "voided",
      subtotalMinor: 20000,
      taxMinor: 1600,
      discountMinor: 0,
      totalMinor: 21600,
      notes: "Anulado (mock)",
      openedAt: `${yearMonth}-${dayStr}T15:00:00.000-05:00`,
      closedAt: `${yearMonth}-${dayStr}T15:20:00.000-05:00`,
      items: [],
    });
  }

  const reports = aggregateRestaurantReports({ orders, payments, yearMonth });
  mockReportsCache = { yearMonth, reports };
  return reports;
}
