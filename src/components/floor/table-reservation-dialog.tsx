"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/arc/button/button";
import {
  Dialog,
  DialogContent,
} from "@/components/arc/dialog/dialog";
import dialogStyles from "@/components/arc/dialog/dialog.module.css";
import { TableReservationFormFields } from "@/components/floor/table-reservation-form-fields";
import { reserveTablesFromPosAction } from "@/lib/orders/actions";
import {
  defaultReservationDateTime,
  isoToLocalParts,
  localPartsToIso,
} from "@/lib/floor/reservation-time";
import type { RestaurantTable, TableReservation } from "@/lib/floor/types";
import {
  patchCachedFloorBillTotal,
  patchCachedFloorPendingBarDrinks,
  patchCachedFloorTablesReservations,
} from "@/lib/floor/client-cache";
import { clearCachedPosBoot } from "@/lib/pos/client-cache";
import { isSoftDatePickerPanelTarget } from "@/components/ui/date-picker";

function keepPortaledDatePicker(event: {
  preventDefault: () => void;
  target: EventTarget | null;
  detail?: { originalEvent?: Event };
}) {
  const target =
    event.detail?.originalEvent?.target ?? event.target;
  if (isSoftDatePickerPanelTarget(target)) {
    event.preventDefault();
  }
}

export function TableReservationDialog({
  tables,
  open,
  onOpenChange,
  onReserved,
  navigateToFloorOnCreate = false,
}: {
  tables: RestaurantTable[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReserved?: (tables: RestaurantTable[]) => void;
  /** After a new reservation from POS, return to salón. */
  navigateToFloorOnCreate?: boolean;
}) {
  const router = useRouter();
  const [guestName, setGuestName] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [occasion, setOccasion] = useState("");
  const [dateYmd, setDateYmd] = useState("");
  const [timeHm, setTimeHm] = useState("");
  const [pending, startTransition] = useTransition();

  const primaryTable = tables[0] ?? null;
  const activeReservation = primaryTable?.reservation ?? null;
  const existingGroupId = useMemo(() => {
    const ids = tables
      .map((t) => t.reservation?.groupId)
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return null;
    return ids[0] ?? null;
  }, [tables]);

  const tableLabels = useMemo(
    () =>
      [...tables]
        .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }))
        .map((t) => t.label),
    [tables],
  );

  useEffect(() => {
    if (!open || tables.length === 0) return;
    const seed = primaryTable?.reservation;
    if (seed) {
      setGuestName(seed.guestName);
      setPartySize(String(seed.partySize));
      setOccasion(seed.occasion);
      if (seed.scheduledAt) {
        const parts = isoToLocalParts(seed.scheduledAt);
        setDateYmd(parts.dateYmd);
        setTimeHm(parts.timeHm);
      } else {
        const defaults = defaultReservationDateTime();
        setDateYmd(defaults.dateYmd);
        setTimeHm(defaults.timeHm);
      }
      return;
    }
    setGuestName("");
    setPartySize("2");
    setOccasion("");
    const defaults = defaultReservationDateTime();
    setDateYmd(defaults.dateYmd);
    setTimeHm(defaults.timeHm);
  }, [open, tables, primaryTable]);

  function submitReserve() {
    if (tables.length === 0) return;
    const trimmedName = guestName.trim();
    const trimmedOccasion = occasion.trim();
    const size = Number.parseInt(partySize, 10);
    if (!trimmedName) {
      toast.error("Ingresa el nombre de la reserva.");
      return;
    }
    if (!dateYmd || !timeHm) {
      toast.error("Indica fecha y hora de la reserva.");
      return;
    }
    if (!Number.isFinite(size) || size < 1 || size > 99) {
      toast.error("Indica cuántas personas (1–99).");
      return;
    }
    if (!trimmedOccasion) {
      toast.error("Indica la ocasión.");
      return;
    }

    const scheduledAt = localPartsToIso(dateYmd, timeHm);
    const tableIds = tables.map((t) => t.id);

    const groupId = existingGroupId ?? crypto.randomUUID();

    startTransition(async () => {
      const wasUpdate = Boolean(activeReservation);
      const result = await reserveTablesFromPosAction({
        tableIds,
        guestName: trimmedName,
        partySize: size,
        occasion: trimmedOccasion,
        scheduledAt,
        groupId,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const reservation: TableReservation = {
        guestName: trimmedName,
        partySize: size,
        occasion: trimmedOccasion,
        scheduledAt,
        groupId,
      };

      const cacheUpdates = tableIds.map((tableId) => ({
        tableId,
        reservation,
      }));
      patchCachedFloorTablesReservations(cacheUpdates);
      for (const tableId of tableIds) {
        patchCachedFloorBillTotal(tableId, 0);
        patchCachedFloorPendingBarDrinks(tableId, false);
      }

      const updated = tables.map((table) => ({
        ...table,
        status: "reserved" as const,
        reservation: { ...reservation, groupId: reservation.groupId },
      }));
      onReserved?.(updated);
      onOpenChange(false);

      if (!wasUpdate && navigateToFloorOnCreate && primaryTable) {
        clearCachedPosBoot(primaryTable.id);
        router.push("/floor");
      }
    });
  }

  if (tables.length === 0) return null;

  const title =
    tables.length === 1
      ? activeReservation
        ? `Reserva — ${tables[0]!.label}`
        : `Reservar ${tables[0]!.label}`
      : activeReservation
        ? `Reserva — ${tables.length} mesas`
        : `Reservar ${tables.length} mesas`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        titleClassName={dialogStyles.titleHeading}
        onPointerDownOutside={keepPortaledDatePicker}
        onInteractOutside={keepPortaledDatePicker}
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tableLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium"
            >
              Mesa {label}
            </span>
          ))}
        </div>
        <TableReservationFormFields
          idPrefix="salon-reserve"
          guestName={guestName}
          onGuestNameChange={setGuestName}
          partySize={partySize}
          onPartySizeChange={setPartySize}
          occasion={occasion}
          onOccasionChange={setOccasion}
          dateYmd={dateYmd}
          onDateYmdChange={setDateYmd}
          timeHm={timeHm}
          onTimeHmChange={setTimeHm}
          disabled={pending}
        />
        <div
          className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-5"
        >
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={pending}
              onClick={submitReserve}
            >
              {activeReservation ? "Guardar cambios" : "Confirmar reserva"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
