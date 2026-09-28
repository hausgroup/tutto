"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MobilePosView } from "@/components/pos/mobile-pos-view";
import { PosLoadingShell } from "@/components/pos/pos-loading-shell";
import type { PosBootstrap } from "@/lib/pos/actions";
import {
  getCachedPosBoot,
  getCachedPosCatalog,
  getPendingPosBoot,
  warmPosCatalog,
  warmPosTable,
} from "@/lib/pos/client-cache";
import type { Order } from "@/lib/orders/types";

function placeholderOrder(
  tableId: string,
  tableLabel: string,
  restaurantId: string,
): Order {
  return {
    id: `opening-${tableId}`,
    restaurantId,
    tableId,
    tableLabel,
    orderNumber: 0,
    status: "open",
    subtotalMinor: 0,
    taxMinor: 0,
    discountMinor: 0,
    totalMinor: 0,
    notes: null,
    openedAt: new Date().toISOString(),
    closedAt: null,
    items: [],
  };
}

export function PosClientEntry({
  tableId,
  tableLabel,
}: {
  tableId: string;
  tableLabel: string;
}) {
  const [boot, setBoot] = useState<PosBootstrap | null>(() =>
    getCachedPosBoot(tableId),
  );
  const [catalogWarm, setCatalogWarm] = useState(() => getCachedPosCatalog());

  useEffect(() => {
    let cancelled = false;

    void warmPosCatalog().then((warm) => {
      if (!cancelled && warm) setCatalogWarm(warm);
    });

    const pending = getPendingPosBoot(tableId) ?? warmPosTable(tableId);
    void pending
      .then((result) => {
        if (!cancelled) setBoot(result);
      })
      .catch((error) => {
        if (!cancelled) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : "No pudimos abrir la mesa.";
          toast.error(
            message === "FORBIDDEN"
              ? "No tienes permiso para abrir mesas."
              : message === "BOOTSTRAP_FAILED"
                ? "No pudimos abrir la mesa."
                : message,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tableId]);

  const catalog = boot?.catalog ?? catalogWarm?.catalog ?? null;
  const attendantName =
    boot?.attendantName ?? catalogWarm?.attendantName ?? "";
  const restaurantId =
    boot?.restaurantId ?? catalogWarm?.restaurantId ?? "";

  if (!catalog || !restaurantId) {
    return <PosLoadingShell tableLabel={tableLabel} />;
  }

  return (
    <MobilePosView
      initialOrder={
        boot?.order ?? placeholderOrder(tableId, tableLabel, restaurantId)
      }
      catalog={catalog}
      tableLabel={boot?.tableLabel || tableLabel}
      attendantName={attendantName}
      tableReservation={boot?.tableReservation ?? null}
      opening={!boot}
    />
  );
}
