import type { PreparationStation } from "@/lib/catalog/types";

export type OrderStatus =
  | "open"
  | "in_progress"
  | "ready"
  | "completed"
  | "voided";

export type OrderItemStatus =
  | "pending"
  | "sent"
  | "in_progress"
  | "ready"
  | "delivered"
  | "cancelled";

export type DrinkServeTiming = "immediate" | "with_meal";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type OrderItemModifier = {
  id: string;
  modifierName: string;
  priceMinorDelta: number;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  taxRateBps: number;
  lineSubtotalMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
  status: OrderItemStatus;
  preparationStation: PreparationStation;
  /** Bar drinks: serve now vs with the meal. */
  serveTiming: DrinkServeTiming | null;
  notes: string | null;
  modifiers: OrderItemModifier[];
};

export type Order = {
  id: string;
  restaurantId: string;
  tableId: string | null;
  tableLabel: string | null;
  orderNumber: number;
  status: OrderStatus;
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  items: OrderItem[];
};

export type Payment = {
  id: string;
  restaurantId: string;
  orderId: string;
  methodCode: string;
  amountMinor: number;
  status: PaymentStatus;
  createdAt: string;
};

export type CashierSessionStatus = "open" | "closed";

export type CashierSession = {
  id: string;
  restaurantId: string;
  status: CashierSessionStatus;
  openingCashMinor: number;
  expectedCashMinor: number | null;
  actualCashMinor: number | null;
  cashSalesMinor: number;
  cardSalesMinor: number;
  transferSalesMinor: number;
  openedAt: string;
  closedAt: string | null;
};

export type SalesReportSummary = {
  grossSalesMinor: number;
  netSalesMinor: number;
  taxMinor: number;
  orderCount: number;
  averageOrderMinor: number;
  paymentsByMethod: Record<string, number>;
};
