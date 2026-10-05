"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/arc/input/input";
import inputStyles from "@/components/arc/input/input.module.css";
import { SoftDatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

function ReservationField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(inputStyles.field, className)}>
      <label className={inputStyles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

const arcDateTrigger = cn(
  inputStyles.input,
  "flex cursor-pointer items-center gap-2 text-left font-normal",
  "hover:border-[var(--foreground)]",
);

export function TableReservationFormFields({
  idPrefix,
  guestName,
  onGuestNameChange,
  partySize,
  onPartySizeChange,
  occasion,
  onOccasionChange,
  dateYmd,
  onDateYmdChange,
  timeHm,
  onTimeHmChange,
  disabled = false,
}: {
  idPrefix: string;
  guestName: string;
  onGuestNameChange: (value: string) => void;
  partySize: string;
  onPartySizeChange: (value: string) => void;
  occasion: string;
  onOccasionChange: (value: string) => void;
  dateYmd: string;
  onDateYmdChange: (value: string) => void;
  timeHm: string;
  onTimeHmChange: (value: string) => void;
  disabled?: boolean;
}) {
  const dateId = `${idPrefix}-date`;
  const timeId = `${idPrefix}-time`;

  return (
    <div className="flex flex-col gap-5">
      <Input
        id={`${idPrefix}-guest-name`}
        label="Nombre"
        autoComplete="name"
        placeholder="Nombre del cliente"
        value={guestName}
        onChange={(event) => onGuestNameChange(event.target.value)}
        disabled={disabled}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <ReservationField label="Fecha" htmlFor={dateId}>
          <SoftDatePicker
            id={dateId}
            value={dateYmd}
            onChange={onDateYmdChange}
            className="w-full"
            triggerClassName={arcDateTrigger}
          />
        </ReservationField>
        <Input
          id={timeId}
          label="Hora"
          type="time"
          value={timeHm}
          onChange={(event) => onTimeHmChange(event.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4">
        <Input
          id={`${idPrefix}-party-size`}
          label="Personas"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          value={partySize}
          onChange={(event) => onPartySizeChange(event.target.value)}
          disabled={disabled}
        />
        <Input
          id={`${idPrefix}-occasion`}
          label="Ocasión"
          placeholder="Cumpleaños, aniversario, negocios…"
          value={occasion}
          onChange={(event) => onOccasionChange(event.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
