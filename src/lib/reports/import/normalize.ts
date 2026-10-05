import { calendarDateInBogota } from "@/lib/utils/date";
import type {
  HistoricalSaleLine,
  HistoricalSaleRecord,
  ImportProfileId,
} from "@/lib/reports/historical-sales/types";
import { detectCsvProfile, detectXmlProfile } from "@/lib/reports/import/detect-profile";
import { parseMoneyToMinor, parseQuantity } from "@/lib/reports/import/money";
import { normalizeHeader, parseCsv, rowToRecord } from "@/lib/reports/import/parse-csv";
import { parseXmlToRecords } from "@/lib/reports/import/parse-xml";

export type NormalizedImport = {
  fileFormat: "csv" | "xml";
  detectedProfile: ImportProfileId;
  profile: ImportProfileId;
  sales: Omit<
    HistoricalSaleRecord,
    "id" | "restaurantId" | "importId"
  >[];
  warnings: string[];
};

const IMPORTED_PRODUCT_ID = "00000000-0000-4000-8000-000000000001";

function pickField(
  record: Record<string, string>,
  names: string[],
): string | undefined {
  for (const name of names) {
    const key = normalizeHeader(name);
    const value = record[key];
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function closedAtFromDate(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00-05:00`;
  }
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1]!.padStart(2, "0");
    const month = dmy[2]!.padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}T12:00:00-05:00`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function saleKey(parts: (string | number | null | undefined)[]) {
  return parts
    .map((p) => (p == null ? "" : String(p)))
    .join("|")
    .slice(0, 240);
}

function finalizeSale(
  draft: {
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
  },
): Omit<HistoricalSaleRecord, "id" | "restaurantId" | "importId"> {
  const items = draft.items.length > 0
    ? draft.items
    : draft.totalMinor > 0
      ? [
          {
            productName: "Importación histórica",
            quantity: 1,
            lineTotalMinor: draft.totalMinor,
          },
        ]
      : [];

  const subtotal =
    draft.subtotalMinor > 0
      ? draft.subtotalMinor
      : Math.max(0, draft.totalMinor - draft.taxMinor);

  return {
    sourceKey: draft.sourceKey,
    closedAt: draft.closedAt,
    orderNumber: draft.orderNumber,
    tableLabel: draft.tableLabel,
    paymentMethod: draft.paymentMethod,
    subtotalMinor: subtotal,
    taxMinor: draft.taxMinor,
    discountMinor: draft.discountMinor,
    totalMinor: draft.totalMinor,
    items,
  };
}

function mapHausDailySales(
  table: ReturnType<typeof parseCsv>,
  warnings: string[],
) {
  const sales: Omit<HistoricalSaleRecord, "id" | "restaurantId" | "importId">[] =
    [];
  for (const row of table.rows) {
    const record = rowToRecord(table.headers, row);
    const date = pickField(record, ["fecha"]);
    const closedAt = date ? closedAtFromDate(date) : null;
    if (!closedAt) {
      warnings.push("Fila omitida: fecha inválida.");
      continue;
    }
    const orderCount = Math.max(
      1,
      Number(pickField(record, ["pedidos"]) ?? "1") || 1,
    );
    const totalMinor = parseMoneyToMinor(
      pickField(record, ["total_minor", "total"]),
      Boolean(pickField(record, ["total_minor"])),
    );
    if (totalMinor <= 0) continue;

    const perOrder = Math.floor(totalMinor / orderCount);
    const remainder = totalMinor - perOrder * orderCount;

    for (let i = 0; i < orderCount; i++) {
      const slice = perOrder + (i === orderCount - 1 ? remainder : 0);
      sales.push(
        finalizeSale({
          sourceKey: saleKey(["daily", calendarDateInBogota(closedAt), i]),
          closedAt,
          orderNumber: null,
          tableLabel: null,
          paymentMethod: null,
          subtotalMinor: slice,
          taxMinor: 0,
          discountMinor: 0,
          totalMinor: slice,
          items: [],
        }),
      );
    }
  }
  return sales;
}

function mapHausProductSales(table: ReturnType<typeof parseCsv>) {
  const byDay = new Map<string, HistoricalSaleLine[]>();
  for (const row of table.rows) {
    const record = rowToRecord(table.headers, row);
    const name = pickField(record, ["producto", "product"]) ?? "Producto";
    const qty = parseQuantity(pickField(record, ["cantidad", "quantity"]));
    const lineMinor = parseMoneyToMinor(
      pickField(record, ["ingresos_minor", "ingresos"]),
      Boolean(pickField(record, ["ingresos_minor"])),
    );
    if (lineMinor <= 0) continue;
    const day = calendarDateInBogota(new Date());
    const list = byDay.get(day) ?? [];
    list.push({ productName: name, quantity: qty, lineTotalMinor: lineMinor });
    byDay.set(day, list);
  }

  return [...byDay.entries()].map(([day, items]) => {
    const totalMinor = items.reduce((s, i) => s + i.lineTotalMinor, 0);
    const closedAt = `${day}T12:00:00-05:00`;
    return finalizeSale({
      sourceKey: saleKey(["product-day", day]),
      closedAt,
      orderNumber: null,
      tableLabel: null,
      paymentMethod: null,
      subtotalMinor: totalMinor,
      taxMinor: 0,
      discountMinor: 0,
      totalMinor,
      items,
    });
  });
}

function mapHausOrdersDetail(table: ReturnType<typeof parseCsv>) {
  const groups = new Map<
    string,
    Omit<HistoricalSaleRecord, "id" | "restaurantId" | "importId">
  >();

  for (const row of table.rows) {
    const record = rowToRecord(table.headers, row);
    const date = pickField(record, ["fecha", "date"]);
    const closedAt = date ? closedAtFromDate(date) : null;
    if (!closedAt) continue;
    const orderNumber = Number(pickField(record, ["pedido", "order"]) ?? "");
    const key = saleKey([
      calendarDateInBogota(closedAt),
      orderNumber || pickField(record, ["mesa"]),
    ]);
    const productName = pickField(record, ["producto", "product"]);
    const quantity = parseQuantity(pickField(record, ["cantidad", "quantity"]));
    const lineMinor = parseMoneyToMinor(
      pickField(record, ["linea_minor", "linea"]),
      Boolean(pickField(record, ["linea_minor"])),
    );

    const existing = groups.get(key) ?? finalizeSale({
      sourceKey: key,
      closedAt,
      orderNumber: Number.isFinite(orderNumber) ? orderNumber : null,
      tableLabel: pickField(record, ["mesa", "table"]) ?? null,
      paymentMethod: pickField(record, ["pago", "payment", "metodo"]) ?? null,
      subtotalMinor: 0,
      taxMinor: 0,
      discountMinor: 0,
      totalMinor: 0,
      items: [],
    });

    if (productName && lineMinor > 0) {
      existing.items.push({
        productName,
        quantity,
        lineTotalMinor: lineMinor,
      });
      existing.totalMinor += lineMinor;
      existing.subtotalMinor += lineMinor;
    }
    groups.set(key, existing);
  }

  return [...groups.values()];
}

function mapHausPayments(table: ReturnType<typeof parseCsv>, warnings: string[]) {
  const sales: Omit<HistoricalSaleRecord, "id" | "restaurantId" | "importId">[] =
    [];
  const day = calendarDateInBogota(new Date());
  const closedAt = `${day}T12:00:00-05:00`;
  for (const row of table.rows) {
    const record = rowToRecord(table.headers, row);
    const method = pickField(record, ["metodo", "method"]) ?? "importado";
    const totalMinor = parseMoneyToMinor(
      pickField(record, ["total_minor", "total"]),
      Boolean(pickField(record, ["total_minor"])),
    );
    if (totalMinor <= 0) continue;
    sales.push(
      finalizeSale({
        sourceKey: saleKey(["payment", method, totalMinor, sales.length]),
        closedAt,
        orderNumber: null,
        tableLabel: null,
        paymentMethod: method,
        subtotalMinor: totalMinor,
        taxMinor: 0,
        discountMinor: 0,
        totalMinor,
        items: [],
      }),
    );
  }
  if (sales.length === 0) {
    warnings.push("No se encontraron pagos con total válido.");
  }
  return sales;
}

function mapGenericOrderLines(
  records: Record<string, string>[],
  warnings: string[],
) {
  const groups = new Map<
    string,
    Omit<HistoricalSaleRecord, "id" | "restaurantId" | "importId">
  >();

  for (const record of records) {
    const date =
      pickField(record, [
        "fecha",
        "date",
        "fecha_cierre",
        "fechafactura",
        "fecha_factura",
      ]) ?? "";
    const closedAt = closedAtFromDate(date);
    if (!closedAt) {
      warnings.push("Registro omitido: sin fecha reconocible.");
      continue;
    }
    const orderNumberRaw = pickField(record, [
      "pedido",
      "order",
      "order_number",
      "numero",
      "factura",
    ]);
    const orderNumber = orderNumberRaw ? Number(orderNumberRaw) : null;
    const productName =
      pickField(record, ["producto", "product", "item", "descripcion"]) ??
      "Ítem importado";
    const quantity = parseQuantity(
      pickField(record, ["cantidad", "quantity", "qty"]),
    );
    const lineMinor = parseMoneyToMinor(
      pickField(record, [
        "linea_minor",
        "linea",
        "total_minor",
        "total",
        "valor",
        "amount",
        "importe",
      ]),
      Boolean(
        pickField(record, ["linea_minor", "total_minor", "valor_minor"]),
      ),
    );
    const key = saleKey([
      calendarDateInBogota(closedAt),
      orderNumber,
      pickField(record, ["id", "uuid", "documento"]),
      productName,
      lineMinor,
    ]);

    const groupKey = saleKey([
      calendarDateInBogota(closedAt),
      orderNumber,
      pickField(record, ["mesa", "table"]),
    ]);

    const existing = groups.get(groupKey) ?? finalizeSale({
      sourceKey: groupKey,
      closedAt,
      orderNumber: Number.isFinite(orderNumber) ? orderNumber : null,
      tableLabel: pickField(record, ["mesa", "table"]) ?? null,
      paymentMethod:
        pickField(record, ["pago", "payment", "metodo", "method"]) ?? null,
      subtotalMinor: 0,
      taxMinor: parseMoneyToMinor(
        pickField(record, ["tax_minor", "impuesto", "iva"]),
        true,
      ),
      discountMinor: parseMoneyToMinor(
        pickField(record, ["discount_minor", "descuento"]),
        true,
      ),
      totalMinor: 0,
      items: [],
    });

    if (lineMinor > 0) {
      existing.items.push({
        productName,
        quantity,
        lineTotalMinor: lineMinor,
      });
      existing.totalMinor += lineMinor;
      existing.subtotalMinor += lineMinor;
    } else {
      warnings.push(`Línea sin valor: ${key}`);
    }
    groups.set(groupKey, existing);
  }

  return [...groups.values()];
}

function mapGenericDailyTotals(
  records: Record<string, string>[],
  warnings: string[],
) {
  const sales: Omit<HistoricalSaleRecord, "id" | "restaurantId" | "importId">[] =
    [];
  for (const record of records) {
    const date =
      pickField(record, ["fecha", "date", "dia", "fechafactura"]) ?? "";
    const closedAt = closedAtFromDate(date);
    if (!closedAt) continue;
    const orderCount = Math.max(
      1,
      Number(pickField(record, ["pedidos", "orders", "transacciones"]) ?? "1") ||
        1,
    );
    const totalMinor = parseMoneyToMinor(
      pickField(record, ["total_minor", "total", "valor", "ventas", "amount"]),
      Boolean(pickField(record, ["total_minor", "valor_minor"])),
    );
    if (totalMinor <= 0) continue;
    const perOrder = Math.floor(totalMinor / orderCount);
    const remainder = totalMinor - perOrder * orderCount;
    for (let i = 0; i < orderCount; i++) {
      const slice = perOrder + (i === orderCount - 1 ? remainder : 0);
      sales.push(
        finalizeSale({
          sourceKey: saleKey(["generic-daily", calendarDateInBogota(closedAt), i]),
          closedAt,
          orderNumber: null,
          tableLabel: null,
          paymentMethod:
            pickField(record, ["pago", "metodo", "payment"]) ?? null,
          subtotalMinor: slice,
          taxMinor: 0,
          discountMinor: 0,
          totalMinor: slice,
          items: [],
        }),
      );
    }
  }
  if (sales.length === 0) {
    warnings.push("No se encontraron totales diarios válidos.");
  }
  return sales;
}

function applyProfile(
  profile: ImportProfileId,
  fileFormat: "csv" | "xml",
  content: string,
  warnings: string[],
) {
  if (fileFormat === "csv") {
    const table = parseCsv(content);
    if (table.headers.length === 0) {
      warnings.push("El CSV está vacío o no tiene encabezados.");
      return [];
    }
    const records = table.rows.map((row) => rowToRecord(table.headers, row));
    switch (profile) {
      case "haus_daily_sales":
        return mapHausDailySales(table, warnings);
      case "haus_product_sales":
        return mapHausProductSales(table);
      case "haus_orders_detail":
        return mapHausOrdersDetail(table);
      case "haus_payments_by_method":
        return mapHausPayments(table, warnings);
      case "generic_daily_totals":
        return mapGenericDailyTotals(records, warnings);
      case "generic_order_lines":
      case "auto":
      default:
        return mapGenericOrderLines(records, warnings);
    }
  }

  const records = parseXmlToRecords(content);
  if (records.length === 0) {
    warnings.push("No se pudieron leer registros del XML.");
    return [];
  }
  switch (profile) {
    case "generic_daily_totals":
      return mapGenericDailyTotals(records, warnings);
    case "generic_order_lines":
    case "auto":
    default:
      return mapGenericOrderLines(records, warnings);
  }
}

export function normalizeImportFile(input: {
  filename: string;
  content: string;
  profile?: ImportProfileId;
}): NormalizedImport {
  const warnings: string[] = [];
  const lower = input.filename.toLowerCase();
  const fileFormat: "csv" | "xml" =
    lower.endsWith(".xml") || input.content.trim().startsWith("<") ? "xml" : "csv";

  let detectedProfile: ImportProfileId = "generic_order_lines";
  if (fileFormat === "csv") {
    const table = parseCsv(input.content);
    detectedProfile = detectCsvProfile(table.headers);
  } else {
    detectedProfile = detectXmlProfile(parseXmlToRecords(input.content));
  }

  const profile =
    input.profile && input.profile !== "auto" ? input.profile : detectedProfile;

  const sales = applyProfile(profile, fileFormat, input.content, warnings);

  const deduped = new Map<
    string,
    Omit<HistoricalSaleRecord, "id" | "restaurantId" | "importId">
  >();
  for (const sale of sales) {
    deduped.set(sale.sourceKey, sale);
  }

  return {
    fileFormat,
    detectedProfile,
    profile,
    sales: [...deduped.values()],
    warnings,
  };
}

export { IMPORTED_PRODUCT_ID };
