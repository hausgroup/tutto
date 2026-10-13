"use client";

import { SoftDatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  ModalForm,
  ModalFormField,
  ModalFormRow,
} from "@/components/ui/modal-form-grid";
import { SoftTimePicker } from "@/components/ui/time-picker";

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
  maxPartySize,
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
  maxPartySize: number;
  disabled?: boolean;
}) {
  const partyMax = Math.max(1, maxPartySize);
  const dateId = `${idPrefix}-date`;
  const timeId = `${idPrefix}-time`;

  return (
    <ModalForm>
      <ModalFormField label="Nombre" htmlFor={`${idPrefix}-guest-name`}>
        <Input
          id={`${idPrefix}-guest-name`}
          autoComplete="name"
          placeholder="Nombre del cliente"
          value={guestName}
          onChange={(event) => onGuestNameChange(event.target.value)}
          disabled={disabled}
        />
      </ModalFormField>

      <ModalFormRow cols={2}>
        <ModalFormField label="Fecha" htmlFor={dateId}>
          <SoftDatePicker
            id={dateId}
            value={dateYmd}
            onChange={onDateYmdChange}
            className="w-full"
          />
        </ModalFormField>
        <ModalFormField label="Hora" htmlFor={timeId}>
          <SoftTimePicker
            id={timeId}
            value={timeHm}
            onChange={onTimeHmChange}
            disabled={disabled}
            className="w-full"
          />
        </ModalFormField>
      </ModalFormRow>

      <ModalFormRow cols={2}>
        <ModalFormField label="Personas" htmlFor={`${idPrefix}-party-size`}>
          <Input
            id={`${idPrefix}-party-size`}
            type="number"
            inputMode="numeric"
            min={1}
            max={partyMax}
            value={partySize}
            onChange={(event) => onPartySizeChange(event.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Máximo {partyMax}{" "}
            {partyMax === 1 ? "persona" : "personas"} (capacidad de las mesas)
          </p>
        </ModalFormField>
        <ModalFormField label="Ocasión" htmlFor={`${idPrefix}-occasion`}>
          <Input
            id={`${idPrefix}-occasion`}
            placeholder="Ej. cumpleaños"
            value={occasion}
            onChange={(event) => onOccasionChange(event.target.value)}
            disabled={disabled}
          />
        </ModalFormField>
      </ModalFormRow>
    </ModalForm>
  );
}
