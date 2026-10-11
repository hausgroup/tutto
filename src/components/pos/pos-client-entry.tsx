"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MobilePosView } from "@/components/pos/mobile-pos-view";
import { PosLoadingShell } from "@/components/pos/pos-loading-shell";
import type { PosBootstrap } from "@/lib/pos/actions";
import {
  getCachedPosBoot,
  getCachedPosCatalog,
  getPendingPosBoot,
  patchCachedPosAttendantName,
  warmPosCatalog,
  warmPosTable,
} from "@/lib/pos/client-cache";
import {
  persistStaffNameForTable,
  readStaffNameForTable,
} from "@/lib/pos/staff-attendant";
import { getCachedFloorBoot } from "@/lib/floor/client-cache";
import type { TableReservation } from "@/lib/floor/types";
import type { Order } from "@/lib/orders/types";

function tableReservationFromFloorCache(
  tableId: string,
): TableReservation | null {
  const table = getCachedFloorBoot()?.snapshot.tables.find(
    (row) => row.id === tableId,
  );
  if (table?.status === "reserved" && table.reservation) return table.reservation;
  return null;
}

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
  const searchParams = useSearchParams();
  const staffFromUrl = searchParams.get("staff")?.trim() ?? "";

  const [boot, setBoot] = useState<PosBootstrap | null>(() =>
    getCachedPosBoot(tableId),
  );
  const [catalogWarm, setCatalogWarm] = useState(() => getCachedPosCatalog());

  const attendantOverride = useMemo(() => {
    if (staffFromUrl) return staffFromUrl;
    return readStaffNameForTable(tableId)?.trim() ?? "";
  }, [staffFromUrl, tableId]);

  useEffect(() => {
    if (staffFromUrl) persistStaffNameForTable(tableId, staffFromUrl);
  }, [staffFromUrl, tableId]);

  useEffect(() => {
    if (attendantOverride) {
      patchCachedPosAttendantName(tableId, attendantOverride);
    }
  }, [attendantOverride, tableId]);

  useEffect(() => {
    let cancelled = false;

    void warmPosCatalog().then((warm) => {
      if (!cancelled && warm) setCatalogWarm(warm);
    });

    const pending = getPendingPosBoot(tableId) ?? warmPosTable(tableId);
    void pending
      .then((result) => {
        if (!cancelled) {
          setBoot(
            attendantOverride
              ? { ...result, attendantName: attendantOverride }
              : result,
          );
        }
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
  }, [tableId, attendantOverride]);

  const catalog = boot?.catalog ?? catalogWarm?.catalog ?? null;
  const attendantName =
    attendantOverride ||
    boot?.attendantName ||
    catalogWarm?.attendantName ||
    "";
  const restaurantId =
    boot?.restaurantId ?? catalogWarm?.restaurantId ?? "";
  const tableReservation =
    boot?.tableReservation ?? tableReservationFromFloorCache(tableId);

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
      tableReservation={tableReservation}
      opening={!boot}
    />
  );
}
