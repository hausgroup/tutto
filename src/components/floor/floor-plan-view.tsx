"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/arc/button/button";
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
  const reduceMotion = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState(snapshot);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [selectedReserveIds, setSelectedReserveIds] = useState<Set<string>>(
    () => new Set(),
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
      setSelectedReserveIds(new Set());
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

  const tableById = useMemo(
    () => new Map(liveSnapshot.tables.map((table) => [table.id, table])),
    [liveSnapshot.tables],
  );

  const reserveDialogTables = useMemo(() => {
    return [...selectedReserveIds]
      .map((id) => tableById.get(id))
      .filter((table): table is RestaurantTable => Boolean(table));
  }, [selectedReserveIds, tableById]);

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

  function tableIdsInReservationGroup(table: RestaurantTable): string[] {
    const groupId = table.reservation?.groupId;
    if (!groupId) return [table.id];
    return liveSnapshot.tables
      .filter((item) => item.reservation?.groupId === groupId)
      .map((item) => item.id);
  }

  function toggleReserveSelection(table: RestaurantTable) {
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

    const groupIds = tableIdsInReservationGroup(table);
    setSelectedReserveIds((current) => {
      const next = new Set(current);
      const removing = groupIds.some((id) => next.has(id));
      if (removing) {
        for (const id of groupIds) next.delete(id);
      } else {
        for (const id of groupIds) next.add(id);
      }
      return next;
    });
  }

  function handleTablePress(table: RestaurantTable) {
    if (!reservePickActive) {
      openPos(table);
      return;
    }
    toggleReserveSelection(table);
  }

  function openReserveDialog() {
    if (selectedReserveIds.size === 0) return;
    setReserveDialogOpen(true);
  }

  function handleReserved(updated: RestaurantTable[]) {
    setLiveSnapshot((current) => {
      const byId = new Map(updated.map((table) => [table.id, table]));
      return {
        ...current,
        tables: current.tables.map((table) => byId.get(table.id) ?? table),
      };
    });
    onReservePickActiveChange?.(false);
    setSelectedReserveIds(new Set());
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
            highlightedTableIds={selectedReserveIds}
          />
        ) : (
          <FloorGridView
            tables={tablesForArea}
            onSelect={handleTablePress}
            onWarm={warmTable}
            billTotalsByTableId={billTotalsByTableId}
            pendingBarDrinksByTableId={pendingBarDrinksByTableId}
            openingTableId={openingId}
            highlightedTableIds={selectedReserveIds}
            className="min-h-[min(70vh,calc(100dvh-12rem))]"
          />
        )}
      </div>

      <AnimatePresence>
        {reservePickActive ? (
          <motion.div
            key="reserve-pick-bar"
            role="status"
            aria-live="polite"
            initial={reduceMotion ? false : { y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 16, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-none fixed bottom-5 left-1/2 z-30 -translate-x-1/2"
          >
            <div
              className="pointer-events-auto flex items-center gap-3 rounded-full border border-border/80 bg-card/95 py-2 pl-4 pr-2 shadow-[0_8px_32px_rgba(15,15,15,0.12)] backdrop-blur-md dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
            >
              <span className="text-sm font-medium tabular-nums text-foreground">
                {selectedReserveIds.size}{" "}
                <span className="font-normal text-muted-foreground">
                  {selectedReserveIds.size === 1 ? "mesa" : "mesas"}
                </span>
              </span>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="rounded-full"
                disabled={selectedReserveIds.size === 0}
                onClick={openReserveDialog}
              >
                Continuar
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <TableReservationDialog
        tables={reserveDialogTables}
        open={reserveDialogOpen}
        onOpenChange={(open) => {
          setReserveDialogOpen(open);
        }}
        onReserved={handleReserved}
      />
    </div>
  );
}
