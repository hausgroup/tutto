"use client";

import { CalendarCheck } from "lucide-react";
import { formatReservationWhen } from "@/lib/floor/reservation-time";
import type { TableReservation } from "@/lib/floor/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PosTableReservationIndicator({
  reservation,
  onEdit,
  onCancel,
  cancelPending = false,
}: {
  reservation: TableReservation;
  onEdit?: () => void;
  onCancel?: () => void;
  cancelPending?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center text-[#8A8050] transition-opacity hover:opacity-80 dark:text-[#E4DDB0]"
          aria-label={`Reserva: ${reservation.guestName}`}
        >
          <CalendarCheck className="size-5" strokeWidth={1.75} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px]">
        <DropdownMenuLabel className="space-y-1.5 font-normal">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Reserva
          </p>
          <p className="text-sm font-semibold text-foreground">
            {reservation.guestName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatReservationWhen(reservation.scheduledAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            {reservation.partySize} personas · {reservation.occasion}
          </p>
        </DropdownMenuLabel>
        {onEdit || onCancel ? (
          <>
            <DropdownMenuSeparator />
            {onEdit ? (
              <DropdownMenuItem onSelect={onEdit}>Editar reserva</DropdownMenuItem>
            ) : null}
            {onCancel ? (
              <DropdownMenuItem
                disabled={cancelPending}
                className="text-destructive focus:text-destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  onCancel();
                }}
              >
                Cancelar reserva
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
