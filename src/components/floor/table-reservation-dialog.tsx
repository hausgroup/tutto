"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/arc/button/button";
import {
  Dialog,
  DialogContent,
} from "@/components/arc/dialog/dialog";
import dialogStyles from "@/components/arc/dialog/dialog.module.css";
import { TableReservationFormFields } from "@/components/floor/table-reservation-form-fields";
import { reserveTableFromPosAction } from "@/lib/orders/actions";
import {
  defaultReservationDateTime,
  isoToLocalParts,
  localPartsToIso,
} from "@/lib/floor/reservation-time";
import type { RestaurantTable, TableReservation } from "@/lib/floor/types";
import {
  patchCachedFloorBillTotal,
  patchCachedFloorPendingBarDrinks,
  patchCachedFloorTableReservation,
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
  table,
  open,
  onOpenChange,
  onReserved,
  navigateToFloorOnCreate = false,
}: {
  table: RestaurantTable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReserved?: (table: RestaurantTable) => void;
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

  const activeReservation = table?.reservation ?? null;

  useEffect(() => {
    if (!open || !table) return;
    if (table.reservation) {
      setGuestName(table.reservation.guestName);
      setPartySize(String(table.reservation.partySize));
      setOccasion(table.reservation.occasion);
      if (table.reservation.scheduledAt) {
        const parts = isoToLocalParts(table.reservation.scheduledAt);
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
  }, [open, table]);

  function submitReserve() {
    if (!table) return;
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

    startTransition(async () => {
      const wasUpdate = Boolean(activeReservation);
      const result = await reserveTableFromPosAction({
        tableId: table.id,
        guestName: trimmedName,
        partySize: size,
        occasion: trimmedOccasion,
        scheduledAt,
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
      };
      patchCachedFloorTableReservation(table.id, reservation);
      patchCachedFloorBillTotal(table.id, 0);
      patchCachedFloorPendingBarDrinks(table.id, false);

      const updated: RestaurantTable = {
        ...table,
        status: "reserved",
        reservation,
      };
      onReserved?.(updated);
      onOpenChange(false);
      if (!wasUpdate && navigateToFloorOnCreate) {
        clearCachedPosBoot(table.id);
        toast.success(`${table.label} reservada para ${trimmedName}.`);
        router.push("/floor");
        return;
      }
      toast.success(
        wasUpdate
          ? "Reserva actualizada."
          : `${table.label} reservada para ${trimmedName}.`,
      );
    });
  }

  if (!table) return null;

  const title = activeReservation
    ? `Reserva — ${table.label}`
    : `Reservar ${table.label}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        titleClassName={dialogStyles.titleHeading}
        onPointerDownOutside={keepPortaledDatePicker}
        onInteractOutside={keepPortaledDatePicker}
      >
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
