"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import {
  ReservationCard,
  formatReservationTime,
} from "@/components/reservations/reservation-card";
import type { ReservationOverviewItem } from "@/lib/floor/reservations-overview";
import {
  formatDayHeading,
  ymdInRestaurantZone,
} from "@/lib/floor/reservations-overview";
import { cn } from "@/lib/utils";

export function ReservationsTimelineView({
  allItems,
  focusYmd,
  onFocusYmdChange,
  dayOptions,
  onCancel,
  cancelingId,
}: {
  allItems: ReservationOverviewItem[];
  focusYmd: string;
  onFocusYmdChange: (ymd: string) => void;
  dayOptions: string[];
  onCancel?: (item: ReservationOverviewItem) => void;
  cancelingId?: string | null;
}) {
  const todayYmd = ymdInRestaurantZone(new Date());
  const dayItems = allItems.filter((item) => {
    if (!item.scheduledAt) return false;
    return ymdInRestaurantZone(new Date(item.scheduledAt)) === focusYmd;
  });

  const unscheduled = allItems.filter((item) => !item.scheduledAt);
  const { label, weekdayLabel } = formatDayHeading(focusYmd);
  const isToday = focusYmd === todayYmd;

  const dayIndex = dayOptions.indexOf(focusYmd);
  const canPrev = dayIndex > 0;
  const canNext = dayIndex >= 0 && dayIndex < dayOptions.length - 1;

  function shiftDay(delta: number) {
    const next = dayOptions[dayIndex + delta];
    if (next) onFocusYmdChange(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isToday ? "Hoy" : weekdayLabel}
          </p>
          <h2 className="text-lg font-semibold capitalize tracking-tight">
            {label}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="size-9 px-0"
            disabled={!canPrev}
            aria-label="Día anterior"
            onClick={() => shiftDay(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {!isToday ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onFocusYmdChange(todayYmd)}
            >
              Hoy
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="size-9 px-0"
            disabled={!canNext}
            aria-label="Día siguiente"
            onClick={() => shiftDay(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {dayOptions.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dayOptions.map((ymd) => {
            const active = ymd === focusYmd;
            const { weekdayLabel: wd } = formatDayHeading(ymd);
            const short = new Intl.DateTimeFormat("es-CO", {
              timeZone: "America/Bogota",
              day: "numeric",
              month: "short",
            }).format(
              new Date(
                `${ymd}T12:00:00-05:00`,
              ),
            );
            return (
              <button
                key={ymd}
                type="button"
                onClick={() => onFocusYmdChange(ymd)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
                  active
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border/80 bg-card/60 text-foreground hover:bg-muted/60",
                )}
              >
                <span className="block font-semibold capitalize">{short}</span>
                <span
                  className={cn(
                    "block capitalize",
                    active ? "text-background/80" : "text-muted-foreground",
                  )}
                >
                  {ymd === todayYmd ? "Hoy" : wd}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {dayItems.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
          No hay reservas con horario para este día.
        </p>
      ) : (
        <ol className="space-y-4">
          {dayItems.map((item) => (
            <li
              key={item.id}
              className="grid grid-cols-[minmax(3.25rem,4.5rem)_1fr] items-start gap-3 sm:gap-4"
            >
              <time
                className="pt-3 text-right text-sm font-semibold tabular-nums text-muted-foreground"
                dateTime={item.scheduledAt ?? undefined}
              >
                {formatReservationTime(item.scheduledAt)}
              </time>
              <div className="relative pl-4">
                <span
                  className="absolute left-0 top-4 h-[calc(100%-0.5rem)] w-px bg-border"
                  aria-hidden
                />
                <span
                  className="absolute -left-[0.1875rem] top-3.5 size-2.5 rounded-full border-2 border-background bg-foreground shadow-sm"
                  aria-hidden
                />
                <ReservationCard
                  item={item}
                  compact
                  showTime={false}
                  onCancel={onCancel}
                  cancelPending={cancelingId === item.id}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {unscheduled.length > 0 ? (
        <section className="space-y-3 border-t border-border/60 pt-6">
          <h3 className="text-sm font-semibold">Sin horario fijo</h3>
          <ul className="space-y-2">
            {unscheduled.map((item) => (
              <li key={item.id}>
                <ReservationCard
                  item={item}
                  compact
                  showTime={false}
                  onCancel={onCancel}
                  cancelPending={cancelingId === item.id}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
