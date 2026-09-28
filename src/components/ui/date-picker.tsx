"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const;

function parseYmd(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

function toYmd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Monday-first weekday index for calendar cells. */
function mondayIndex(y: number, m: number, d: number) {
  const utc = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun … 6 Sat
  return utc === 0 ? 6 : utc - 1;
}

function formatDisplay(value: string) {
  const parts = parseYmd(value);
  if (!parts) return value;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.y, parts.m - 1, parts.d)));
}

function clampYmd(value: string, min?: string, max?: string) {
  let next = value;
  if (min && next < min) next = min;
  if (max && next > max) next = max;
  return next;
}

export function SoftDatePicker({
  id,
  value,
  onChange,
  min,
  max,
  align = "start",
  className,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  min?: string;
  max?: string;
  align?: "start" | "end";
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const [view, setView] = useState(() =>
    selected
      ? { y: selected.y, m: selected.m }
      : (() => {
          const now = new Date();
          return { y: now.getFullYear(), m: now.getMonth() + 1 };
        })(),
  );

  useEffect(() => {
    if (!open || !selected) return;
    setView({ y: selected.y, m: selected.m });
  }, [open, selected?.y, selected?.m]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const total = daysInMonth(view.y, view.m);
    const start = mondayIndex(view.y, view.m, 1);
    const grid: ({ y: number; m: number; d: number } | null)[] = [];
    for (let i = 0; i < start; i++) grid.push(null);
    for (let d = 1; d <= total; d++) {
      grid.push({ y: view.y, m: view.m, d });
    }
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [view.y, view.m]);

  const monthLabel = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(view.y, view.m - 1, 1)));

  function shiftMonth(delta: number) {
    const date = new Date(Date.UTC(view.y, view.m - 1 + delta, 1));
    setView({ y: date.getUTCFullYear(), m: date.getUTCMonth() + 1 });
  }

  function pick(y: number, m: number, d: number) {
    const next = clampYmd(toYmd(y, m, d), min, max);
    onChange(next);
    setOpen(false);
  }

  function isDisabled(y: number, m: number, d: number) {
    const ymd = toYmd(y, m, d);
    if (min && ymd < min) return true;
    if (max && ymd > max) return true;
    return false;
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-2xl bg-muted px-3.5 text-left text-sm text-foreground outline-none ring-1 ring-border transition-colors",
          "hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <CalendarDays
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate capitalize">
          {formatDisplay(value)}
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Elegir fecha"
          className={cn(
            "absolute bottom-[calc(100%+0.5rem)] z-50 w-[min(100vw-2rem,18.5rem)] rounded-[20px] bg-card p-3 text-card-foreground shadow-lg ring-1 ring-border",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-semibold capitalize tracking-tight">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="py-1 text-center text-[10px] font-medium text-muted-foreground"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (!cell) {
                return <span key={`empty-${index}`} className="size-9" />;
              }
              const ymd = toYmd(cell.y, cell.m, cell.d);
              const disabled = isDisabled(cell.y, cell.m, cell.d);
              const isSelected = value === ymd;
              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(cell.y, cell.m, cell.d)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                    disabled && "cursor-not-allowed opacity-30",
                    !disabled &&
                      !isSelected &&
                      "hover:bg-muted text-foreground",
                    isSelected &&
                      "bg-[#C8E6C9] font-semibold text-zinc-900 dark:bg-[#5FA88A] dark:text-white",
                  )}
                >
                  {cell.d}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
