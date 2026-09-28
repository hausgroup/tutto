"use server";

import { revalidatePath } from "next/cache";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { canUseDemoExperience } from "@/lib/env";
import { getDemoRestaurantStore } from "@/lib/demo/restaurant-store";
import { PERMISSIONS, requirePermission } from "@/lib/auth/permissions";
import * as ordersDb from "@/lib/orders/supabase-repository";
import { enqueueSiigoSyncJob } from "@/lib/siigo/sync-jobs";
import { assertSiigoConfigured, SiigoNotConfiguredError } from "@/lib/siigo/client";
import {
  buildReportCsv,
  EXPORT_REPORT_KINDS,
  type ExportReportKind,
  type ExportSaleRow,
} from "@/lib/reports/export";
import { z } from "zod";

export type SiigoSaleCandidate = ExportSaleRow & {
  siigoStatus: "not_queued" | "pending" | "synced" | "failed";
};

async function loadCompletedSales(
  restaurantId: string,
): Promise<SiigoSaleCandidate[]> {
  if (canUseDemoExperience()) {
    const store = getDemoRestaurantStore();
    const paymentsByOrder = new Map<string, string>();
    for (const payment of store.payments) {
      if (payment.status !== "completed") continue;
      if (!paymentsByOrder.has(payment.orderId)) {
        paymentsByOrder.set(payment.orderId, payment.methodCode);
      }
    }

    return store.orders
      .filter(
        (order) =>
          order.restaurantId === restaurantId && order.status === "completed",
      )
      .map((order) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableLabel: order.tableLabel,
        closedAt: order.closedAt ?? order.openedAt,
        totalMinor: order.totalMinor,
        subtotalMinor: order.subtotalMinor,
        taxMinor: order.taxMinor,
        discountMinor: order.discountMinor,
        status: order.status,
        paymentMethod: paymentsByOrder.get(order.id) ?? null,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          lineTotalMinor: item.lineTotalMinor,
        })),
        // Demo: treat unpaid-to-queue as available; pending count is aggregate only.
        siigoStatus: "not_queued" as const,
      }))
      .sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  }

  return ordersDb.fetchCompletedSalesForReports(restaurantId);
}

const exportSchema = z.object({
  kind: z.enum(EXPORT_REPORT_KINDS),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function exportReportAction(input: {
  kind: ExportReportKind;
  from: string;
  to: string;
}): Promise<{ filename: string; csv: string } | { error: string }> {
  try {
    const parsed = exportSchema.parse(input);
    if (parsed.from > parsed.to) {
      return { error: "La fecha inicial debe ser anterior a la final." };
    }

    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) return { error: "RESTAURANT_NOT_FOUND" };
    requirePermission(context, PERMISSIONS.REPORTS_VIEW, restaurantId);

    const sales = await loadCompletedSales(restaurantId);
    return buildReportCsv(parsed.kind, sales, parsed.from, parsed.to);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "No tienes permiso para exportar reportes." };
    }
    console.error("[exportReportAction]", error);
    return { error: "No pudimos generar el reporte." };
  }
}

export async function listSiigoSalesAction(): Promise<
  { sales: SiigoSaleCandidate[] } | { error: string }
> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) return { error: "RESTAURANT_NOT_FOUND" };
    requirePermission(context, PERMISSIONS.REPORTS_VIEW, restaurantId);

    const sales = await loadCompletedSales(restaurantId);
    return { sales };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "No tienes permiso." };
    }
    console.error("[listSiigoSalesAction]", error);
    return { error: "No pudimos cargar las ventas." };
  }
}

const sendSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1),
});

export async function enqueueSelectedSiigoSalesAction(input: {
  orderIds: string[];
}): Promise<{ queued: number } | { error: string }> {
  try {
    const parsed = sendSchema.parse(input);
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) return { error: "RESTAURANT_NOT_FOUND" };
    requirePermission(context, PERMISSIONS.SIIGO_MANAGE, restaurantId);

    try {
      assertSiigoConfigured();
    } catch (error) {
      if (error instanceof SiigoNotConfiguredError) {
        // Still allow queueing jobs — worker will pick them up once configured.
        // Demo mode also queues a counter.
      } else {
        throw error;
      }
    }

    const sales = await loadCompletedSales(restaurantId);
    const allowed = new Set(
      sales
        .filter((sale) => sale.siigoStatus !== "synced")
        .map((sale) => sale.orderId),
    );

    let queued = 0;
    for (const orderId of parsed.orderIds) {
      if (!allowed.has(orderId)) continue;
      await enqueueSiigoSyncJob({
        restaurantId,
        entityType: "order",
        entityId: orderId,
        operation: "create_invoice",
      });
      queued += 1;
    }

    if (queued === 0) {
      return { error: "No hay ventas válidas para enviar." };
    }

    revalidatePath("/reports");
    return { queued };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { error: "No tienes permiso para enviar a Siigo." };
    }
    console.error("[enqueueSelectedSiigoSalesAction]", error);
    return { error: "No pudimos encolar el envío a Siigo." };
  }
}
