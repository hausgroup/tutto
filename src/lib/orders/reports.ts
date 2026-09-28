import type { Order, Payment, SalesReportSummary } from "@/lib/orders/types";
import { calendarDateInBogota } from "@/lib/utils/date";

export type ProductSalesRow = {
  productId: string;
  productName: string;
  quantitySold: number;
  revenueMinor: number;
  orderCount: number;
};

export type DaySalesCell = {
  date: string;
  dayOfMonth: number;
  weekday: number;
  grossSalesMinor: number;
  orderCount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  inMonth: boolean;
};

export type HourSalesBucket = {
  hour: number;
  grossSalesMinor: number;
  orderCount: number;
};

export type WeekdaySalesBucket = {
  weekday: number;
  label: string;
  grossSalesMinor: number;
  orderCount: number;
};

export type StationSalesRow = {
  station: string;
  label: string;
  quantitySold: number;
  revenueMinor: number;
};

export type RestaurantReports = SalesReportSummary & {
  yearMonth: string;
  monthLabel: string;
  bestSellers: ProductSalesRow[];
  worstSellers: ProductSalesRow[];
  dailyHeatmap: DaySalesCell[];
  salesByHour: HourSalesBucket[];
  salesByWeekday: WeekdaySalesBucket[];
  salesByStation: StationSalesRow[];
  averageItemsPerOrder: number;
  averageServiceMinutes: number | null;
  voidedOrderCount: number;
  discountTotalMinor: number;
  peakHour: number | null;
  busiestWeekday: string | null;
};

const WEEKDAY_LABELS = [
  "Dom",
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
] as const;

const STATION_LABELS: Record<string, string> = {
  kitchen: "Cocina",
  bar: "Barra",
  dessert: "Postres",
  pastry: "Repostería",
  other: "Otra",
};

const BOGOTA_TZ = "America/Bogota";

function bogotaParts(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayMap[get("weekday")] ?? 0,
    hour,
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export function currentYearMonthInBogota(now = new Date()): string {
  const { year, month } = bogotaParts(now);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function salesIntensity(
  value: number,
  max: number,
): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function isCancelledItem(status: string) {
  return status === "cancelled";
}

export function buildMonthHeatmap(
  dailyTotals: Map<string, { grossSalesMinor: number; orderCount: number }>,
  yearMonth: string,
): DaySalesCell[] {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const firstWeekday = bogotaParts(
    new Date(`${yearMonth}-01T12:00:00-05:00`),
  ).weekday;

  let maxSales = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${yearMonth}-${String(day).padStart(2, "0")}`;
    maxSales = Math.max(maxSales, dailyTotals.get(key)?.grossSalesMinor ?? 0);
  }

  const cells: DaySalesCell[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({
      date: "",
      dayOfMonth: 0,
      weekday: i,
      grossSalesMinor: 0,
      orderCount: 0,
      intensity: 0,
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${yearMonth}-${String(day).padStart(2, "0")}`;
    const totals = dailyTotals.get(date) ?? {
      grossSalesMinor: 0,
      orderCount: 0,
    };
    const weekday = (firstWeekday + day - 1) % 7;
    cells.push({
      date,
      dayOfMonth: day,
      weekday,
      grossSalesMinor: totals.grossSalesMinor,
      orderCount: totals.orderCount,
      intensity: salesIntensity(totals.grossSalesMinor, maxSales),
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    const weekday = cells.length % 7;
    cells.push({
      date: "",
      dayOfMonth: 0,
      weekday,
      grossSalesMinor: 0,
      orderCount: 0,
      intensity: 0,
      inMonth: false,
    });
  }

  return cells;
}

export function aggregateRestaurantReports(input: {
  orders: Order[];
  payments: Payment[];
  yearMonth?: string;
  productLimit?: number;
}): RestaurantReports {
  const yearMonth = input.yearMonth ?? currentYearMonthInBogota();
  const productLimit = input.productLimit ?? 5;
  const monthLabel = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: BOGOTA_TZ,
  }).format(new Date(`${yearMonth}-15T12:00:00-05:00`));

  const completedInMonth = input.orders.filter((order) => {
    if (order.status !== "completed" || !order.closedAt) return false;
    return calendarDateInBogota(order.closedAt).startsWith(yearMonth);
  });

  const voidedOrderCount = input.orders.filter((order) => {
    if (order.status !== "voided") return false;
    const when = order.closedAt ?? order.openedAt;
    return calendarDateInBogota(when).startsWith(yearMonth);
  }).length;

  const completedIds = new Set(completedInMonth.map((o) => o.id));
  const gross = completedInMonth.reduce((s, o) => s + o.totalMinor, 0);
  const tax = completedInMonth.reduce((s, o) => s + o.taxMinor, 0);
  const discountTotalMinor = completedInMonth.reduce(
    (s, o) => s + o.discountMinor,
    0,
  );

  const paymentsByMethod: Record<string, number> = {};
  for (const payment of input.payments) {
    if (!completedIds.has(payment.orderId)) continue;
    if (payment.status !== "completed") continue;
    paymentsByMethod[payment.methodCode] =
      (paymentsByMethod[payment.methodCode] ?? 0) + payment.amountMinor;
  }

  const productMap = new Map<string, ProductSalesRow>();
  const stationMap = new Map<
    string,
    { quantitySold: number; revenueMinor: number }
  >();
  let itemLines = 0;

  for (const order of completedInMonth) {
    const productsInOrder = new Set<string>();
    for (const item of order.items) {
      if (isCancelledItem(item.status)) continue;
      itemLines += item.quantity;
      productsInOrder.add(item.productId);

      const existing = productMap.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        quantitySold: 0,
        revenueMinor: 0,
        orderCount: 0,
      };
      existing.quantitySold += item.quantity;
      existing.revenueMinor += item.lineTotalMinor;
      existing.productName = item.productName;
      productMap.set(item.productId, existing);

      const station = stationMap.get(item.preparationStation) ?? {
        quantitySold: 0,
        revenueMinor: 0,
      };
      station.quantitySold += item.quantity;
      station.revenueMinor += item.lineTotalMinor;
      stationMap.set(item.preparationStation, station);
    }
    for (const productId of productsInOrder) {
      const row = productMap.get(productId);
      if (row) row.orderCount += 1;
    }
  }

  const ranked = [...productMap.values()].sort((a, b) => {
    if (b.quantitySold !== a.quantitySold) {
      return b.quantitySold - a.quantitySold;
    }
    return b.revenueMinor - a.revenueMinor;
  });

  const bestSellers = ranked.slice(0, productLimit);
  const worstSellers =
    ranked.length > productLimit * 2
      ? ranked.slice(-productLimit).reverse()
      : ranked.length <= 1
        ? []
        : ranked.slice(Math.ceil(ranked.length / 2)).reverse();

  const dailyTotals = new Map<
    string,
    { grossSalesMinor: number; orderCount: number }
  >();
  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    grossSalesMinor: 0,
    orderCount: 0,
  }));
  const weekdayBuckets = WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    grossSalesMinor: 0,
    orderCount: 0,
  }));

  let serviceMinutesTotal = 0;
  let serviceSamples = 0;

  for (const order of completedInMonth) {
    const closed = order.closedAt!;
    const parts = bogotaParts(closed);
    const dayKey = parts.dateKey;
    const day = dailyTotals.get(dayKey) ?? {
      grossSalesMinor: 0,
      orderCount: 0,
    };
    day.grossSalesMinor += order.totalMinor;
    day.orderCount += 1;
    dailyTotals.set(dayKey, day);

    hourBuckets[parts.hour].grossSalesMinor += order.totalMinor;
    hourBuckets[parts.hour].orderCount += 1;
    weekdayBuckets[parts.weekday].grossSalesMinor += order.totalMinor;
    weekdayBuckets[parts.weekday].orderCount += 1;

    const openedMs = new Date(order.openedAt).getTime();
    const closedMs = new Date(closed).getTime();
    if (
      Number.isFinite(openedMs) &&
      Number.isFinite(closedMs) &&
      closedMs > openedMs
    ) {
      serviceMinutesTotal += (closedMs - openedMs) / 60_000;
      serviceSamples += 1;
    }
  }

  const peakHourBucket = [...hourBuckets].sort(
    (a, b) => b.grossSalesMinor - a.grossSalesMinor,
  )[0];
  const peakHour =
    peakHourBucket && peakHourBucket.grossSalesMinor > 0
      ? peakHourBucket.hour
      : null;

  const busiest = [...weekdayBuckets].sort(
    (a, b) => b.grossSalesMinor - a.grossSalesMinor,
  )[0];
  const busiestWeekday =
    busiest && busiest.grossSalesMinor > 0 ? busiest.label : null;

  return {
    grossSalesMinor: gross,
    netSalesMinor: gross - tax,
    taxMinor: tax,
    orderCount: completedInMonth.length,
    averageOrderMinor:
      completedInMonth.length > 0
        ? Math.round(gross / completedInMonth.length)
        : 0,
    paymentsByMethod,
    yearMonth,
    monthLabel,
    bestSellers,
    worstSellers,
    dailyHeatmap: buildMonthHeatmap(dailyTotals, yearMonth),
    salesByHour: hourBuckets,
    salesByWeekday: weekdayBuckets,
    salesByStation: [...stationMap.entries()]
      .map(([station, totals]) => ({
        station,
        label: STATION_LABELS[station] ?? station,
        quantitySold: totals.quantitySold,
        revenueMinor: totals.revenueMinor,
      }))
      .sort((a, b) => b.revenueMinor - a.revenueMinor),
    averageItemsPerOrder:
      completedInMonth.length > 0
        ? Math.round((itemLines / completedInMonth.length) * 10) / 10
        : 0,
    averageServiceMinutes:
      serviceSamples > 0
        ? Math.round(serviceMinutesTotal / serviceSamples)
        : null,
    voidedOrderCount,
    discountTotalMinor,
    peakHour,
    busiestWeekday,
  };
}
