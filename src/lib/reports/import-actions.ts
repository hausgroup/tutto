"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { PERMISSIONS, requirePermission } from "@/lib/auth/permissions";
import {
  IMPORT_PROFILE_IDS,
  type ImportPreview,
  type ImportProfileId,
} from "@/lib/reports/historical-sales/types";
import { insertHistoricalSalesImport } from "@/lib/reports/historical-sales/repository";
import { normalizeImportFile } from "@/lib/reports/import/normalize";
import { calendarDateInBogota } from "@/lib/utils/date";

const MAX_BYTES = 5 * 1024 * 1024;

const previewSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string().min(1).max(MAX_BYTES),
  profile: z.enum(IMPORT_PROFILE_IDS).optional(),
});

const commitSchema = previewSchema.extend({
  sourceLabel: z.string().min(1).max(120).optional(),
});

function buildPreview(
  normalized: ReturnType<typeof normalizeImportFile>,
): ImportPreview {
  const dates = normalized.sales
    .map((s) => calendarDateInBogota(s.closedAt))
    .sort();
  const totalMinor = normalized.sales.reduce((s, row) => s + row.totalMinor, 0);

  return {
    fileFormat: normalized.fileFormat,
    detectedProfile: normalized.detectedProfile,
    suggestedProfile: normalized.profile,
    saleCount: normalized.sales.length,
    dateRange:
      dates.length > 0
        ? { from: dates[0]!, to: dates[dates.length - 1]! }
        : null,
    totalMinor,
    sampleSales: normalized.sales.slice(0, 5).map((sale) => ({
      closedAt: calendarDateInBogota(sale.closedAt),
      orderNumber: sale.orderNumber,
      totalMinor: sale.totalMinor,
      paymentMethod: sale.paymentMethod,
      itemCount: sale.items.length,
    })),
    warnings: normalized.warnings,
  };
}

export async function previewHistoricalImportAction(input: {
  filename: string;
  content: string;
  profile?: ImportProfileId;
}): Promise<{ preview: ImportPreview } | { error: string }> {
  try {
    const parsed = previewSchema.parse(input);
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) return { error: "RESTAURANT_NOT_FOUND" };
    requirePermission(context, PERMISSIONS.REPORTS_VIEW, restaurantId);

    const normalized = normalizeImportFile({
      filename: parsed.filename,
      content: parsed.content,
      profile: parsed.profile,
    });

    if (normalized.sales.length === 0) {
      return {
        error:
          "No pudimos mapear ventas en este archivo. Prueba otro perfil de importación.",
      };
    }

    return { preview: buildPreview(normalized) };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "No tienes permiso para importar reportes." };
    }
    console.error("[previewHistoricalImportAction]", error);
    return { error: "No pudimos leer el archivo." };
  }
}

export async function commitHistoricalImportAction(input: {
  filename: string;
  content: string;
  profile?: ImportProfileId;
  sourceLabel?: string;
}): Promise<
  | { importId: string; inserted: number; skipped: number }
  | { error: string }
> {
  try {
    const parsed = commitSchema.parse(input);
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) return { error: "RESTAURANT_NOT_FOUND" };
    requirePermission(context, PERMISSIONS.REPORTS_VIEW, restaurantId);

    const normalized = normalizeImportFile({
      filename: parsed.filename,
      content: parsed.content,
      profile: parsed.profile,
    });

    if (normalized.sales.length === 0) {
      return { error: "No hay ventas para importar." };
    }

    const result = await insertHistoricalSalesImport({
      restaurantId,
      importedBy: context.userId,
      sourceLabel: parsed.sourceLabel ?? "Herramienta anterior",
      originalFilename: parsed.filename,
      fileFormat: normalized.fileFormat,
      profileId: normalized.profile,
      sales: normalized.sales,
    });

    revalidatePath("/reports");
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "No tienes permiso para importar reportes." };
    }
    console.error("[commitHistoricalImportAction]", error);
    return { error: "No pudimos guardar la importación." };
  }
}
