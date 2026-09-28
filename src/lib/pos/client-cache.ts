import type { CatalogSnapshot } from "@/lib/catalog/types";
import type { Order } from "@/lib/orders/types";
import {
  bootstrapPosAction,
  warmPosCatalogAction,
  type PosBootstrap,
  type PosCatalogWarm,
} from "@/lib/pos/actions";

let catalogWarm: PosCatalogWarm | null = null;
let catalogPending: Promise<PosCatalogWarm | null> | null = null;

const boots = new Map<string, PosBootstrap>();
const pendingBoots = new Map<string, Promise<PosBootstrap>>();

export function getCachedPosCatalog(): PosCatalogWarm | null {
  return catalogWarm;
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

export function clearCachedPosBoot(tableId: string) {
  boots.delete(tableId);
  pendingBoots.delete(tableId);
}

export function warmPosCatalog(): Promise<PosCatalogWarm | null> {
  if (catalogWarm) return Promise.resolve(catalogWarm);
  if (catalogPending) return catalogPending;

  catalogPending = warmPosCatalogAction()
    .then((result) => {
      if ("error" in result) return null;
      catalogWarm = result;
      return result;
    })
    .catch(() => null)
    .finally(() => {
      catalogPending = null;
    });

  return catalogPending;
}

/** Start loading table POS data before navigation finishes. */
export function warmPosTable(tableId: string): Promise<PosBootstrap> {
  const cached = boots.get(tableId);
  if (cached) return Promise.resolve(cached);

  const pending = pendingBoots.get(tableId);
  if (pending) return pending;

  const request = bootstrapPosAction(tableId)
    .then((result) => {
      if ("error" in result) {
        throw new Error(result.error);
      }
      catalogWarm = {
        catalog: result.catalog,
        attendantName: result.attendantName,
        restaurantId: result.restaurantId,
      };
      boots.set(tableId, result);
      return result;
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

export function peekCatalogSnapshot(): CatalogSnapshot | null {
  return catalogWarm?.catalog ?? null;
}

/** Drop cached POS catalog so the next visit picks up menu changes. */
export function invalidatePosCatalogCache() {
  catalogWarm = null;
  catalogPending = null;
  boots.clear();
  pendingBoots.clear();
}
