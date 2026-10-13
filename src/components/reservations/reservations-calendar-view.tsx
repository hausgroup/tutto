"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import {
  ReservationCard,
  ReservationList,
} from "@/components/reservations/reservation-card";
import {
  ymdInRestaurantZone,
  type ReservationOverviewItem,
} from "@/lib/floor/reservations-overview";
import { cn } from "@/lib/utils";

const RESERVATIONS_EMPTY_VISUAL =
  "/visuals/No Reservations Tabletop Scene.png";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const;
const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(2026, index, 1)),
  ),
);

type PanelMode = "days" | "months" | "years";

function toYmd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseYmd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return { y, m, d };
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function mondayIndex(y: number, m: number, d: number) {
  const utc = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return utc === 0 ? 6 : utc - 1;
}

function shiftMonth(y: number, m: number, delta: number) {
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1 };
}

function ReservationMonthCalendar({
  selectedYmd,
  reservedCounts,
  onSelect,
  className,
}: {
  selectedYmd: string;
  reservedCounts: Map<string, number>;
  onSelect: (ymd: string) => void;
  className?: string;
}) {
  const todayYmd = ymdInRestaurantZone(new Date());
  const selected = parseYmd(selectedYmd);
  const [cursor, setCursor] = useState({ y: selected.y, m: selected.m });
  const [mode, setMode] = useState<PanelMode>("days");
  const [yearStart, setYearStart] = useState(selected.y - 5);

  const cells = useMemo(() => {
    const total = daysInMonth(cursor.y, cursor.m);
    const start = mondayIndex(cursor.y, cursor.m, 1);
    const grid: ({ y: number; m: number; d: number } | null)[] = [];
    for (let i = 0; i < start; i++) grid.push(null);
    for (let d = 1; d <= total; d++) grid.push({ y: cursor.y, m: cursor.m, d });
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [cursor.y, cursor.m]);

  const years = Array.from({ length: 12 }, (_, index) => yearStart + index);

  function step(delta: number) {
    if (mode === "years") {
      setYearStart((current) => current + delta * 12);
      return;
    }
    if (mode === "months") {
      setCursor((current) => ({ ...current, y: current.y + delta }));
      return;
    }
    setCursor((current) => shiftMonth(current.y, current.m, delta));
  }

  function openYears() {
    setYearStart(cursor.y - 5);
    setMode((current) => (current === "years" ? "days" : "years"));
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl bg-card p-4 ring-1 ring-border",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="size-9 min-h-9 px-0"
          aria-label={
            mode === "years"
              ? "Años anteriores"
              : mode === "months"
                ? "Año anterior"
                : "Mes anterior"
          }
          onClick={() => step(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex min-w-0 items-center justify-center gap-2">
          <Button
            type="button"
            variant={mode === "months" ? "primary" : "secondary"}
            size="sm"
            className="capitalize"
            onClick={() => setMode((current) => (current === "months" ? "days" : "months"))}
          >
            {MONTHS[cursor.m - 1]}
          </Button>
          <Button
            type="button"
            variant={mode === "years" ? "primary" : "secondary"}
            size="sm"
            onClick={openYears}
          >
            {cursor.y}
          </Button>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="size-9 min-h-9 px-0"
          aria-label={
            mode === "years"
              ? "Años siguientes"
              : mode === "months"
                ? "Año siguiente"
                : "Mes siguiente"
          }
          onClick={() => step(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {mode === "days" ? (
        <div className="mt-4">
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-[13px] font-medium text-muted-foreground"
              >
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (!cell) {
                return <span key={`empty-${index}`} className="aspect-square" />;
              }
              const ymd = toYmd(cell.y, cell.m, cell.d);
              const count = reservedCounts.get(ymd) ?? 0;
              const isSelected = ymd === selectedYmd;
              const isToday = ymd === todayYmd;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => onSelect(ymd)}
                  aria-pressed={isSelected}
                  aria-label={
                    count > 0
                      ? `${cell.d}, ${count} ${count === 1 ? "reserva" : "reservas"}`
                      : String(cell.d)
                  }
                  className="flex aspect-square items-center justify-center text-[13px] tabular-nums"
                >
                  <span
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-full transition-colors",
                      isSelected
                        ? "bg-foreground font-semibold text-background"
                        : "text-foreground",
                      !isSelected && isToday && "bg-muted",
                      !isSelected && !isToday && "hover:bg-muted",
                    )}
                  >
                    <span className="relative leading-none">{cell.d}</span>
                    {count > 0 ? (
                      <span
                        className={cn(
                          "absolute left-1/2 top-[calc(100%+4px)] size-1.5 -translate-x-1/2 rounded-full",
                          isSelected ? "bg-background" : "bg-foreground",
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {mode === "months" ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => {
            const monthNumber = index + 1;
            const active = monthNumber === cursor.m;
            return (
              <Button
                key={month}
                type="button"
                variant={active ? "primary" : "secondary"}
                size="sm"
                className="capitalize"
                onClick={() => {
                  setCursor((current) => ({ ...current, m: monthNumber }));
                  setMode("days");
                }}
              >
                {month}
              </Button>
            );
          })}
        </div>
      ) : null}

      {mode === "years" ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {years.map((year) => (
            <Button
              key={year}
              type="button"
              variant={year === cursor.y ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setCursor((current) => ({ ...current, y: year }));
                setMode("months");
              }}
            >
              {year}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ReservationsCalendarView({
  items,
  onCancel,
  cancelingId,
}: {
  items: ReservationOverviewItem[];
  onCancel?: (item: ReservationOverviewItem) => void;
  cancelingId?: string | null;
}) {
  const todayYmd = ymdInRestaurantZone(new Date());
  const [selectedYmd, setSelectedYmd] = useState(todayYmd);

  const reservedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.scheduledAt) continue;
      const ymd = ymdInRestaurantZone(new Date(item.scheduledAt));
      counts.set(ymd, (counts.get(ymd) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const dayItems = useMemo(
    () =>
      items.filter((item) => {
        if (!item.scheduledAt) return false;
        return ymdInRestaurantZone(new Date(item.scheduledAt)) === selectedYmd;
      }),
    [items, selectedYmd],
  );

  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-3">
      <div className="h-full lg:col-span-1">
        <ReservationMonthCalendar
          selectedYmd={selectedYmd}
          reservedCounts={reservedCounts}
          onSelect={setSelectedYmd}
          className="h-full"
        />
      </div>
      <div className="flex h-full min-h-0 flex-col lg:col-span-2">
        {dayItems.length === 0 ? (
          <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-2xl bg-card px-6 py-8 text-center ring-1 ring-border">
            <img
              src={RESERVATIONS_EMPTY_VISUAL}
              alt=""
              className="mb-6 w-full max-w-[min(100%,240px)] object-contain"
              decoding="async"
            />
            <p className="text-2xl font-semibold tracking-tight">
              Sin reservas
            </p>
            <p className="mt-2 max-w-xs text-[13px] leading-5 text-muted-foreground">
              Este día no tiene reservas. Elige otra fecha en el calendario.
            </p>
          </div>
        ) : (
          <ReservationList>
            {dayItems.map((item) => (
              <ReservationCard
                key={item.id}
                item={item}
                onCancel={onCancel}
                cancelPending={cancelingId === item.id}
              />
            ))}
          </ReservationList>
        )}
      </div>
    </div>
  );
}
