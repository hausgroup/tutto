import { describe, expect, it } from "vitest";
import { buildReservationOverview } from "@/lib/floor/reservations-overview";
import type { FloorSnapshot } from "@/lib/floor/types";

const baseTable = {
  restaurantId: "r1",
  floorAreaId: "area-1",
  capacity: 4,
  status: "reserved" as const,
  posX: 0,
  posY: 0,
  width: 96,
  height: 96,
  rotationDeg: 0,
  shape: "square" as const,
  isActive: true,
};

describe("buildReservationOverview", () => {
  it("groups tables by reservation group id", () => {
    const snapshot: FloorSnapshot = {
      areas: [
        {
          id: "area-1",
          restaurantId: "r1",
          name: "Salón",
          sortOrder: 1,
        },
      ],
      tables: [
        {
          ...baseTable,
          id: "t1",
          label: "1",
          reservation: {
            groupId: "g-1",
            guestName: "Ana",
            partySize: 8,
            occasion: "Cumpleaños",
            scheduledAt: "2026-10-08T20:00:00.000Z",
          },
        },
        {
          ...baseTable,
          id: "t2",
          label: "2",
          reservation: {
            groupId: "g-1",
            guestName: "Ana",
            partySize: 8,
            occasion: "Cumpleaños",
            scheduledAt: "2026-10-08T20:00:00.000Z",
          },
        },
      ],
    };

    const items = buildReservationOverview(snapshot);
    expect(items).toHaveLength(1);
    expect(items[0]?.tables).toHaveLength(2);
    expect(items[0]?.totalCapacity).toBe(8);
  });
});
