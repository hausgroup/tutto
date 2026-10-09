"use client";

import type { ReservationOverviewItem } from "@/lib/floor/reservations-overview";
import { ReservationCard } from "@/components/reservations/reservation-card";

function Section({
  title,
  subtitle,
  items,
  empty,
  onCancel,
  cancelingId,
}: {
  title: string;
  subtitle?: string;
  items: ReservationOverviewItem[];
  empty: string;
  onCancel?: (item: ReservationOverviewItem) => void;
  cancelingId?: string | null;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <ReservationCard
                item={item}
                onCancel={onCancel}
                cancelPending={cancelingId === item.id}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ReservationsListView({
  today,
  upcoming,
  unscheduled,
  onCancel,
  cancelingId,
}: {
  today: ReservationOverviewItem[];
  upcoming: ReservationOverviewItem[];
  unscheduled: ReservationOverviewItem[];
  onCancel?: (item: ReservationOverviewItem) => void;
  cancelingId?: string | null;
}) {
  return (
    <>
      <Section
        title="Hoy"
        subtitle="Ordenadas por hora de llegada"
        items={today}
        empty="No hay reservas para hoy."
        onCancel={onCancel}
        cancelingId={cancelingId}
      />
      <Section
        title="Próximos días"
        items={upcoming}
        empty="No hay reservas en los días siguientes."
        onCancel={onCancel}
        cancelingId={cancelingId}
      />
      {unscheduled.length > 0 ? (
        <Section
          title="Sin horario"
          items={unscheduled}
          empty=""
          onCancel={onCancel}
          cancelingId={cancelingId}
        />
      ) : null}
    </>
  );
}
