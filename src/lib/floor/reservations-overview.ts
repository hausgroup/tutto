import { RESTAURANT_TIME_ZONE } from "@/lib/floor/reservation-time";
import type { FloorSnapshot, RestaurantTable } from "@/lib/floor/types";

export type ReservationTableRef = {
  id: string;
  label: string;
  areaName: string;
  capacity: number;
};

export type ReservationOverviewItem = {
  /** Stable key for React lists (group id or legacy composite). */
  id: string;
  groupId: string | null;
  guestName: string;
  partySize: number;
  occasion: string;
  scheduledAt: string | null;
  tables: ReservationTableRef[];
  totalCapacity: number;
};

function reservationFingerprint(table: RestaurantTable): string | null {
  if (table.status !== "reserved" || !table.reservation) return null;
  const { guestName, partySize, occasion, scheduledAt } = table.reservation;
  return `${scheduledAt ?? ""}|${guestName}|${partySize}|${occasion}`;
}

function groupKey(table: RestaurantTable): string | null {
  if (table.status !== "reserved" || !table.reservation) return null;
  const groupId = table.reservation.groupId;
  if (groupId) return `g:${groupId}`;
  const fingerprint = reservationFingerprint(table);
  return fingerprint ? `legacy:${fingerprint}` : null;
}

export function buildReservationOverview(
  snapshot: FloorSnapshot,
): ReservationOverviewItem[] {
  const areaNameById = new Map(
    snapshot.areas.map((area) => [area.id, area.name]),
  );

  const groups = new Map<
    string,
    {
      groupId: string | null;
      guestName: string;
      partySize: number;
      occasion: string;
      scheduledAt: string | null;
      tables: ReservationTableRef[];
    }
  >();

  for (const table of snapshot.tables) {
    if (!table.isActive) continue;
    const key = groupKey(table);
    if (!key || !table.reservation) continue;

    const areaName = areaNameById.get(table.floorAreaId) ?? "Salón";
    const ref: ReservationTableRef = {
      id: table.id,
      label: table.label,
      areaName,
      capacity: table.capacity,
    };

    const existing = groups.get(key);
    if (existing) {
      existing.tables.push(ref);
      continue;
    }

    groups.set(key, {
      groupId: table.reservation.groupId,
      guestName: table.reservation.guestName,
      partySize: table.reservation.partySize,
      occasion: table.reservation.occasion,
      scheduledAt: table.reservation.scheduledAt,
      tables: [ref],
    });
  }

  const items: ReservationOverviewItem[] = [];
  for (const [id, group] of groups) {
    const sortedTables = [...group.tables].sort((a, b) =>
      a.label.localeCompare(b.label, "es", { numeric: true }),
    );
    items.push({
      id,
      groupId: group.groupId,
      guestName: group.guestName,
      partySize: group.partySize,
      occasion: group.occasion,
      scheduledAt: group.scheduledAt,
      tables: sortedTables,
      totalCapacity: sortedTables.reduce((sum, t) => sum + t.capacity, 0),
    });
  }

  items.sort((a, b) => {
    const ta = a.scheduledAt ? Date.parse(a.scheduledAt) : Number.POSITIVE_INFINITY;
    const tb = b.scheduledAt ? Date.parse(b.scheduledAt) : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.guestName.localeCompare(b.guestName, "es");
  });

  return items;
}

export function ymdInRestaurantZone(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function partitionReservationsByDay(items: ReservationOverviewItem[]) {
  const todayYmd = ymdInRestaurantZone(new Date());
  const today: ReservationOverviewItem[] = [];
  const upcoming: ReservationOverviewItem[] = [];
  const unscheduled: ReservationOverviewItem[] = [];

  for (const item of items) {
    if (!item.scheduledAt) {
      unscheduled.push(item);
      continue;
    }
    const itemYmd = ymdInRestaurantZone(new Date(item.scheduledAt));
    if (itemYmd === todayYmd) today.push(item);
    else if (itemYmd > todayYmd) upcoming.push(item);
    else today.push(item);
  }

  return { today, upcoming, unscheduled };
}

export type ReservationDayGroup = {
  ymd: string;
  /** null for unscheduled bucket */
  scheduled: boolean;
  label: string;
  weekdayLabel: string;
  items: ReservationOverviewItem[];
};

export function formatDayHeading(ymd: string): {
  label: string;
  weekdayLabel: string;
} {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return {
    weekdayLabel: new Intl.DateTimeFormat("es-CO", {
      timeZone: RESTAURANT_TIME_ZONE,
      weekday: "long",
    }).format(date),
    label: new Intl.DateTimeFormat("es-CO", {
      timeZone: RESTAURANT_TIME_ZONE,
      day: "numeric",
      month: "long",
    }).format(date),
  };
}

/** Groups reservations by calendar day (restaurant TZ), sorted chronologically. */
export function groupReservationsByCalendarDay(
  items: ReservationOverviewItem[],
): ReservationDayGroup[] {
  const map = new Map<string, ReservationOverviewItem[]>();

  for (const item of items) {
    const ymd = item.scheduledAt
      ? ymdInRestaurantZone(new Date(item.scheduledAt))
      : "sin-horario";
    const bucket = map.get(ymd) ?? [];
    bucket.push(item);
    map.set(ymd, bucket);
  }

  const groups: ReservationDayGroup[] = [];
  for (const [ymd, bucket] of map) {
    const sorted = [...bucket].sort((a, b) => {
      const ta = a.scheduledAt ? Date.parse(a.scheduledAt) : Number.POSITIVE_INFINITY;
      const tb = b.scheduledAt ? Date.parse(b.scheduledAt) : Number.POSITIVE_INFINITY;
      return ta - tb;
    });
    if (ymd === "sin-horario") {
      groups.push({
        ymd,
        scheduled: false,
        label: "Sin horario",
        weekdayLabel: "",
        items: sorted,
      });
      continue;
    }
    const { label, weekdayLabel } = formatDayHeading(ymd);
    groups.push({
      ymd,
      scheduled: true,
      label,
      weekdayLabel,
      items: sorted,
    });
  }

  groups.sort((a, b) => {
    if (!a.scheduled) return 1;
    if (!b.scheduled) return -1;
    return a.ymd.localeCompare(b.ymd);
  });

  return groups;
}

export function reservationsForDay(
  items: ReservationOverviewItem[],
  ymd: string,
): ReservationOverviewItem[] {
  return items.filter((item) => {
    if (!item.scheduledAt) return false;
    return ymdInRestaurantZone(new Date(item.scheduledAt)) === ymd;
  });
}

export function distinctScheduledDays(
  items: ReservationOverviewItem[],
): string[] {
  const set = new Set<string>();
  for (const item of items) {
    if (!item.scheduledAt) continue;
    set.add(ymdInRestaurantZone(new Date(item.scheduledAt)));
  }
  return [...set].sort();
}
