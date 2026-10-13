import type { CatalogSnapshot } from "@/lib/catalog/types";
import { getCachedFloorBoot } from "@/lib/floor/client-cache";
import type { Order } from "@/lib/orders/types";
import {
  bootstrapPosTableAction,
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
function floorCacheSaysReserved(tableId: string): boolean {
  const table = getCachedFloorBoot()?.snapshot.tables.find(
    (row) => row.id === tableId,
  );
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
    catalogWarm ? Promise.resolve(catalogWarm) : warmPosCatalog(),
    bootstrapPosTableAction(tableId),
  ])
    .then(([catalogResult, tableResult]) => {
      if (!catalogResult) {
        throw new Error("BOOTSTRAP_FAILED");
      }
      if ("error" in tableResult) {
        throw new Error(tableResult.error);
      }
      catalogWarm = catalogResult;
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
