import type { ImportProfileId } from "@/lib/reports/historical-sales/types";
import { normalizeHeader } from "@/lib/reports/import/parse-csv";

const HAUS_DAILY = new Set(["fecha", "pedidos", "total_minor", "total"]);
const HAUS_PRODUCT = new Set([
  "producto",
  "cantidad",
  "ingresos_minor",
  "ingresos",
]);
const HAUS_ORDERS = new Set([
  "pedido",
  "fecha",
  "mesa",
  "pago",
  "producto",
  "cantidad",
  "linea_minor",
  "linea",
]);
const HAUS_PAYMENTS = new Set(["metodo", "total_minor", "total"]);

function headerSet(headers: string[]) {
  return new Set(headers.map(normalizeHeader));
}

export function detectCsvProfile(headers: string[]): ImportProfileId {
  const set = headerSet(headers);
  if ([...HAUS_DAILY].every((h) => set.has(h))) return "haus_daily_sales";
  if ([...HAUS_PRODUCT].every((h) => set.has(h))) return "haus_product_sales";
  if ([...HAUS_ORDERS].every((h) => set.has(h))) return "haus_orders_detail";
  if ([...HAUS_PAYMENTS].every((h) => set.has(h))) return "haus_payments_by_method";

  const hasDate = set.has("fecha") || set.has("date") || set.has("fecha_cierre");
  const hasProduct =
    set.has("producto") || set.has("product") || set.has("item");
  const hasOrder =
    set.has("pedido") || set.has("order") || set.has("order_number");

  if (hasDate && hasProduct) return "generic_order_lines";
  if (hasDate && (set.has("total") || set.has("total_minor"))) {
    return "generic_daily_totals";
  }
  if (hasOrder && hasProduct) return "generic_order_lines";
  return "generic_order_lines";
}

export function detectXmlProfile(records: Record<string, string>[]): ImportProfileId {
  if (records.length === 0) return "generic_order_lines";
  const keys = new Set(
    Object.keys(records[0] ?? {}).map((k) => normalizeHeader(k)),
  );
  const hasDate =
    keys.has("fecha") || keys.has("date") || keys.has("fechafactura");
  const hasTotal =
    keys.has("total") || keys.has("valor") || keys.has("amount");
  if (hasDate && hasTotal && !keys.has("producto") && !keys.has("product")) {
    return "generic_daily_totals";
  }
  return "generic_order_lines";
}
