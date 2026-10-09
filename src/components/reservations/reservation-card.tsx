"use client";

import { Users, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { Badge } from "@/components/arc/badge/badge";
import type { ReservationOverviewItem } from "@/lib/floor/reservations-overview";
import { cn } from "@/lib/utils";

export function formatReservationTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ReservationCard({
  item,
  compact = false,
  showTime = true,
  className,
  onCancel,
  cancelPending = false,
}: {
  item: ReservationOverviewItem;
  compact?: boolean;
  showTime?: boolean;
  className?: string;
  onCancel?: (item: ReservationOverviewItem) => void;
  cancelPending?: boolean;
}) {
  const tableLabels = item.tables.map((t) => t.label).join(", ");

  if (compact) {
    return (
      <article
        className={cn(
          "rounded-xl border border-border/80 bg-card/90 p-3 shadow-sm",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{item.guestName}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {item.occasion}
            </p>
          </div>
          <Badge tone="neutral" size="sm" className="shrink-0 tabular-nums">
            <Users className="size-3" aria-hidden />
            {item.partySize}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tables.map((table) => (
            <span
              key={table.id}
              className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium"
            >
              <UtensilsCrossed className="size-2.5 opacity-60" aria-hidden />
              {table.label}
            </span>
          ))}
        </div>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 text-destructive hover:text-destructive"
            loading={cancelPending}
            onClick={() => onCancel(item)}
          >
            Cancelar reserva
          </Button>
        ) : null}
        <p className="sr-only">Mesas: {tableLabels}</p>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-colors hover:border-border",
        className,
      )}
    >
      <div className="flex gap-4">
        {showTime ? (
          <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/60 px-2 py-3 text-center">
            <span className="text-lg font-semibold tabular-nums leading-none">
              {formatReservationTime(item.scheduledAt)}
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.scheduledAt ? "llegada" : "sin hora"}
            </span>
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-tight tracking-tight">
              {item.guestName}
            </h3>
            <Badge tone="neutral" size="sm" className="tabular-nums">
              <Users className="size-3" aria-hidden />
              {item.partySize}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{item.occasion}</p>
          <div className="flex flex-wrap gap-1.5">
            {item.tables.map((table) => (
              <span
                key={table.id}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2.5 py-0.5 text-xs font-medium"
                title={`${table.areaName} · ${table.capacity} puestos`}
              >
                <UtensilsCrossed
                  className="size-3 text-muted-foreground"
                  aria-hidden
                />
                {table.label}
                <span className="text-muted-foreground">· {table.areaName}</span>
              </span>
            ))}
          </div>
          {item.partySize > item.totalCapacity ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Capacidad en mesas ({item.totalCapacity}) menor que el grupo (
              {item.partySize}).
            </p>
          ) : null}
          {onCancel ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-destructive hover:text-destructive"
              loading={cancelPending}
              onClick={() => onCancel(item)}
            >
              Cancelar reserva
            </Button>
          ) : null}
          <p className="sr-only">Mesas: {tableLabels}</p>
        </div>
      </div>
    </article>
  );
}
