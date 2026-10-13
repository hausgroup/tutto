"use client";

import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReservationOverviewItem } from "@/lib/floor/reservations-overview";
import { cn } from "@/lib/utils";

const TIME_ZONE = "America/Bogota";

export function formatReservationTime(iso: string | null) {
  if (!iso) return "—";
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

export function formatReservationDay(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
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
  showTime = true,
  showDate = false,
  onCancel,
  cancelPending = false,
}: {
  item: ReservationOverviewItem;
  showTime?: boolean;
  showDate?: boolean;
  onCancel?: (item: ReservationOverviewItem) => void;
  cancelPending?: boolean;
}) {
  const tableLabels = item.tables.map((table) => table.label).join(", ");
  const tableLine = item.tables
    .map((table) => `${table.label} (${table.areaName})`)
    .join(", ");
  const detail = [tableLine, item.occasion].filter(Boolean).join(" · ");
  const overCapacity = item.partySize > item.totalCapacity;
  const partyLabel = item.partySize === 1 ? "persona" : "personas";

  return (
    <li className="border-b border-border last:border-b-0">
      <article
        className={cn(
          "grid items-center gap-x-4 px-4 py-3.5",
          onCancel
            ? "grid-cols-[4.75rem_minmax(0,1fr)_auto]"
            : "grid-cols-[4.75rem_minmax(0,1fr)]",
        )}
      >
        <div className="flex flex-col gap-0.5 text-right">
          {showTime ? (
            <>
              <time
                className="block whitespace-nowrap text-[15px] font-semibold leading-5 tabular-nums"
                dateTime={item.scheduledAt ?? undefined}
              >
                {formatReservationTime(item.scheduledAt)}
              </time>
              {showDate && item.scheduledAt ? (
                <p className="text-[13px] leading-5 text-muted-foreground">
                  {formatReservationDay(item.scheduledAt)}
                </p>
              ) : null}
            </>
          ) : (
            <span className="text-[13px] font-medium leading-5 text-muted-foreground">
              Sin hora
            </span>
          )}
          <p
            className="inline-flex items-center justify-end gap-1 text-[13px] leading-5 tabular-nums text-muted-foreground"
            title={`${item.partySize} ${partyLabel}`}
          >
            <Users className="size-3.5 shrink-0" aria-hidden />
            <span>{item.partySize}</span>
            <span className="sr-only">{partyLabel}</span>
          </p>
        </div>
        <div className="min-w-0 py-0.5">
          <h3 className="truncate text-[15px] font-semibold leading-5 tracking-tight">
            {item.guestName}
          </h3>
          {detail ? (
            <p
              className="mt-0.5 truncate text-[13px] leading-5 text-muted-foreground"
              title={detail}
            >
              {item.tables.length === 1 ? "Mesa" : "Mesas"} {detail}
            </p>
          ) : null}
          {overCapacity ? (
            <p className="mt-1 text-[13px] leading-5 text-amber-800 dark:text-amber-200">
              El grupo ({item.partySize}) supera la capacidad ({item.totalCapacity}).
            </p>
          ) : null}
        </div>
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
      </article>
      <p className="sr-only">Mesas: {tableLabels}</p>
    </li>
  );
}
