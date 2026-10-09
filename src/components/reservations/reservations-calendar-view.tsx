"use client";

import {
  groupReservationsByCalendarDay,
  type ReservationOverviewItem,
} from "@/lib/floor/reservations-overview";
import {
  ReservationCard,
  formatReservationTime,
} from "@/components/reservations/reservation-card";
import { ymdInRestaurantZone } from "@/lib/floor/reservations-overview";
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
  const groups = groupReservationsByCalendarDay(items);

  if (groups.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center text-sm text-muted-foreground">
        No hay reservas activas en el salón.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.ymd} className="space-y-3">
          <header className="flex items-baseline justify-between gap-2">
            <div>
              {group.scheduled ? (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group.ymd === todayYmd
                      ? "Hoy"
                      : group.weekdayLabel}
                  </p>
                  <h2 className="text-base font-semibold capitalize">
                    {group.label}
                  </h2>
                </>
              ) : (
                <h2 className="text-base font-semibold">{group.label}</h2>
              )}
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {group.items.length}{" "}
              {group.items.length === 1 ? "reserva" : "reservas"}
            </span>
          </header>

          <ul className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <li key={item.id}>
                <div className="flex h-full flex-col gap-2 rounded-xl border border-border/80 bg-card/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <time
                      className="text-sm font-semibold tabular-nums text-muted-foreground"
                      dateTime={item.scheduledAt ?? undefined}
                    >
                      {item.scheduledAt
                        ? formatReservationTime(item.scheduledAt)
                        : "—"}
                    </time>
                    <span className="text-xs text-muted-foreground">
                      {item.partySize} pers.
                    </span>
                  </div>
                  <ReservationCard
                    item={item}
                    compact
                    showTime={false}
                    className="border-0 bg-transparent p-0 shadow-none"
                    onCancel={onCancel}
                    cancelPending={cancelingId === item.id}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
