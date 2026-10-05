import { canUseDemoExperience } from "@/lib/env";
import {
  appendDemoHistoricalSales,
  getDemoHistoricalSales,
} from "@/lib/demo/historical-sales";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HistoricalSaleRecord } from "@/lib/reports/historical-sales/types";
import { calendarDateInBogota } from "@/lib/utils/date";

type HistoricalSaleRow = {
  id: string;
  restaurant_id: string;
  import_id: string | null;
  source_key: string;
  closed_at: string;
  order_number: number | null;
  table_label: string | null;
  payment_method: string | null;
  subtotal_minor: number;
  tax_minor: number;
  discount_minor: number;
  total_minor: number;
  items: unknown;
};

function mapRow(row: HistoricalSaleRow): HistoricalSaleRecord {
  const items = Array.isArray(row.items)
    ? (row.items as HistoricalSaleRecord["items"])
    : [];
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    importId: row.import_id,
    sourceKey: row.source_key,
    closedAt: row.closed_at,
    orderNumber: row.order_number,
    tableLabel: row.table_label,
    paymentMethod: row.payment_method,
    subtotalMinor: Number(row.subtotal_minor),
    taxMinor: Number(row.tax_minor),
    discountMinor: Number(row.discount_minor),
    totalMinor: Number(row.total_minor),
    items,
  };
}

export async function fetchHistoricalSalesForMonth(
  restaurantId: string,
  yearMonth: string,
): Promise<HistoricalSaleRecord[]> {
  if (canUseDemoExperience()) {
    return getDemoHistoricalSales(restaurantId).filter((sale) =>
      calendarDateInBogota(sale.closedAt).startsWith(yearMonth),
    );
  }

  const monthStart = `${yearMonth}-01`;
  const [yearStr, monthStr] = yearMonth.split("-");
  const nextMonthDate = new Date(
    Date.UTC(Number(yearStr), Number(monthStr), 1),
  );
  const nextMonth = `${nextMonthDate.getUTCFullYear()}-${String(
    nextMonthDate.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("historical_sales")
    .select(
      "id, restaurant_id, import_id, source_key, closed_at, order_number, table_label, payment_method, subtotal_minor, tax_minor, discount_minor, total_minor, items",
    )
    .eq("restaurant_id", restaurantId)
    .gte("closed_at", `${monthStart}T00:00:00-05:00`)
    .lt("closed_at", `${nextMonth}T00:00:00-05:00`);

  if (error) throw error;
  return ((data ?? []) as HistoricalSaleRow[]).map(mapRow);
}

export async function fetchAllHistoricalSalesForExport(
  restaurantId: string,
  limit = 500,
): Promise<HistoricalSaleRecord[]> {
  if (canUseDemoExperience()) {
    return getDemoHistoricalSales(restaurantId)
      .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
      .slice(0, limit);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("historical_sales")
    .select(
      "id, restaurant_id, import_id, source_key, closed_at, order_number, table_label, payment_method, subtotal_minor, tax_minor, discount_minor, total_minor, items",
    )
    .eq("restaurant_id", restaurantId)
    .order("closed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as HistoricalSaleRow[]).map(mapRow);
}

export async function insertHistoricalSalesImport(input: {
  restaurantId: string;
  importedBy: string;
  sourceLabel: string;
  originalFilename: string | null;
  fileFormat: "csv" | "xml";
  profileId: string;
  sales: Omit<HistoricalSaleRecord, "id" | "restaurantId" | "importId">[];
}): Promise<{ importId: string; inserted: number; skipped: number }> {
  if (input.sales.length === 0) {
    return { importId: "", inserted: 0, skipped: 0 };
  }

  if (canUseDemoExperience()) {
    const importId = crypto.randomUUID();
    const records: HistoricalSaleRecord[] = input.sales.map((sale) => ({
      ...sale,
      id: crypto.randomUUID(),
      restaurantId: input.restaurantId,
      importId,
    }));
    const existing = new Set(
      getDemoHistoricalSales(input.restaurantId).map((s) => s.sourceKey),
    );
    let inserted = 0;
    let skipped = 0;
    const toAdd: HistoricalSaleRecord[] = [];
    for (const record of records) {
      if (existing.has(record.sourceKey)) {
        skipped += 1;
        continue;
      }
      toAdd.push(record);
      inserted += 1;
    }
    appendDemoHistoricalSales(input.restaurantId, toAdd);
    return { importId, inserted, skipped };
  }

  const supabase = await createSupabaseServerClient();
  const { data: importRow, error: importError } = await supabase
    .from("historical_sales_imports")
    .insert({
      restaurant_id: input.restaurantId,
      source_label: input.sourceLabel,
      original_filename: input.originalFilename,
      file_format: input.fileFormat,
      profile_id: input.profileId,
      row_count: input.sales.length,
      imported_by: input.importedBy,
    })
    .select("id")
    .single();

  if (importError) throw importError;
  const importId = importRow.id as string;

  const rows = input.sales.map((sale) => ({
    restaurant_id: input.restaurantId,
    import_id: importId,
    source_key: sale.sourceKey,
    closed_at: sale.closedAt,
    order_number: sale.orderNumber,
    table_label: sale.tableLabel,
    payment_method: sale.paymentMethod,
    subtotal_minor: sale.subtotalMinor,
    tax_minor: sale.taxMinor,
    discount_minor: sale.discountMinor,
    total_minor: sale.totalMinor,
    items: sale.items,
  }));

  const { data, error } = await supabase.from("historical_sales").upsert(rows, {
      onConflict: "restaurant_id,source_key",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw error;
  const inserted = data?.length ?? 0;
  return {
    importId,
    inserted,
    skipped: Math.max(0, input.sales.length - inserted),
  };
}
