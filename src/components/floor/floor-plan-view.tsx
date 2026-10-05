"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FloorGridView } from "@/components/floor/floor-grid-view";
import { FloorMobileTableList } from "@/components/floor/floor-mobile-table-list";
import { FloorZonePills } from "@/components/floor/floor-zone-pills";
import { TableReservationDialog } from "@/components/floor/table-reservation-dialog";
import type { FloorSnapshot, RestaurantTable } from "@/lib/floor/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { warmPosCatalog, warmPosTable } from "@/lib/pos/client-cache";
import { cn } from "@/lib/utils";

function posHref(table: RestaurantTable) {
  return `/pos/${table.id}?t=${encodeURIComponent(table.label)}`;
}

function canReserveTable(
  table: RestaurantTable,
  billTotalsByTableId: Record<string, number>,
): boolean {
  const bill = billTotalsByTableId[table.id];
  if (bill != null && bill > 0) return false;
  return table.status === "available" || table.status === "reserved";
}

export function FloorPlanView({
  snapshot,
  billTotalsByTableId = {},
  pendingBarDrinksByTableId = {},
  reservePickActive = false,
  onReservePickActiveChange,
  className,
}: {
  snapshot: FloorSnapshot;
  billTotalsByTableId?: Record<string, number>;
  pendingBarDrinksByTableId?: Record<string, true>;
  reservePickActive?: boolean;
  onReservePickActiveChange?: (active: boolean) => void;
  className?: string;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [pending, startTransition] = useTransition();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState(snapshot);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [reserveTable, setReserveTable] = useState<RestaurantTable | null>(
    null,
  );
  const [activeAreaId, setActiveAreaId] = useState(
    snapshot.areas[0]?.id ?? "",
  );

  useEffect(() => {
    setLiveSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!reservePickActive) {
      setReserveDialogOpen(false);
      setReserveTable(null);
    }
  }, [reservePickActive]);

  const areas = useMemo(
    () => [...liveSnapshot.areas].sort((a, b) => a.sortOrder - b.sortOrder),
    [liveSnapshot.areas],
  );

  useEffect(() => {
    if (!areas.some((area) => area.id === activeAreaId)) {
      setActiveAreaId(areas[0]?.id ?? "");
    }
  }, [areas, activeAreaId]);

  const tablesForArea = useMemo(
    () =>
      liveSnapshot.tables.filter(
        (table) => table.floorAreaId === activeAreaId && table.isActive,
      ),
    [liveSnapshot.tables, activeAreaId],
  );

  useEffect(() => {
    void warmPosCatalog();
    for (const table of liveSnapshot.tables) {
      if (!table.isActive) continue;
      router.prefetch(posHref(table));
    }
  }, [router, liveSnapshot.tables]);

  function warmTable(table: RestaurantTable) {
    void warmPosTable(table.id).catch(() => {});
    router.prefetch(posHref(table));
  }

  function openPos(table: RestaurantTable) {
    setOpeningId(table.id);
    void warmPosTable(table.id).catch(() => {});
    const href = posHref(table);
    startTransition(() => {
      router.push(href);
    });
  }

  function handleTablePress(table: RestaurantTable) {
    if (!reservePickActive) {
      openPos(table);
      return;
    }

    if (!canReserveTable(table, billTotalsByTableId)) {
      const bill = billTotalsByTableId[table.id];
      if (bill != null && bill > 0) {
        toast.error(
          "Hay productos en la cuenta. Cierra o vacía el pedido antes de reservar.",
        );
      } else {
        toast.error("Esta mesa no está disponible para reservar.");
      }
      return;
    }

    setReserveTable(table);
    setReserveDialogOpen(true);
  }

  function handleReserved(updated: RestaurantTable) {
    setLiveSnapshot((current) => ({
      ...current,
      tables: current.tables.map((table) =>
        table.id === updated.id ? updated : table,
      ),
    }));
    onReservePickActiveChange?.(false);
    setReserveTable(null);
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3",
        (pending || openingId) && "cursor-progress",
        className,
      )}
    >
      <div className="shrink-0">
        <FloorZonePills
          areas={areas}
          activeAreaId={activeAreaId}
          onSelect={setActiveAreaId}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {isMobile ? (
          <FloorMobileTableList
            tables={tablesForArea}
            onSelect={handleTablePress}
            onWarm={warmTable}
            billTotalsByTableId={billTotalsByTableId}
            pendingBarDrinksByTableId={pendingBarDrinksByTableId}
            openingTableId={openingId}
          />
        ) : (
          <FloorGridView
            tables={tablesForArea}
            onSelect={handleTablePress}
            onWarm={warmTable}
            billTotalsByTableId={billTotalsByTableId}
            pendingBarDrinksByTableId={pendingBarDrinksByTableId}
            openingTableId={openingId}
            className="min-h-[min(70vh,calc(100dvh-12rem))]"
          />
        )}
      </div>

      <TableReservationDialog
        table={reserveTable}
        open={reserveDialogOpen}
        onOpenChange={(open) => {
          setReserveDialogOpen(open);
          if (!open) setReserveTable(null);
        }}
        onReserved={handleReserved}
      />
    </div>
  );
}
