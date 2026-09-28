import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PreparationStation } from "@/lib/catalog/types";
import type {
  CashierSession,
  DrinkServeTiming,
  Order,
  OrderItem,
  OrderItemModifier,
  OrderItemStatus,
  OrderStatus,
  Payment,
  SalesReportSummary,
} from "@/lib/orders/types";
import {
  aggregateRestaurantReports,
  type RestaurantReports,
} from "@/lib/orders/reports";
import { isTodayInBogota } from "@/lib/utils/date";
import { calculateLineItem } from "@/lib/orders/calculate";
import { withMealLineMergeKey } from "@/lib/orders/consolidate-lines";

type OrderRow = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  order_number: number;
  status: OrderStatus;
  subtotal_minor: number | string;
  tax_minor: number | string;
  discount_minor: number | string;
  total_minor: number | string;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_minor: number | string;
  tax_rate_bps: number;
  line_subtotal_minor: number | string;
  line_tax_minor: number | string;
  line_total_minor: number | string;
  status: OrderItemStatus;
  preparation_station: PreparationStation;
  notes: string | null;
  serve_timing: DrinkServeTiming | null;
};

type OrderItemModifierRow = {
  id: string;
  order_item_id: string;
  modifier_name: string;
  price_minor_delta: number | string;
};

type PaymentRow = {
  id: string;
  restaurant_id: string;
  order_id: string;
  method_code: string;
  amount_minor: number | string;
  status: string;
  created_at: string;
};

type CashierSessionRow = {
  id: string;
  restaurant_id: string;
  status: "open" | "closed";
  opening_cash_minor: number | string;
  expected_cash_minor: number | string | null;
  actual_cash_minor: number | string | null;
  cash_sales_minor: number | string;
  card_sales_minor: number | string;
  transfer_sales_minor: number | string;
  opened_at: string;
  closed_at: string | null;
};

function mapModifier(row: OrderItemModifierRow): OrderItemModifier {
  return {
    id: row.id,
    modifierName: row.modifier_name,
    priceMinorDelta: Number(row.price_minor_delta),
  };
}

function mapOrderItem(
  row: OrderItemRow,
  modifiers: OrderItemModifier[],
): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitPriceMinor: Number(row.unit_price_minor),
    taxRateBps: row.tax_rate_bps,
    lineSubtotalMinor: Number(row.line_subtotal_minor),
    lineTaxMinor: Number(row.line_tax_minor),
    lineTotalMinor: Number(row.line_total_minor),
    status: row.status,
    preparationStation: row.preparation_station,
    serveTiming: row.serve_timing ?? null,
    notes: row.notes,
    modifiers,
  };
}

async function fetchTableLabel(tableId: string | null): Promise<string | null> {
  if (!tableId) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("label")
    .eq("id", tableId)
    .maybeSingle();
  if (error) throw error;
  return data?.label ?? null;
}

async function loadOrderItems(orderId: string): Promise<OrderItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      "id, order_id, product_id, product_name, quantity, unit_price_minor, tax_rate_bps, line_subtotal_minor, line_tax_minor, line_total_minor, status, preparation_station, serve_timing, notes",
    )
    .eq("order_id", orderId)
    .order("created_at");

  if (itemsError) throw itemsError;
  const itemRows = (items ?? []) as OrderItemRow[];
  if (itemRows.length === 0) return [];

  const itemIds = itemRows.map((i) => i.id);
  const { data: mods, error: modsError } = await supabase
    .from("order_item_modifiers")
    .select("id, order_item_id, modifier_name, price_minor_delta")
    .in("order_item_id", itemIds);

  if (modsError) throw modsError;
  const modsByItem = new Map<string, OrderItemModifier[]>();
  for (const row of (mods ?? []) as OrderItemModifierRow[]) {
    const list = modsByItem.get(row.order_item_id) ?? [];
    list.push(mapModifier(row));
    modsByItem.set(row.order_item_id, list);
  }

  return itemRows.map((row) => mapOrderItem(row, modsByItem.get(row.id) ?? []));
}

async function mapFullOrder(row: OrderRow): Promise<Order> {
  const [tableLabel, items] = await Promise.all([
    fetchTableLabel(row.table_id),
    loadOrderItems(row.id),
  ]);
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    tableId: row.table_id,
    tableLabel,
    orderNumber: row.order_number,
    status: row.status,
    subtotalMinor: Number(row.subtotal_minor),
    taxMinor: Number(row.tax_minor),
    discountMinor: Number(row.discount_minor),
    totalMinor: Number(row.total_minor),
    notes: row.notes,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    items,
  };
}

export async function fetchOpenOrderForTable(
  restaurantId: string,
  tableId: string,
): Promise<Order | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, restaurant_id, table_id, order_number, status, subtotal_minor, tax_minor, discount_minor, total_minor, notes, opened_at, closed_at",
    )
    .eq("restaurant_id", restaurantId)
    .eq("table_id", tableId)
    .in("status", ["open", "in_progress", "ready"])
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapFullOrder(data as OrderRow);
}

export async function insertTableOrder(input: {
  restaurantId: string;
  tableId: string;
  openedBy: string;
}): Promise<Order> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      restaurant_id: input.restaurantId,
      table_id: input.tableId,
      opened_by: input.openedBy,
      status: "open",
    })
    .select(
      "id, restaurant_id, table_id, order_number, status, subtotal_minor, tax_minor, discount_minor, total_minor, notes, opened_at, closed_at",
    )
    .single();

  if (error) throw error;
  return mapFullOrder(data as OrderRow);
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, restaurant_id, table_id, order_number, status, subtotal_minor, tax_minor, discount_minor, total_minor, notes, opened_at, closed_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapFullOrder(data as OrderRow);
}

export async function updateOrderTotals(
  orderId: string,
  totals: {
    subtotalMinor: number;
    taxMinor: number;
    totalMinor: number;
    status?: OrderStatus;
  },
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({
      subtotal_minor: totals.subtotalMinor,
      tax_minor: totals.taxMinor,
      total_minor: totals.totalMinor,
      ...(totals.status ? { status: totals.status } : {}),
    })
    .eq("id", orderId);

  if (error) throw error;
}

export async function voidOpenOrder(orderId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({
      status: "voided",
      closed_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) throw error;
}

export async function insertOrderItem(input: {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceMinor: number;
  taxRateBps: number;
  lineSubtotalMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
  preparationStation: PreparationStation;
  notes?: string | null;
  serveTiming?: DrinkServeTiming | null;
  status?: OrderItemStatus;
  modifiers: { modifierName: string; priceMinorDelta: number }[];
}): Promise<OrderItem> {
  const supabase = await createSupabaseServerClient();
  const itemStatus = input.status ?? "pending";
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .insert({
      order_id: input.orderId,
      product_id: input.productId,
      product_name: input.productName,
      quantity: input.quantity,
      unit_price_minor: input.unitPriceMinor,
      tax_rate_bps: input.taxRateBps,
      line_subtotal_minor: input.lineSubtotalMinor,
      line_tax_minor: input.lineTaxMinor,
      line_total_minor: input.lineTotalMinor,
      preparation_station: input.preparationStation,
      notes: input.notes ?? null,
      serve_timing: input.serveTiming ?? null,
      status: itemStatus,
    })
    .select(
      "id, order_id, product_id, product_name, quantity, unit_price_minor, tax_rate_bps, line_subtotal_minor, line_tax_minor, line_total_minor, status, preparation_station, serve_timing, notes",
    )
    .single();

  if (itemError) throw itemError;
  const itemRow = item as OrderItemRow;

  if (input.modifiers.length > 0) {
    const { error: modError } = await supabase.from("order_item_modifiers").insert(
      input.modifiers.map((m) => ({
        order_item_id: itemRow.id,
        modifier_name: m.modifierName,
        price_minor_delta: m.priceMinorDelta,
      })),
    );
    if (modError) throw modError;
  }

  return mapOrderItem(
    itemRow,
    input.modifiers.map((m, index) => ({
      id: `local-${index}`,
      modifierName: m.modifierName,
      priceMinorDelta: m.priceMinorDelta,
    })),
  );
}

export async function updateOrderItemLine(input: {
  itemId: string;
  quantity: number;
  lineSubtotalMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("order_items")
    .update({
      quantity: input.quantity,
      line_subtotal_minor: input.lineSubtotalMinor,
      line_tax_minor: input.lineTaxMinor,
      line_total_minor: input.lineTotalMinor,
    })
    .eq("id", input.itemId);
  if (error) throw error;
}

export async function updateOrderItemServeTiming(input: {
  itemId: string;
  serveTiming: DrinkServeTiming;
  status: OrderItemStatus;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("order_items")
    .update({
      serve_timing: input.serveTiming,
      status: input.status,
    })
    .eq("id", input.itemId);

  if (error) throw error;
}

export async function deleteOrderItem(itemId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("id", itemId);
  if (error) throw error;
}

export async function mergeDuplicateWithMealOrderItems(
  orderId: string,
): Promise<void> {
  const order = await fetchOrderById(orderId);
  if (!order) return;

  const groups = new Map<string, OrderItem[]>();
  for (const item of order.items) {
    const key = withMealLineMergeKey(item);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const [keep, ...duplicates] = group;
    const quantity = group.reduce((sum, line) => sum + line.quantity, 0);
    const modifierDelta = keep.modifiers.reduce(
      (sum, m) => sum + m.priceMinorDelta,
      0,
    );
    const line = calculateLineItem({
      unitPriceMinor: keep.unitPriceMinor,
      quantity,
      taxRateBps: keep.taxRateBps,
      modifierDeltaMinor: modifierDelta,
    });
    await updateOrderItemLine({
      itemId: keep.id,
      quantity,
      lineSubtotalMinor: line.lineSubtotalMinor,
      lineTaxMinor: line.lineTaxMinor,
      lineTotalMinor: line.lineTotalMinor,
    });
    for (const dup of duplicates) {
      await deleteOrderItem(dup.id);
    }
  }
}

export async function markPendingItemsSent(orderId: string) {
  const supabase = await createSupabaseServerClient();
  const { error: itemsError } = await supabase
    .from("order_items")
    .update({ status: "sent" })
    .eq("order_id", orderId)
    .eq("status", "pending");

  if (itemsError) throw itemsError;

  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: "in_progress" })
    .eq("id", orderId);

  if (orderError) throw orderError;
}

export async function completeOrderPayment(input: {
  restaurantId: string;
  orderId: string;
  methodCode: string;
  amountMinor: number;
  processedBy: string;
}): Promise<Payment> {
  const supabase = await createSupabaseServerClient();
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      restaurant_id: input.restaurantId,
      order_id: input.orderId,
      method_code: input.methodCode,
      amount_minor: input.amountMinor,
      status: "completed",
      processed_by: input.processedBy,
    })
    .select(
      "id, restaurant_id, order_id, method_code, amount_minor, status, created_at",
    )
    .single();

  if (paymentError) throw paymentError;

  const { error: itemsError } = await supabase
    .from("order_items")
    .update({ status: "delivered" })
    .eq("order_id", input.orderId)
    .neq("status", "cancelled");

  if (itemsError) throw itemsError;

  const closedAt = new Date().toISOString();
  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: "completed", closed_at: closedAt })
    .eq("id", input.orderId);

  if (orderError) throw orderError;

  const row = payment as PaymentRow;
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    orderId: row.order_id,
    methodCode: row.method_code,
    amountMinor: Number(row.amount_minor),
    status: "completed",
    createdAt: row.created_at,
  };
}

export async function incrementCashierSessionSales(input: {
  restaurantId: string;
  methodCode: string;
  amountMinor: number;
}) {
  const session = await fetchOpenCashierSession(input.restaurantId);
  if (!session) return;

  const supabase = await createSupabaseServerClient();
  const patch: Record<string, number> = {};
  if (input.methodCode === "cash") {
    patch.cash_sales_minor = session.cashSalesMinor + input.amountMinor;
  } else if (input.methodCode === "card") {
    patch.card_sales_minor = session.cardSalesMinor + input.amountMinor;
  } else if (input.methodCode === "transfer") {
    patch.transfer_sales_minor = session.transferSalesMinor + input.amountMinor;
  } else {
    return;
  }

  const { error } = await supabase
    .from("cashier_sessions")
    .update(patch)
    .eq("id", session.id);

  if (error) throw error;
}

function mapCashierSession(row: CashierSessionRow): CashierSession {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    status: row.status,
    openingCashMinor: Number(row.opening_cash_minor),
    expectedCashMinor:
      row.expected_cash_minor != null
        ? Number(row.expected_cash_minor)
        : null,
    actualCashMinor:
      row.actual_cash_minor != null ? Number(row.actual_cash_minor) : null,
    cashSalesMinor: Number(row.cash_sales_minor),
    cardSalesMinor: Number(row.card_sales_minor),
    transferSalesMinor: Number(row.transfer_sales_minor),
    openedAt: row.opened_at,
    closedAt: row.closed_at,
  };
}

export async function fetchOpenCashierSession(
  restaurantId: string,
): Promise<CashierSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cashier_sessions")
    .select(
      "id, restaurant_id, status, opening_cash_minor, expected_cash_minor, actual_cash_minor, cash_sales_minor, card_sales_minor, transfer_sales_minor, opened_at, closed_at",
    )
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapCashierSession(data as CashierSessionRow);
}

export async function openCashierSession(input: {
  restaurantId: string;
  openingCashMinor: number;
  openedBy: string;
}): Promise<CashierSession> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cashier_sessions")
    .insert({
      restaurant_id: input.restaurantId,
      opened_by: input.openedBy,
      opening_cash_minor: input.openingCashMinor,
      status: "open",
    })
    .select(
      "id, restaurant_id, status, opening_cash_minor, expected_cash_minor, actual_cash_minor, cash_sales_minor, card_sales_minor, transfer_sales_minor, opened_at, closed_at",
    )
    .single();

  if (error) throw error;
  return mapCashierSession(data as CashierSessionRow);
}

export async function closeCashierSession(input: {
  restaurantId: string;
  sessionId: string;
  actualCashMinor: number;
  closedBy: string;
}): Promise<CashierSession> {
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: readError } = await supabase
    .from("cashier_sessions")
    .select(
      "id, restaurant_id, status, opening_cash_minor, expected_cash_minor, actual_cash_minor, cash_sales_minor, card_sales_minor, transfer_sales_minor, opened_at, closed_at",
    )
    .eq("id", input.sessionId)
    .eq("restaurant_id", input.restaurantId)
    .maybeSingle();

  if (readError) throw readError;
  if (!existing || (existing as CashierSessionRow).status !== "open") {
    throw new Error("SESSION_NOT_FOUND");
  }

  const session = mapCashierSession(existing as CashierSessionRow);
  const expected = session.openingCashMinor + session.cashSalesMinor;

  const { data, error } = await supabase
    .from("cashier_sessions")
    .update({
      status: "closed",
      expected_cash_minor: expected,
      actual_cash_minor: input.actualCashMinor,
      closed_by: input.closedBy,
      closed_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId)
    .select(
      "id, restaurant_id, status, opening_cash_minor, expected_cash_minor, actual_cash_minor, cash_sales_minor, card_sales_minor, transfer_sales_minor, opened_at, closed_at",
    )
    .single();

  if (error) throw error;
  return mapCashierSession(data as CashierSessionRow);
}

export async function fetchSalesSummary(
  restaurantId: string,
  period: "today" | "all",
): Promise<SalesReportSummary> {
  const supabase = await createSupabaseServerClient();
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, total_minor, tax_minor, closed_at, status",
    )
    .eq("restaurant_id", restaurantId)
    .eq("status", "completed");

  if (ordersError) throw ordersError;

  const completed = (orders ?? []).filter((o) => {
    const closedAt = o.closed_at as string | null;
    if (closedAt == null) return false;
    if (period === "today") return isTodayInBogota(closedAt);
    return true;
  });

  const completedIds = completed.map((o) => o.id as string);
  const gross = completed.reduce((s, o) => s + Number(o.total_minor), 0);
  const tax = completed.reduce((s, o) => s + Number(o.tax_minor), 0);

  const paymentsByMethod: Record<string, number> = {};
  if (completedIds.length > 0) {
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("order_id, method_code, amount_minor")
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed")
      .in("order_id", completedIds);

    if (paymentsError) throw paymentsError;
    for (const p of payments ?? []) {
      paymentsByMethod[p.method_code as string] =
        (paymentsByMethod[p.method_code as string] ?? 0) +
        Number(p.amount_minor);
    }
  }

  return {
    grossSalesMinor: gross,
    netSalesMinor: gross - tax,
    taxMinor: tax,
    orderCount: completed.length,
    averageOrderMinor:
      completed.length > 0 ? Math.round(gross / completed.length) : 0,
    paymentsByMethod,
  };
}

export async function fetchRestaurantReports(
  restaurantId: string,
  yearMonth: string,
): Promise<RestaurantReports> {
  const supabase = await createSupabaseServerClient();
  const monthStart = `${yearMonth}-01`;
  const [yearStr, monthStr] = yearMonth.split("-");
  const nextMonthDate = new Date(
    Date.UTC(Number(yearStr), Number(monthStr), 1),
  );
  const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(
    nextMonthDate.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;

  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, restaurant_id, table_id, order_number, status, subtotal_minor, tax_minor, discount_minor, total_minor, notes, opened_at, closed_at",
    )
    .eq("restaurant_id", restaurantId)
    .in("status", ["completed", "voided"])
    .gte("closed_at", `${monthStart}T00:00:00-05:00`)
    .lt("closed_at", `${nextMonth}T00:00:00-05:00`);

  if (ordersError) throw ordersError;

  const rows = (orderRows ?? []) as OrderRow[];
  const orderIds = rows.map((row) => row.id);

  const itemsByOrder = new Map<string, OrderItem[]>();
  if (orderIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from("order_items")
      .select(
        "id, order_id, product_id, product_name, quantity, unit_price_minor, tax_rate_bps, line_subtotal_minor, line_tax_minor, line_total_minor, status, preparation_station, serve_timing, notes",
      )
      .in("order_id", orderIds);

    if (itemsError) throw itemsError;
    for (const item of (itemRows ?? []) as OrderItemRow[]) {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push(mapOrderItem(item, []));
      itemsByOrder.set(item.order_id, list);
    }
  }

  const orders: Order[] = rows.map((row) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    tableId: row.table_id,
    tableLabel: null,
    orderNumber: row.order_number,
    status: row.status,
    subtotalMinor: Number(row.subtotal_minor),
    taxMinor: Number(row.tax_minor),
    discountMinor: Number(row.discount_minor),
    totalMinor: Number(row.total_minor),
    notes: row.notes,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    items: itemsByOrder.get(row.id) ?? [],
  }));

  const completedIds = orders
    .filter((o) => o.status === "completed")
    .map((o) => o.id);

  const payments: Payment[] = [];
  if (completedIds.length > 0) {
    const { data: paymentRows, error: paymentsError } = await supabase
      .from("payments")
      .select(
        "id, restaurant_id, order_id, method_code, amount_minor, status, created_at",
      )
      .eq("restaurant_id", restaurantId)
      .in("order_id", completedIds);

    if (paymentsError) throw paymentsError;
    for (const p of (paymentRows ?? []) as PaymentRow[]) {
      payments.push({
        id: p.id,
        restaurantId: p.restaurant_id,
        orderId: p.order_id,
        methodCode: p.method_code,
        amountMinor: Number(p.amount_minor),
        status: p.status as Payment["status"],
        createdAt: p.created_at,
      });
    }
  }

  return aggregateRestaurantReports({ orders, payments, yearMonth });
}

export async function listOrders(restaurantId: string): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, restaurant_id, table_id, order_number, status, subtotal_minor, tax_minor, discount_minor, total_minor, notes, opened_at, closed_at",
    )
    .eq("restaurant_id", restaurantId)
    .order("opened_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return Promise.all(((data ?? []) as OrderRow[]).map(mapFullOrder));
}

/** Lightweight bill chips for the floor — no line-item hydration. */
export async function fetchOpenBillTotalsByTableId(
  restaurantId: string,
): Promise<Record<string, number>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("table_id, total_minor")
    .eq("restaurant_id", restaurantId)
    .in("status", ["open", "in_progress", "ready"])
    .not("table_id", "is", null);

  if (error) throw error;

  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    const tableId = row.table_id as string | null;
    if (!tableId) continue;
    totals[tableId] =
      (totals[tableId] ?? 0) + Number(row.total_minor);
  }
  return totals;
}

/** Tables with open orders that still have bar drinks not marked delivered. */
export async function fetchPendingBarDrinksByTableId(
  restaurantId: string,
): Promise<Record<string, true>> {
  const supabase = await createSupabaseServerClient();
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, table_id")
    .eq("restaurant_id", restaurantId)
    .in("status", ["open", "in_progress", "ready"])
    .not("table_id", "is", null);

  if (ordersError) throw ordersError;

  const rows = orders ?? [];
  if (rows.length === 0) return {};

  const tableByOrderId = new Map<string, string>();
  for (const row of rows) {
    const tableId = row.table_id as string;
    tableByOrderId.set(row.id as string, tableId);
  }

  const orderIds = [...tableByOrderId.keys()];
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id, preparation_station, status, quantity")
    .in("order_id", orderIds)
    .eq("preparation_station", "bar")
    .in("status", ["sent", "in_progress", "ready"]);

  if (itemsError) throw itemsError;

  const result: Record<string, true> = {};
  for (const item of items ?? []) {
    if (Number(item.quantity) <= 0) continue;
    const tableId = tableByOrderId.get(item.order_id as string);
    if (tableId) result[tableId] = true;
  }
  return result;
}

export type CompletedSaleRow = {
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
  siigoStatus: "not_queued" | "pending" | "synced" | "failed";
};

export async function fetchCompletedSalesForReports(
  restaurantId: string,
  options?: { limit?: number },
): Promise<CompletedSaleRow[]> {
  const supabase = await createSupabaseServerClient();
  const limit = options?.limit ?? 200;

  const { data: orderRows, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, order_number, table_id, status, subtotal_minor, tax_minor, discount_minor, total_minor, closed_at",
    )
    .eq("restaurant_id", restaurantId)
    .eq("status", "completed")
    .order("closed_at", { ascending: false })
    .limit(limit);

  if (ordersError) throw ordersError;
  const orders = orderRows ?? [];
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id as string);
  const tableIds = [
    ...new Set(
      orders
        .map((o) => o.table_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [tablesRes, itemsRes, paymentsRes, siigoRes] = await Promise.all([
    tableIds.length
      ? supabase.from("restaurant_tables").select("id, label").in("id", tableIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("order_items")
      .select("order_id, product_name, quantity, line_total_minor")
      .in("order_id", orderIds),
    supabase
      .from("payments")
      .select("order_id, method_code, status, created_at")
      .in("order_id", orderIds)
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase
      .from("siigo_sync_jobs")
      .select("entity_id, status")
      .eq("restaurant_id", restaurantId)
      .eq("entity_type", "order")
      .in("entity_id", orderIds),
  ]);

  if (tablesRes.error) throw tablesRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  if (siigoRes.error) throw siigoRes.error;

  const labelByTable = new Map<string, string>();
  for (const row of tablesRes.data ?? []) {
    labelByTable.set(row.id as string, row.label as string);
  }

  const itemsByOrder = new Map<
    string,
    { productName: string; quantity: number; lineTotalMinor: number }[]
  >();
  for (const row of itemsRes.data ?? []) {
    const orderId = row.order_id as string;
    const list = itemsByOrder.get(orderId) ?? [];
    list.push({
      productName: row.product_name as string,
      quantity: Number(row.quantity),
      lineTotalMinor: Number(row.line_total_minor),
    });
    itemsByOrder.set(orderId, list);
  }

  const paymentByOrder = new Map<string, string>();
  for (const row of paymentsRes.data ?? []) {
    const orderId = row.order_id as string;
    if (!paymentByOrder.has(orderId)) {
      paymentByOrder.set(orderId, row.method_code as string);
    }
  }

  const siigoByOrder = new Map<string, CompletedSaleRow["siigoStatus"]>();
  for (const row of siigoRes.data ?? []) {
    const entityId = row.entity_id as string;
    const status = row.status as string;
    const mapped: CompletedSaleRow["siigoStatus"] =
      status === "synced"
        ? "synced"
        : status === "failed"
          ? "failed"
          : "pending";
    // Prefer synced over pending if multiple jobs exist
    const prev = siigoByOrder.get(entityId);
    if (prev === "synced") continue;
    if (prev === "failed" && mapped === "pending") continue;
    siigoByOrder.set(entityId, mapped);
  }

  return orders.map((row) => {
    const orderId = row.id as string;
    const tableId = row.table_id as string | null;
    return {
      orderId,
      orderNumber: Number(row.order_number),
      tableLabel: tableId ? (labelByTable.get(tableId) ?? null) : null,
      closedAt: (row.closed_at as string) ?? new Date().toISOString(),
      totalMinor: Number(row.total_minor),
      subtotalMinor: Number(row.subtotal_minor),
      taxMinor: Number(row.tax_minor),
      discountMinor: Number(row.discount_minor),
      status: row.status as string,
      paymentMethod: paymentByOrder.get(orderId) ?? null,
      items: itemsByOrder.get(orderId) ?? [],
      siigoStatus: siigoByOrder.get(orderId) ?? "not_queued",
    };
  });
}
