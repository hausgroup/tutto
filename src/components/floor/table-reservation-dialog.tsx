"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TableReservationFormFields } from "@/components/floor/table-reservation-form-fields";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
  FormDialogTitle,
} from "@/components/ui/form-dialog";
import { isSoftDatePickerPanelTarget } from "@/components/ui/date-picker";
import { isSoftTimePickerPanelTarget } from "@/components/ui/time-picker";
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

function keepPortaledDatePicker(event: {
  preventDefault: () => void;
  target: EventTarget | null;
  detail?: { originalEvent?: Event };
}) {
  const target =
    event.detail?.originalEvent?.target ?? event.target;
  if (
    isSoftDatePickerPanelTarget(target) ||
    isSoftTimePickerPanelTarget(target)
  ) {
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
      <FormDialogContent
        className="overflow-visible sm:max-w-md"
        onPointerDownOutside={keepPortaledDatePicker}
        onInteractOutside={keepPortaledDatePicker}
      >
        <FormDialogHeader>
          <FormDialogTitle>{title}</FormDialogTitle>
        </FormDialogHeader>
        <FormDialogBody className="overflow-visible">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {tableLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium"
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
        </FormDialogBody>
        <FormDialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={submitReserve}
          >
            {activeReservation ? "Guardar cambios" : "Confirmar reserva"}
          </Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
