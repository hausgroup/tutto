"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, CalendarRange, List, Clock } from "lucide-react";
import { ReservationsCalendarView } from "@/components/reservations/reservations-calendar-view";
import { ReservationsListView } from "@/components/reservations/reservations-list-view";
import { ReservationsTimelineView } from "@/components/reservations/reservations-timeline-view";
import {
  buildReservationOverview,
  distinctScheduledDays,
  partitionReservationsByDay,
  type ReservationOverviewItem,
  ymdInRestaurantZone,
} from "@/lib/floor/reservations-overview";
import type { FloorSnapshot } from "@/lib/floor/types";
import { patchCachedFloorCancelReservation } from "@/lib/floor/client-cache";
import { cancelTableReservationAction } from "@/lib/orders/actions";
import { cn } from "@/lib/utils";

export type ReservationsViewMode = "list" | "timeline" | "calendar";

const VIEW_STORAGE_KEY = "haus-reservations-view";

const VIEW_OPTIONS: {
  id: ReservationsViewMode;
  label: string;
  icon: typeof List;
}[] = [
  { id: "list", label: "Lista", icon: List },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "calendar", label: "Agenda", icon: CalendarRange },
];

export function ReservationsPanel({ snapshot }: { snapshot: FloorSnapshot }) {
  const router = useRouter();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [, startCancel] = useTransition();

  const all = useMemo(() => buildReservationOverview(snapshot), [snapshot]);
  const { today, upcoming, unscheduled } = useMemo(
    () => partitionReservationsByDay(all),
    [all],
  );
  const guestsTonight = today.reduce((sum, item) => sum + item.partySize, 0);

  const todayYmd = ymdInRestaurantZone(new Date());
  const dayOptions = useMemo(() => {
    const set = new Set(distinctScheduledDays(all));
    set.add(todayYmd);
    return [...set].sort();
  }, [all, todayYmd]);

  const [view, setView] = useState<ReservationsViewMode>("list");
  const [focusYmd, setFocusYmd] = useState(todayYmd);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY);
      if (
        stored === "list" ||
        stored === "timeline" ||
        stored === "calendar"
      ) {
        setView(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function handleCancelReservation(item: ReservationOverviewItem) {
    const tableId = item.tables[0]?.id;
    if (!tableId) return;
    setCancelingId(item.id);
    startCancel(async () => {
      const result = await cancelTableReservationAction({ tableId });
      setCancelingId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      patchCachedFloorCancelReservation(tableId, item.groupId);
      router.refresh();
    });
  }

  function selectView(next: ReservationsViewMode) {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card/60 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Hoy</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {today.length}
          </p>
          <p className="text-xs text-muted-foreground">reservas</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/60 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Próximas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {upcoming.length}
          </p>
          <p className="text-xs text-muted-foreground">días siguientes</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card/60 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Comensales hoy
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {guestsTonight}
          </p>
          <p className="text-xs text-muted-foreground">personas esperadas</p>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {new Intl.DateTimeFormat("es-CO", {
            timeZone: "America/Bogota",
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date())}
        </span>
        <Link
          href="/floor"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Ir al salón
        </Link>
      </div>

      <div
        className="flex flex-wrap gap-1 rounded-2xl border border-border/70 bg-card/50 p-1"
        role="tablist"
        aria-label="Vista de reservas"
      >
        {VIEW_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = view === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectView(option.id)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:min-w-[7rem]",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {option.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {view === "list" ? (
          <ReservationsListView
            today={today}
            upcoming={upcoming}
            unscheduled={unscheduled}
            onCancel={handleCancelReservation}
            cancelingId={cancelingId}
          />
        ) : null}
        {view === "timeline" ? (
          <ReservationsTimelineView
            allItems={all}
            focusYmd={focusYmd}
            onFocusYmdChange={setFocusYmd}
            dayOptions={dayOptions}
            onCancel={handleCancelReservation}
            cancelingId={cancelingId}
          />
        ) : null}
        {view === "calendar" ? (
          <ReservationsCalendarView
            items={all}
            onCancel={handleCancelReservation}
            cancelingId={cancelingId}
          />
        ) : null}
      </div>
    </div>
  );
}
