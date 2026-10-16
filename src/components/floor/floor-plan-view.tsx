"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/arc/button/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FloorGridView } from "@/components/floor/floor-grid-view";
import { FloorMobileTableList } from "@/components/floor/floor-mobile-table-list";
import { FloorZonePills } from "@/components/floor/floor-zone-pills";
import { TableReservationDialog } from "@/components/floor/table-reservation-dialog";
import type { FloorSnapshot, RestaurantTable } from "@/lib/floor/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { warmPosCatalog, warmPosTable } from "@/lib/pos/client-cache";
import { persistStaffNameForTable } from "@/lib/pos/staff-attendant";
import { effectiveOperationalStatus } from "@/lib/floor/status";
import {
  patchCachedFloorPendingBarDrinks,
  refreshFloorBootInBackground,
} from "@/lib/floor/client-cache";
import { deliverWithMealBarDrinksAtTableAction } from "@/lib/orders/actions";
import { capitalizeWordsInInput } from "@/lib/utils/capitalize-input";
import { cn } from "@/lib/utils";

const STAFF_PROMPT_VISUAL = "/visuals/staff-attendant-hero.png";

function posHref(
  table: RestaurantTable,
  staffName?: string,
  floorAreaId?: string,
) {
  const params = new URLSearchParams();
  params.set("t", table.label);
  const staff = staffName?.trim();
  if (staff) params.set("staff", staff);
  const area = floorAreaId?.trim();
  if (area) params.set("area", area);
  return `/pos/${table.id}?${params.toString()}`;
}

function tableIsFreeForNewOrder(
  table: RestaurantTable,
  billTotalsByTableId: Record<string, number>,
): boolean {
  return (
    effectiveOperationalStatus(table.status, billTotalsByTableId[table.id]) ===
    "available"
  );
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
  restaurantId,
  snapshot,
  billTotalsByTableId = {},
  pendingBarDrinksByTableId = {},
  onPendingBarDrinksChange,
  reservePickActive = false,
  onReservePickActiveChange,
  initialAreaId,
  className,
}: {
  restaurantId: string;
  snapshot: FloorSnapshot;
  initialAreaId?: string;
  billTotalsByTableId?: Record<string, number>;
  pendingBarDrinksByTableId?: Record<string, true>;
  onPendingBarDrinksChange?: (
    tableId: string,
    pending: boolean,
  ) => void;
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
  const [activeAreaId, setActiveAreaId] = useState(() => {
    const fallback = snapshot.areas[0]?.id ?? "";
    if (
      initialAreaId &&
      snapshot.areas.some((area) => area.id === initialAreaId)
    ) {
      return initialAreaId;
    }
    return fallback;
  });
  const [staffPromptTable, setStaffPromptTable] =
    useState<RestaurantTable | null>(null);
  const [staffNameInput, setStaffNameInput] = useState("");
  const [deliveringWithMealTableId, setDeliveringWithMealTableId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setLiveSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (
      !initialAreaId ||
      !snapshot.areas.some((area) => area.id === initialAreaId)
    ) {
      return;
    }
    setActiveAreaId(initialAreaId);
  }, [initialAreaId, snapshot.areas]);

  function deliverWithMealDrinksAtTable(table: RestaurantTable) {
    startTransition(async () => {
      setDeliveringWithMealTableId(table.id);
      onPendingBarDrinksChange?.(table.id, false);
      patchCachedFloorPendingBarDrinks(table.id, false);
      const result = await deliverWithMealBarDrinksAtTableAction({
        restaurantId,
        tableId: table.id,
      });
      setDeliveringWithMealTableId(null);
      if (result.error) {
        toast.error(result.error);
        refreshFloorBootInBackground();
        return;
      }
      if ((result.deliveredCount ?? 0) > 0) {
        toast.success("Bebidas con la comida marcadas como entregadas.");
      }
      refreshFloorBootInBackground();
    });
  }

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
      router.prefetch(posHref(table, undefined, activeAreaId));
    }
  }, [router, liveSnapshot.tables, activeAreaId]);

  function warmTable(table: RestaurantTable) {
    void warmPosTable(table.id).catch(() => {});
    router.prefetch(posHref(table, undefined, activeAreaId));
  }

  function openPos(table: RestaurantTable, staffName?: string) {
    setOpeningId(table.id);
    if (staffName?.trim()) {
      persistStaffNameForTable(table.id, staffName);
    }
    void warmPosTable(table.id).catch(() => {});
    router.push(posHref(table, staffName, activeAreaId));
  }

  function beginOpenPos(table: RestaurantTable) {
    if (tableIsFreeForNewOrder(table, billTotalsByTableId)) {
      setStaffNameInput("");
      setStaffPromptTable(table);
      return;
    }
    openPos(table);
  }

  function confirmStaffAndOpenPos() {
    const table = staffPromptTable;
    const name = capitalizeWordsInInput(staffNameInput.trim());
    if (!table) return;
    if (!name) {
      toast.error("Escribe tu nombre para abrir la mesa.");
      return;
    }
    setStaffPromptTable(null);
    openPos(table, name);
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
      beginOpenPos(table);
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
        "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden",
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {areas.length === 0 ? (
          <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-border">
            Este local aún no tiene zonas en el salón. Usa{" "}
            <span className="font-medium text-foreground">Editar plano</span>{" "}
            para crear áreas y mesas.
          </p>
        ) : null}
        {areas.length > 0 && isMobile ? (
          <div data-floor-grid-scroll className="p-1">
            <FloorMobileTableList
              tables={tablesForArea}
              onSelect={handleTablePress}
              onWarm={warmTable}
              billTotalsByTableId={billTotalsByTableId}
              pendingBarDrinksByTableId={pendingBarDrinksByTableId}
              deliveringWithMealDrinksTableId={deliveringWithMealTableId}
              onDeliverPendingWithMealDrinks={deliverWithMealDrinksAtTable}
              openingTableId={openingId}
              highlightedTableIds={selectedReserveIds}
              reservePickMode={reservePickActive}
            />
          </div>
        ) : areas.length > 0 ? (
          <FloorGridView
            tables={tablesForArea}
            onSelect={handleTablePress}
            onWarm={warmTable}
            billTotalsByTableId={billTotalsByTableId}
            pendingBarDrinksByTableId={pendingBarDrinksByTableId}
            deliveringWithMealDrinksTableId={deliveringWithMealTableId}
            onDeliverPendingWithMealDrinks={deliverWithMealDrinksAtTable}
            openingTableId={openingId}
            highlightedTableIds={selectedReserveIds}
            reservePickMode={reservePickActive}
            className="min-h-0 flex-1"
          />
        ) : null}
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
        onReserveFailed={() => {
          refreshFloorBootInBackground((boot) => {
            setLiveSnapshot(boot.snapshot);
          });
        }}
      />

      <Dialog
        open={staffPromptTable != null}
        onOpenChange={(open) => {
          if (!open) setStaffPromptTable(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-[22rem]"
        >
          <div
            className={cn(
              "mx-4 mt-4 flex items-center justify-center rounded-[8px] bg-muted/60 py-4",
              "dark:bg-muted/35",
            )}
          >
            <img
              src={STAFF_PROMPT_VISUAL}
              alt=""
              aria-hidden
              className="h-[9.25rem] w-auto max-w-full object-contain sm:h-[10rem]"
              width={224}
              height={224}
            />
          </div>

          <div className="flex flex-col gap-4 px-5 pb-5 pt-4">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-semibold leading-tight tracking-tight text-foreground">
                {staffPromptTable
                  ? `Mesa ${staffPromptTable.label}`
                  : "Abrir mesa"}
              </DialogTitle>
              <p className="text-sm leading-snug text-muted-foreground">
                Escribe el nombre de quien atiende. Aparecerá en el ticket de
                cocina y barra.
              </p>
            </div>

            <Input
              value={staffNameInput}
              onChange={(event) => setStaffNameInput(event.target.value)}
              placeholder="Nombre del mesero"
              aria-label="Nombre de quien atiende la mesa"
              autoFocus
              autoComplete="name"
              className="h-12 text-base"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmStaffAndOpenPos();
                }
              }}
            />

            <div className="flex gap-2 pt-0.5">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setStaffPromptTable(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                disabled={!staffNameInput.trim()}
                onClick={confirmStaffAndOpenPos}
              >
                Abrir mesa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
