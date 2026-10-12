import { createDemoFloorSnapshot } from "@/lib/floor/demo-data";
import type { FloorSnapshot } from "@/lib/floor/types";
import { isBrandRestaurantId } from "@/lib/restaurants/constants";

const globalForDemo = globalThis as unknown as {
  hausDemoFloorStores?: Map<string, FloorSnapshot>;
};

function cloneSnapshot(snapshot: FloorSnapshot): FloorSnapshot {
  return structuredClone(snapshot);
}

export function getDemoFloorStore(restaurantId: string): FloorSnapshot {
  if (!globalForDemo.hausDemoFloorStores) {
    globalForDemo.hausDemoFloorStores = new Map();
  }
  const map = globalForDemo.hausDemoFloorStores;
  let snapshot = map.get(restaurantId);
  if (!snapshot) {
    snapshot = createDemoFloorSnapshot(
      isBrandRestaurantId(restaurantId) ? restaurantId : undefined,
    );
    map.set(restaurantId, snapshot);
  }
  return snapshot;
}

export function replaceDemoFloorStore(
  restaurantId: string,
  snapshot: FloorSnapshot,
) {
  if (!globalForDemo.hausDemoFloorStores) {
    globalForDemo.hausDemoFloorStores = new Map();
  }
  globalForDemo.hausDemoFloorStores.set(restaurantId, cloneSnapshot(snapshot));
}

export function resetDemoFloorStore(restaurantId?: string) {
  if (!globalForDemo.hausDemoFloorStores) return;
  if (restaurantId) {
    globalForDemo.hausDemoFloorStores.delete(restaurantId);
    return;
  }
  globalForDemo.hausDemoFloorStores.clear();
}

export function invalidateAllDemoFloorStores() {
  resetDemoFloorStore();
}
