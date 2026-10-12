import type { FloorSnapshot } from "@/lib/floor/types";
import {
  RESTAURANT_IDS,
  type BrandRestaurantId,
} from "@/lib/restaurants/constants";

/** Primary demo / legacy default restaurant (Ciao). */
export const DEMO_RESTAURANT_ID = RESTAURANT_IDS.ciao;

function createCiaoDemoFloorSnapshot(): FloorSnapshot {
  const restaurantId = RESTAURANT_IDS.ciao;
  return {
    areas: [
      {
        id: "33333333-3333-4333-8333-333333333301",
        restaurantId,
        name: "Salón principal",
        sortOrder: 1,
      },
      {
        id: "33333333-3333-4333-8333-333333333302",
        restaurantId,
        name: "Terraza",
        sortOrder: 2,
      },
    ],
    tables: [
      {
        id: "44444444-4444-4444-8444-444444444401",
        restaurantId,
        floorAreaId: "33333333-3333-4333-8333-333333333301",
        label: "A1",
        capacity: 4,
        status: "reserved",
        posX: 0,
        posY: 0,
        width: 96,
        height: 96,
        rotationDeg: 0,
        shape: "rectangle",
        isActive: true,
        reservation: {
          guestName: "María López",
          partySize: 3,
          occasion: "Cumpleaños",
          scheduledAt: new Date(
            Date.now() + 2 * 60 * 60 * 1000,
          ).toISOString(),
          groupId: "demo-reservation-group-1",
        },
      },
      {
        id: "44444444-4444-4444-8444-444444444402",
        restaurantId,
        floorAreaId: "33333333-3333-4333-8333-333333333301",
        label: "A2",
        capacity: 4,
        status: "occupied",
        posX: 128,
        posY: 0,
        width: 96,
        height: 96,
        rotationDeg: 0,
        shape: "rectangle",
        isActive: true,
        reservation: null,
      },
      {
        id: "44444444-4444-4444-8444-444444444403",
        restaurantId,
        floorAreaId: "33333333-3333-4333-8333-333333333301",
        label: "C1",
        capacity: 2,
        status: "available",
        posX: 256,
        posY: 0,
        width: 96,
        height: 96,
        rotationDeg: 0,
        shape: "square",
        isActive: true,
        reservation: null,
      },
      {
        id: "44444444-4444-4444-8444-444444444404",
        restaurantId,
        floorAreaId: "33333333-3333-4333-8333-333333333301",
        label: "C2",
        capacity: 2,
        status: "available",
        posX: 0,
        posY: 128,
        width: 96,
        height: 96,
        rotationDeg: 0,
        shape: "square",
        isActive: true,
        reservation: null,
      },
      {
        id: "44444444-4444-4444-8444-444444444405",
        restaurantId,
        floorAreaId: "33333333-3333-4333-8333-333333333301",
        label: "Q1",
        capacity: 8,
        status: "reserved",
        posX: 128,
        posY: 128,
        width: 160,
        height: 96,
        rotationDeg: 0,
        shape: "rectangle",
        isActive: true,
        reservation: null,
      },
      {
        id: "44444444-4444-4444-8444-444444444406",
        restaurantId,
        floorAreaId: "33333333-3333-4333-8333-333333333302",
        label: "T1",
        capacity: 4,
        status: "payment_pending",
        posX: 0,
        posY: 0,
        width: 96,
        height: 96,
        rotationDeg: 0,
        shape: "square",
        isActive: true,
        reservation: null,
      },
    ],
  };
}

function createMinimalDemoFloorSnapshot(
  restaurantId: BrandRestaurantId,
  areaId: string,
): FloorSnapshot {
  return {
    areas: [
      {
        id: areaId,
        restaurantId,
        name: "Salón",
        sortOrder: 1,
      },
    ],
    tables: [
      {
        id: `44444444-4444-4444-8444-${restaurantId.slice(-12)}01`,
        restaurantId,
        floorAreaId: areaId,
        label: "M1",
        capacity: 4,
        status: "available",
        posX: 0,
        posY: 0,
        width: 96,
        height: 96,
        rotationDeg: 0,
        shape: "rectangle",
        isActive: true,
        reservation: null,
      },
      {
        id: `44444444-4444-4444-8444-${restaurantId.slice(-12)}02`,
        restaurantId,
        floorAreaId: areaId,
        label: "M2",
        capacity: 4,
        status: "available",
        posX: 128,
        posY: 0,
        width: 96,
        height: 96,
        rotationDeg: 0,
        shape: "rectangle",
        isActive: true,
        reservation: null,
      },
    ],
  };
}

export function createDemoFloorSnapshot(
  restaurantId: string = RESTAURANT_IDS.ciao,
): FloorSnapshot {
  if (restaurantId === RESTAURANT_IDS.ciao) {
    return createCiaoDemoFloorSnapshot();
  }
  if (restaurantId === RESTAURANT_IDS.hunterButcher) {
    return createMinimalDemoFloorSnapshot(
      RESTAURANT_IDS.hunterButcher,
      "33333333-3333-4333-8333-333333333312",
    );
  }
  if (restaurantId === RESTAURANT_IDS.haus) {
    return createMinimalDemoFloorSnapshot(
      RESTAURANT_IDS.haus,
      "33333333-3333-4333-8333-333333333313",
    );
  }
  return createMinimalDemoFloorSnapshot(
    RESTAURANT_IDS.ciao,
    "33333333-3333-4333-8333-333333333311",
  );
}
