import type { FloorBootstrap } from "@/lib/floor/actions-boot";
import { bootstrapFloorAction } from "@/lib/floor/actions-boot";

let cached: FloorBootstrap | null = null;
let pending: Promise<FloorBootstrap> | null = null;

export function getCachedFloorBoot(): FloorBootstrap | null {
  return cached;
}

export function getPendingFloorBoot(): Promise<FloorBootstrap> | null {
  return pending;
}

export function setCachedFloorBoot(boot: FloorBootstrap) {
  cached = boot;
}

/** Patch a table status locally so returning from POS feels up to date. */
export function patchCachedFloorTableStatus(
  tableId: string,
  status: FloorBootstrap["snapshot"]["tables"][number]["status"],
) {
  if (!cached) return;
  cached = {
    ...cached,
    snapshot: {
      ...cached.snapshot,
      tables: cached.snapshot.tables.map((table) =>
        table.id === tableId ? { ...table, status } : table,
      ),
    },
  };
}

export function patchCachedFloorTableReservation(
  tableId: string,
  reservation: FloorBootstrap["snapshot"]["tables"][number]["reservation"],
) {
  if (!cached) return;
  cached = {
    ...cached,
    snapshot: {
      ...cached.snapshot,
      tables: cached.snapshot.tables.map((table) =>
        table.id === tableId
          ? { ...table, status: "reserved", reservation }
          : table,
      ),
    },
  };
}

export function patchCachedFloorBillTotal(tableId: string, totalMinor: number) {
  if (!cached) return;
  const next = { ...cached.billTotalsByTableId };
  if (totalMinor <= 0) delete next[tableId];
  else next[tableId] = totalMinor;
  cached = { ...cached, billTotalsByTableId: next };
}

export function patchCachedFloorPendingBarDrinks(
  tableId: string,
  pending: boolean,
) {
  if (!cached) return;
  const next = { ...cached.pendingBarDrinksByTableId };
  if (pending) next[tableId] = true;
  else delete next[tableId];
  cached = { ...cached, pendingBarDrinksByTableId: next };
}

export function warmFloorBoot(options?: {
  force?: boolean;
}): Promise<FloorBootstrap> {
  if (!options?.force && cached) return Promise.resolve(cached);
  if (pending) return pending;

  pending = bootstrapFloorAction()
    .then((result) => {
      if ("error" in result) throw new Error(result.error);
      cached = result;
      return result;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}
