import type { CatalogSnapshot } from "@/lib/catalog/types";
import { getCachedFloorBoot } from "@/lib/floor/client-cache";
import type { Order } from "@/lib/orders/types";
import {
  bootstrapPosTableAction,
  warmPosCatalogAction,
  type PosBootstrap,
  type PosCatalogWarm,
} from "@/lib/pos/actions";

const catalogs = new Map<string, PosCatalogWarm>();
const catalogPending = new Map<string, Promise<PosCatalogWarm | null>>();

const boots = new Map<string, PosBootstrap>();
const pendingBoots = new Map<string, Promise<PosBootstrap>>();

export function getCachedPosCatalog(
  restaurantId?: string,
): PosCatalogWarm | null {
  if (restaurantId) return catalogs.get(restaurantId) ?? null;
  const first = catalogs.values().next();
  return first.done ? null : first.value;
}

export function getCachedPosBoot(tableId: string): PosBootstrap | null {
  return boots.get(tableId) ?? null;
}

export function getPendingPosBoot(
  tableId: string,
): Promise<PosBootstrap> | null {
  return pendingBoots.get(tableId) ?? null;
}

export function setCachedPosOrder(tableId: string, order: Order) {
  const existing = boots.get(tableId);
  if (!existing) return;
  boots.set(tableId, { ...existing, order });
}

export function patchCachedPosAttendantName(
  tableId: string,
  attendantName: string,
) {
  const existing = boots.get(tableId);
  if (!existing) return;
  boots.set(tableId, { ...existing, attendantName });
}

export function clearCachedPosBoot(tableId: string) {
  boots.delete(tableId);
  pendingBoots.delete(tableId);
}

export function prefetchPosCatalog(restaurantId: string) {
  void warmPosCatalog({ restaurantId });
}

export function warmPosCatalog(options?: {
  restaurantId?: string;
  force?: boolean;
}): Promise<PosCatalogWarm | null> {
  const restaurantId = options?.restaurantId;
  if (restaurantId && !options?.force) {
    const hit = catalogs.get(restaurantId);
    if (hit) return Promise.resolve(hit);
    const pending = catalogPending.get(restaurantId);
    if (pending) return pending;
  } else if (!restaurantId && catalogWarmLegacy()) {
    return Promise.resolve(catalogWarmLegacy());
  }

  const request = warmPosCatalogAction(restaurantId)
    .then((result) => {
      if ("error" in result) return null;
      if (result.restaurantId) {
        catalogs.set(result.restaurantId, result);
      }
      return result;
    })
    .catch(() => null)
    .finally(() => {
      if (restaurantId) catalogPending.delete(restaurantId);
    });

  if (restaurantId) catalogPending.set(restaurantId, request);
  return request;
}

function catalogWarmLegacy(): PosCatalogWarm | null {
  const first = catalogs.values().next();
  return first.done ? null : first.value;
}

function floorCacheSaysReserved(tableId: string): boolean {
  const boot = getCachedFloorBoot();
  const table = boot?.snapshot.tables.find((row) => row.id === tableId);
  return table?.status === "reserved" && table.reservation != null;
}

export function warmPosTable(tableId: string): Promise<PosBootstrap> {
  const cached = boots.get(tableId);
  if (cached) {
    if (floorCacheSaysReserved(tableId) && !cached.tableReservation) {
      boots.delete(tableId);
    } else {
      return Promise.resolve(cached);
    }
  }

  const pending = pendingBoots.get(tableId);
  if (pending) return pending;

  const request = Promise.all([
    warmPosCatalog({ restaurantId: undefined }),
    bootstrapPosTableAction(tableId),
  ])
    .then(([catalogResult, tableResult]) => {
      if (!catalogResult) {
        throw new Error("BOOTSTRAP_FAILED");
      }
      if ("error" in tableResult) {
        throw new Error(tableResult.error);
      }
      catalogs.set(catalogResult.restaurantId, catalogResult);
      const boot: PosBootstrap = {
        ...tableResult,
        catalog: catalogResult.catalog,
      };
      boots.set(tableId, boot);
      return boot;
    })
    .catch((error) => {
      pendingBoots.delete(tableId);
      throw error;
    })
    .finally(() => {
      pendingBoots.delete(tableId);
    });

  pendingBoots.set(tableId, request);
  return request;
}

export function peekCatalogSnapshot(
  restaurantId?: string,
): CatalogSnapshot | null {
  return getCachedPosCatalog(restaurantId)?.catalog ?? null;
}

export function invalidatePosCatalogCache(restaurantId?: string) {
  if (restaurantId) {
    catalogs.delete(restaurantId);
    catalogPending.delete(restaurantId);
    return;
  }
  catalogs.clear();
  catalogPending.clear();
  boots.clear();
  pendingBoots.clear();
}
