"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { reserveTableFromPosAction } from "@/lib/orders/actions";
import type { TableReservation } from "@/lib/floor/types";
import {
  clearCachedPosBoot,
} from "@/lib/pos/client-cache";
import {
  patchCachedFloorBillTotal,
  patchCachedFloorPendingBarDrinks,
  patchCachedFloorTableReservation,
} from "@/lib/floor/client-cache";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PosTableHeaderMenu({
  tableId,
  tableLabel,
  hasBill,
  initialReservation = null,
  disabled = false,
}: {
  tableId: string;
  tableLabel: string;
  hasBill: boolean;
  initialReservation?: TableReservation | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [occasion, setOccasion] = useState("");
  const [pending, startTransition] = useTransition();
  const [activeReservation, setActiveReservation] = useState(
    initialReservation ?? null,
  );

  useEffect(() => {
    setActiveReservation(initialReservation ?? null);
  }, [initialReservation]);

  function resetForm() {
    if (activeReservation) {
      setGuestName(activeReservation.guestName);
      setPartySize(String(activeReservation.partySize));
      setOccasion(activeReservation.occasion);
      return;
    }
    setGuestName("");
    setPartySize("2");
    setOccasion("");
  }

  function openReserveDialog() {
    setMenuOpen(false);
    if (hasBill) {
      toast.error(
        "Hay productos en la cuenta. Envía o elimina el pedido antes de reservar.",
      );
      return;
    }
    resetForm();
    setDialogOpen(true);
  }

  function submitReserve() {
    const trimmedName = guestName.trim();
    const trimmedOccasion = occasion.trim();
    const size = Number.parseInt(partySize, 10);
    if (!trimmedName) {
      toast.error("Ingresa el nombre de la reserva.");
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

    startTransition(async () => {
      const wasUpdate = Boolean(activeReservation);
      const result = await reserveTableFromPosAction({
        tableId,
        guestName: trimmedName,
        partySize: size,
        occasion: trimmedOccasion,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const reservation: TableReservation = {
        guestName: trimmedName,
        partySize: size,
        occasion: trimmedOccasion,
      };
      patchCachedFloorTableReservation(tableId, reservation);
      patchCachedFloorBillTotal(tableId, 0);
      patchCachedFloorPendingBarDrinks(tableId, false);
      setActiveReservation(reservation);
      setDialogOpen(false);
      if (wasUpdate) {
        toast.success("Reserva actualizada.");
      } else {
        clearCachedPosBoot(tableId);
        toast.success(`Mesa ${tableLabel} reservada para ${trimmedName}.`);
        router.push("/floor");
      }
    });
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 rounded-full"
            disabled={disabled}
            aria-label={`Opciones de mesa ${tableLabel}`}
          >
            <MoreVertical className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          {activeReservation ? (
            <>
              <DropdownMenuLabel className="space-y-1 font-normal">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Reserva activa
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {activeReservation.guestName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeReservation.partySize} personas ·{" "}
                  {activeReservation.occasion}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onSelect={openReserveDialog}>
            <CalendarCheck className="size-4" />
            {activeReservation ? "Editar reserva" : "Reservar mesa"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeReservation
                ? `Reserva — mesa ${tableLabel}`
                : `Reservar mesa ${tableLabel}`}
            </DialogTitle>
            <DialogDescription>
              {activeReservation
                ? "Puedes actualizar los datos de la reserva."
                : "La mesa quedará marcada como reservada en el salón."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="reserve-guest-name">Nombre</Label>
              <Input
                id="reserve-guest-name"
                autoComplete="name"
                placeholder="Nombre del cliente"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reserve-party-size">Personas</Label>
              <Input
                id="reserve-party-size"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={partySize}
                onChange={(event) => setPartySize(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reserve-occasion">Ocasión</Label>
              <Input
                id="reserve-occasion"
                placeholder="Cumpleaños, aniversario, negocios…"
                value={occasion}
                onChange={(event) => setOccasion(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={pending} onClick={submitReserve}>
              {pending
                ? "Guardando…"
                : activeReservation
                  ? "Guardar cambios"
                  : "Confirmar reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
