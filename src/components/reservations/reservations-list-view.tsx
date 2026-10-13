"use client";

import type { ReservationOverviewItem } from "@/lib/floor/reservations-overview";
import {
  ReservationCard,
  ReservationEmpty,
  ReservationList,
  ReservationSectionTitle,
} from "@/components/reservations/reservation-card";

function Section({
  title,
  items,
  empty,
  showDate = false,
  showTime = true,
  onCancel,
  cancelingId,
}: {
  title: string;
  items: ReservationOverviewItem[];
  empty: string;
  showDate?: boolean;
  showTime?: boolean;
  onCancel?: (item: ReservationOverviewItem) => void;
  cancelingId?: string | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <ReservationSectionTitle
        title={title}
        meta={items.length > 0 ? String(items.length) : undefined}
      />
      {items.length === 0 ? (
        <ReservationEmpty>{empty}</ReservationEmpty>
      ) : (
        <ReservationList>
          {items.map((item) => (
            <ReservationCard
              key={item.id}
              item={item}
              showDate={showDate}
              showTime={showTime}
              onCancel={onCancel}
              cancelPending={cancelingId === item.id}
            />
          ))}
        </ReservationList>
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
    <div className="flex flex-col gap-8">
      <Section
        title="Hoy"
        items={today}
        empty="No hay reservas para hoy."
        onCancel={onCancel}
        cancelingId={cancelingId}
      />
      {upcoming.length > 0 ? (
        <Section
          title="Próximos días"
          items={upcoming}
          empty=""
          showDate
          onCancel={onCancel}
          cancelingId={cancelingId}
        />
      ) : null}
      {unscheduled.length > 0 ? (
        <Section
          title="Sin horario"
          items={unscheduled}
          empty=""
          showTime={false}
          onCancel={onCancel}
          cancelingId={cancelingId}
        />
      ) : null}
    </div>
  );
}
