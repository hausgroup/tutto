"use client";

import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReservationOverviewItem } from "@/lib/floor/reservations-overview";

const TIME_ZONE = "America/Bogota";

export function formatReservationTime(iso: string | null) {
  if (!iso) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const period =
    parts.find((part) => part.type === "dayPeriod")?.value.toLowerCase() ?? "";
  return `${hour}:${minute} ${period}`;
}

function formatReservationDateLabel(iso: string | null) {
  if (!iso) return "Sin programar";
  const raw = new Intl.DateTimeFormat("es-CO", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const timePillClass =
  "inline-flex shrink-0 items-center rounded-full bg-muted px-2.5 py-1 text-[13px] font-semibold leading-none tabular-nums text-foreground ring-1 ring-border";

function formatTablesLine(item: ReservationOverviewItem) {
  return item.tables
    .map((table) => `${table.label} (${table.areaName})`)
    .join(", ");
}

export function ReservationSectionTitle({
  title,
  meta,
}: {
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex h-9 items-center justify-between gap-4">
      <h2 className="min-w-0 truncate text-[15px] font-semibold leading-none tracking-tight">
        {title}
      </h2>
      {meta ? (
        <p className="text-[13px] leading-none tabular-nums text-muted-foreground">
          {meta}
        </p>
      ) : null}
    </div>
  );
}

export function ReservationEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-card px-4 py-10 text-center text-[13px] leading-5 text-muted-foreground ring-1 ring-border">
      {children}
    </p>
  );
}

export function ReservationList({ children }: { children: ReactNode }) {
  return (
    <ul className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      {children}
    </ul>
  );
}

export function ReservationCard({
  item,
  onCancel,
  cancelPending = false,
}: {
  item: ReservationOverviewItem;
  onCancel?: (item: ReservationOverviewItem) => void;
  cancelPending?: boolean;
}) {
  const tableLine = formatTablesLine(item);
  const timeLabel = formatReservationTime(item.scheduledAt);
  const dateLabel = formatReservationDateLabel(item.scheduledAt);
  const overCapacity = item.partySize > item.totalCapacity;
  const partyLabel = item.partySize === 1 ? "persona" : "personas";

  return (
    <li className="border-b border-border last:border-b-0">
      <article
        className="flex items-stretch gap-3 px-4 py-3.5"
        aria-label={`${item.guestName}, ${timeLabel ?? "sin hora"}, ${item.partySize} ${partyLabel}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 truncate text-[15px] font-semibold leading-5 tracking-tight text-foreground">
              {item.guestName}
            </h3>
            <time
              className={timePillClass}
              dateTime={item.scheduledAt ?? undefined}
            >
              {timeLabel ?? "Sin hora"}
            </time>
          </div>

          <p className="text-[13px] leading-5 text-muted-foreground">
            <span className="text-foreground/80">Fecha:</span> {dateLabel}
            <span className="mx-1.5 text-border" aria-hidden>·</span>
            <span className="text-foreground/80">Mesas:</span> {tableLine}
            <span className="mx-1.5 text-border" aria-hidden>·</span>
            <span className="text-foreground/80">Ocasión:</span> {item.occasion}
          </p>

          {overCapacity ? (
            <p className="text-[13px] leading-5 text-amber-800 dark:text-amber-200">
              El grupo ({item.partySize}) supera la capacidad (
              {item.totalCapacity}).
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-4 self-center">
          <span
            className="inline-flex items-center gap-1 text-[15px] font-semibold leading-none tabular-nums text-foreground"
            title={`${item.partySize} ${partyLabel}`}
          >
            <Users className="size-4 shrink-0 opacity-75" aria-hidden />
            <span>{item.partySize}</span>
            <span className="sr-only">{partyLabel}</span>
          </span>
          {onCancel ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="shrink-0"
              disabled={cancelPending}
              onClick={() => onCancel(item)}
            >
              {cancelPending ? "Cancelando…" : "Cancelar"}
            </Button>
          ) : null}
        </div>
      </article>
    </li>
  );
}
