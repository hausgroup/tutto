import type { FloorBootstrap } from "@/lib/floor/actions-boot";
import { bootstrapFloorAction } from "@/lib/floor/actions-boot";
import { createDemoFloorSnapshot } from "@/lib/floor/demo-data";
import type { FloorSnapshot, RestaurantTable } from "@/lib/floor/types";
import { canUseDemoExperience } from "@/lib/env";

const boots = new Map<string, FloorBootstrap>();
const pendingByRestaurant = new Map<string, Promise<FloorBootstrap>>();

function bootRestaurantId(boot: FloorBootstrap): string | null {
  return (
    boot.restaurantId ??
    boot.snapshot.areas[0]?.restaurantId ??
    boot.snapshot.tables[0]?.restaurantId ??
    null
  );
}

function getBootMapEntry(restaurantId: string): FloorBootstrap | null {
  return boots.get(restaurantId) ?? null;
}

function activeCachedBoot(): FloorBootstrap | null {
  const first = boots.values().next();
  return first.done ? null : first.value;
}

export function getCachedFloorBoot(
  restaurantId?: string | null,
): FloorBootstrap | null {
  if (restaurantId) return getBootMapEntry(restaurantId);
  return activeCachedBoot();
}

export function getPendingFloorBoot(
  restaurantId?: string | null,
): Promise<FloorBootstrap> | null {
  if (!restaurantId) {
    const first = pendingByRestaurant.values().next();
    return first.done ? null : first.value;
  }
  return pendingByRestaurant.get(restaurantId) ?? null;
}

export function setCachedFloorBoot(boot: FloorBootstrap) {
  const id = bootRestaurantId(boot);
  if (!id) return;
  boots.set(id, boot);
}

/** Instant UI when switching locals in demo mode. */
export function seedDemoFloorBoot(restaurantId: string, canManage = true) {
  if (!canUseDemoExperience()) return;
  setCachedFloorBoot({
    restaurantId,
    snapshot: createDemoFloorSnapshot(restaurantId),
    billTotalsByTableId: {},
    pendingBarDrinksByTableId: {},
    canManage,
  });
}

function patchBoots(mutator: (boot: FloorBootstrap) => FloorBootstrap) {
  for (const [id, boot] of boots) {
    boots.set(id, mutator(boot));
  }
}

function patchBootForTable(
  tableId: string,
  mutator: (boot: FloorBootstrap) => FloorBootstrap,
) {
  for (const [id, boot] of boots) {
    if (!boot.snapshot.tables.some((table) => table.id === tableId)) continue;
    boots.set(id, mutator(boot));
    return;
  }
}

export function patchCachedFloorTable(table: RestaurantTable) {
  patchBootForTable(table.id, (cached) => ({
    ...cached,
    snapshot: {
      ...cached.snapshot,
      tables: cached.snapshot.tables.map((item) =>
        item.id === table.id ? table : item,
      ),
    },
  }));
}

export function patchCachedFloorSnapshot(snapshot: FloorSnapshot) {
  const id =
    snapshot.areas[0]?.restaurantId ?? snapshot.tables[0]?.restaurantId;
  if (!id) return;
  const boot = getBootMapEntry(id);
  if (!boot) return;
  boots.set(id, { ...boot, snapshot });
}

export function patchCachedFloorTableStatus(
  tableId: string,
  status: FloorBootstrap["snapshot"]["tables"][number]["status"],
) {
  patchBootForTable(tableId, (cached) => ({
    ...cached,
    snapshot: {
      ...cached.snapshot,
      tables: cached.snapshot.tables.map((table) =>
        table.id === tableId ? { ...table, status } : table,
      ),
    },
  }));
}

export function patchCachedFloorTableReservation(
  tableId: string,
  reservation: FloorBootstrap["snapshot"]["tables"][number]["reservation"],
) {
  patchCachedFloorTablesReservations([{ tableId, reservation }]);
}

export function patchCachedFloorClearReservations(tableIds: string[]) {
  if (tableIds.length === 0) return;
  const cleared = new Set(tableIds);
  patchBoots((cached) => ({
    ...cached,
    snapshot: {
      ...cached.snapshot,
      tables: cached.snapshot.tables.map((table) =>
        cleared.has(table.id)
          ? { ...table, status: "available", reservation: null }
          : table,
      ),
    },
  }));
}

export function patchCachedFloorCancelReservation(
  tableId: string,
  groupId: string | null,
) {
  patchBootForTable(tableId, (cached) => ({
    ...cached,
    snapshot: {
      ...cached.snapshot,
      tables: cached.snapshot.tables.map((table) => {
        const inGroup =
          table.id === tableId ||
          (groupId != null && table.reservation?.groupId === groupId);
        if (!inGroup) return table;
        return { ...table, status: "available", reservation: null };
      }),
    },
  }));
}

export function patchCachedFloorTablesReservations(
  updates: {
    tableId: string;
    reservation: FloorBootstrap["snapshot"]["tables"][number]["reservation"];
  }[],
) {
  if (updates.length === 0) return;
  const byId = new Map(updates.map((u) => [u.tableId, u.reservation]));
  patchBoots((cached) => ({
    ...cached,
    snapshot: {
      ...cached.snapshot,
      tables: cached.snapshot.tables.map((table) => {
        const reservation = byId.get(table.id);
        if (reservation === undefined) return table;
        return { ...table, status: "reserved", reservation };
      }),
    },
  }));
}

export function patchCachedFloorBillTotal(tableId: string, totalMinor: number) {
  patchBootForTable(tableId, (cached) => {
    const next = { ...cached.billTotalsByTableId };
    if (totalMinor <= 0) delete next[tableId];
    else next[tableId] = totalMinor;
    return { ...cached, billTotalsByTableId: next };
  });
}

export function patchCachedFloorPendingBarDrinks(
  tableId: string,
  pending: boolean,
) {
  patchBootForTable(tableId, (cached) => {
    const next = { ...cached.pendingBarDrinksByTableId };
    if (pending) next[tableId] = true;
    else delete next[tableId];
    return { ...cached, pendingBarDrinksByTableId: next };
  });
}

export function invalidateFloorClientCache(restaurantId?: string) {
  if (restaurantId) {
    boots.delete(restaurantId);
    pendingByRestaurant.delete(restaurantId);
    return;
  }
  boots.clear();
  pendingByRestaurant.clear();
}

export function prefetchFloorBoot(restaurantId: string) {
  seedDemoFloorBoot(restaurantId);
  void warmFloorBoot({ restaurantId });
}

export function warmFloorBoot(options?: {
  force?: boolean;
  restaurantId?: string | null;
}): Promise<FloorBootstrap> {
  const restaurantId = options?.restaurantId;
  if (!restaurantId) {
    return bootstrapFloorAction().then((result) => {
      if ("error" in result) throw new Error(result.error);
      setCachedFloorBoot(result);
      return result;
    });
  }

  if (!options?.force) {
    const hit = getCachedFloorBoot(restaurantId);
    if (hit) return Promise.resolve(hit);
    const pending = pendingByRestaurant.get(restaurantId);
    if (pending) return pending;
  }

  const request = bootstrapFloorAction(restaurantId)
    .then((result) => {
      if ("error" in result) throw new Error(result.error);
      setCachedFloorBoot(result);
      return result;
    })
    .finally(() => {
      pendingByRestaurant.delete(restaurantId);
    });

  pendingByRestaurant.set(restaurantId, request);
  return request;
}

export function refreshFloorBootInBackground(
  onUpdated?: (boot: FloorBootstrap) => void,
  restaurantId?: string,
): void {
  const id =
    restaurantId ??
    boots.keys().next().value ??
    pendingByRestaurant.keys().next().value;
  if (!id) return;
  void warmFloorBoot({ force: true, restaurantId: id })
    .then((boot) => {
      onUpdated?.(boot);
    })
    .catch(() => {});
}
