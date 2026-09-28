"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DaySalesCell } from "@/lib/orders/reports";
import { calendarDateInBogota } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/money";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const PLOT_HEIGHT = 200;
const TOP_GUTTER = 72;
const BAR_WIDTH = 52;
const BAR_GAP = 24;
const HOVER_CLEAR_MS = 120;
const ACCENT = "oklch(0.68 0.19 42)";
const ACCENT_SOFT = "oklch(0.9 0.04 45)";
const ACCENT_SOFT_DARK = "oklch(0.35 0.04 45)";

function formatAxisDate(date: string) {
  const [, month, day] = date.split("-");
  return `${month}-${day}`;
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(`${date}T12:00:00-05:00`));
}

function niceMax(value: number) {
  if (value <= 0) return 100_000;
  const padded = value * 1.15;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function formatAxisCurrency(amountMinor: number) {
  if (amountMinor >= 1_000_000) {
    return `$${(amountMinor / 1_000_000).toFixed(1)}M`;
  }
  if (amountMinor >= 1_000) {
    return `$${Math.round(amountMinor / 1_000)}k`;
  }
  return formatCurrency(amountMinor);
}

type DayPoint = DaySalesCell & {
  changePct: number | null;
};

export function DailyRevenueChart({
  monthLabel,
  cells,
  totalRevenueMinor,
}: {
  monthLabel: string;
  cells: DaySalesCell[];
  totalRevenueMinor: number;
}) {
  const days = useMemo(() => {
    const inMonth = cells.filter((c) => c.inMonth);
    return inMonth.map((cell, index): DayPoint => {
      const prev = inMonth[index - 1];
      let changePct: number | null = null;
      if (prev && prev.grossSalesMinor > 0) {
        changePct = Math.round(
          ((cell.grossSalesMinor - prev.grossSalesMinor) /
            prev.grossSalesMinor) *
            100,
        );
      } else if (
        cell.grossSalesMinor > 0 &&
        (!prev || prev.grossSalesMinor === 0)
      ) {
        changePct = 100;
      }
      return { ...cell, changePct };
    });
  }, [cells]);

  const todayDate = useMemo(() => {
    const today = calendarDateInBogota(new Date());
    if (days.some((d) => d.date === today)) return today;
    // Month without “today” (e.g. historical): use last day in the series
    return days[days.length - 1]?.date ?? null;
  }, [days]);

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const didInitialScroll = useRef(false);

  const clearHoverSoon = useCallback(() => {
    if (hoverClearTimerRef.current) clearTimeout(hoverClearTimerRef.current);
    hoverClearTimerRef.current = setTimeout(() => {
      setHoveredDate(null);
    }, HOVER_CLEAR_MS);
  }, []);

  const setHover = useCallback((date: string) => {
    if (hoverClearTimerRef.current) clearTimeout(hoverClearTimerRef.current);
    setHoveredDate(date);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverClearTimerRef.current) clearTimeout(hoverClearTimerRef.current);
    };
  }, []);

  useEffect(() => {
    didInitialScroll.current = false;
  }, [todayDate]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !todayDate || didInitialScroll.current) return;
    const index = days.findIndex((d) => d.date === todayDate);
    if (index < 0) return;
    const barCenter = index * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2 + 48;
    node.scrollTo({ left: Math.max(0, barCenter - node.clientWidth / 2) });
    didInitialScroll.current = true;
  }, [todayDate, days]);

  const maxRevenue = niceMax(
    Math.max(...days.map((d) => d.grossSalesMinor), 0),
  );
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: Math.round(maxRevenue * ratio),
  }));

  // Today stays highlighted unless another day is hovered
  const highlightDate = hoveredDate ?? todayDate;
  const chartWidth = Math.max(
    days.length * (BAR_WIDTH + BAR_GAP) + 56,
    640,
  );

  return (
    <Card className="overflow-hidden border-border/60 shadow-none">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Estadísticas de ventas
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(totalRevenueMinor)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingresos diarios ·{" "}
              {days.reduce((sum, day) => sum + day.orderCount, 0)} pedidos
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm capitalize text-muted-foreground">
            {monthLabel}
            <ChevronDown className="size-3.5 opacity-60" aria-hidden />
          </div>
        </div>

        <div
          className="relative"
          onMouseLeave={() => {
            if (hoverClearTimerRef.current) {
              clearTimeout(hoverClearTimerRef.current);
            }
            setHoveredDate(null);
          }}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-card to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-card to-transparent" />

          <div
            ref={scrollRef}
            className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]"
          >
            <div className="relative" style={{ width: chartWidth }}>
              <div
                className="relative ml-10 mr-2"
                style={{ height: PLOT_HEIGHT + TOP_GUTTER }}
              >
                {ticks.map((tick) => (
                  <div
                    key={tick.ratio}
                    className="absolute right-0 left-0 flex items-center"
                    style={{
                      bottom: `${tick.ratio * PLOT_HEIGHT}px`,
                    }}
                  >
                    <span className="absolute -left-10 w-8 text-right text-[11px] tabular-nums text-muted-foreground">
                      {formatAxisCurrency(tick.value)}
                    </span>
                    <div className="w-full border-t border-dashed border-border/70" />
                  </div>
                ))}

                <div
                  className="absolute right-0 bottom-0 left-0 flex items-end px-1"
                  style={{ height: PLOT_HEIGHT + TOP_GUTTER }}
                >
                  {days.map((day) => {
                    const heightPct =
                      maxRevenue > 0
                        ? (day.grossSalesMinor / maxRevenue) * 100
                        : 0;
                    const isHighlighted = day.date === highlightDate;
                    const showTooltip = day.date === hoveredDate;
                    const barHeight = Math.max(
                      heightPct > 0 ? (heightPct / 100) * PLOT_HEIGHT : 0,
                      day.grossSalesMinor > 0 ? 8 : 2,
                    );

                    return (
                      <button
                        key={day.date}
                        type="button"
                        onMouseEnter={() => setHover(day.date)}
                        onMouseLeave={clearHoverSoon}
                        onFocus={() => setHover(day.date)}
                        onBlur={clearHoverSoon}
                        className="group relative flex shrink-0 flex-col items-center justify-end outline-none"
                        style={{
                          width: BAR_WIDTH,
                          marginRight: BAR_GAP,
                          height: PLOT_HEIGHT + TOP_GUTTER,
                        }}
                        aria-label={`${formatFullDate(day.date)}: ${formatCurrency(day.grossSalesMinor)}`}
                        aria-current={
                          day.date === todayDate ? "date" : undefined
                        }
                      >
                        {!showTooltip && day.changePct != null ? (
                          <div
                            className="absolute flex flex-col items-center gap-1"
                            style={{ bottom: barHeight + 10 }}
                          >
                            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                              {day.changePct > 0 ? "+" : ""}
                              {day.changePct}%
                            </span>
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: ACCENT }}
                            />
                          </div>
                        ) : null}

                        {showTooltip ? (
                          <div
                            className="pointer-events-none absolute z-20 flex -translate-y-full flex-col items-center"
                            style={{ bottom: barHeight + 8 }}
                          >
                            <div className="whitespace-nowrap rounded-lg bg-zinc-950 px-3 py-2 text-center text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-950">
                              <p className="text-[11px] opacity-70">
                                {formatFullDate(day.date)}
                              </p>
                              <p className="text-sm font-semibold tabular-nums">
                                {formatCurrency(day.grossSalesMinor)}
                              </p>
                              {day.changePct != null ? (
                                <p
                                  className={cn(
                                    "text-[11px] font-medium",
                                    day.changePct >= 0
                                      ? "text-emerald-400 dark:text-emerald-600"
                                      : "text-rose-400 dark:text-rose-600",
                                  )}
                                >
                                  {day.changePct > 0 ? "+" : ""}
                                  {day.changePct}%
                                </p>
                              ) : (
                                <p className="text-[11px] font-medium text-zinc-400">
                                  —
                                </p>
                              )}
                            </div>
                            <div
                              className="h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-zinc-950 dark:border-t-zinc-100"
                              aria-hidden
                            />
                          </div>
                        ) : null}

                        <div
                          className="w-9 rounded-t-md transition-colors"
                          style={{
                            height: barHeight,
                            backgroundColor: isHighlighted
                              ? ACCENT
                              : undefined,
                          }}
                        >
                          {!isHighlighted ? (
                            <div
                              className="h-full w-full rounded-t-md dark:hidden"
                              style={{ backgroundColor: ACCENT_SOFT }}
                            />
                          ) : null}
                          {!isHighlighted ? (
                            <div
                              className="hidden h-full w-full rounded-t-md dark:block"
                              style={{ backgroundColor: ACCENT_SOFT_DARK }}
                            />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ml-10 mt-3 flex items-center px-1">
                {days.map((day) => {
                  const isHighlighted = day.date === highlightDate;
                  return (
                    <button
                      key={`label-${day.date}`}
                      type="button"
                      onMouseEnter={() => setHover(day.date)}
                      onMouseLeave={clearHoverSoon}
                      className="flex h-7 shrink-0 items-center justify-center"
                      style={{ width: BAR_WIDTH, marginRight: BAR_GAP }}
                    >
                      <span
                        className={cn(
                          "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] leading-none tabular-nums transition-colors",
                          isHighlighted
                            ? "font-medium text-white"
                            : "text-muted-foreground",
                        )}
                        style={
                          isHighlighted
                            ? { backgroundColor: ACCENT }
                            : undefined
                        }
                      >
                        {formatAxisDate(day.date)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {hoveredDate ? (
          <p className="mt-4 text-xs text-muted-foreground sm:hidden">
            {(() => {
              const day = days.find((d) => d.date === hoveredDate);
              if (!day) return null;
              return (
                <>
                  {formatFullDate(day.date)} ·{" "}
                  {formatCurrency(day.grossSalesMinor)} · {day.orderCount}{" "}
                  pedidos
                </>
              );
            })()}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
