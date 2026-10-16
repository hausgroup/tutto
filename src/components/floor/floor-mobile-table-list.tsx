"use client";

import { useMemo } from "react";
import { FloorTableSlot } from "@/components/floor/floor-table-slot";
import { layoutTablesOnGrid } from "@/lib/floor/floor-grid";
import type { RestaurantTable } from "@/lib/floor/types";

export function FloorMobileTableList({
  tables,
  onSelect,
  onWarm,
  billTotalsByTableId,
  pendingBarDrinksByTableId,
  deliveringWithMealDrinksTableId = null,
  onDeliverPendingWithMealDrinks,
  openingTableId = null,
  highlightedTableIds,
  reservePickMode = false,
}: {
  tables: RestaurantTable[];
  onSelect: (table: RestaurantTable) => void;
  onWarm?: (table: RestaurantTable) => void;
  billTotalsByTableId?: Record<string, number>;
  pendingBarDrinksByTableId?: Record<string, true>;
  deliveringWithMealDrinksTableId?: string | null;
  onDeliverPendingWithMealDrinks?: (table: RestaurantTable) => void;
  openingTableId?: string | null;
  highlightedTableIds?: ReadonlySet<string> | string[];
  reservePickMode?: boolean;
}) {
  const highlighted =
    highlightedTableIds instanceof Set
      ? highlightedTableIds
      : highlightedTableIds
        ? new Set(highlightedTableIds)
        : null;
  const ordered = useMemo(() => {
    const layout = layoutTablesOnGrid(tables);
    return [...layout.placed]
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .map((p) => p.table);
  }, [tables]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5">
      {ordered.map((table) => (
        <div key={table.id} className="aspect-square overflow-visible">
          <FloorTableSlot
            table={table}
            onSelect={onSelect}
            onWarm={onWarm}
            billTotalMinor={billTotalsByTableId?.[table.id]}
            pendingBarDrinks={Boolean(pendingBarDrinksByTableId?.[table.id])}
            onDeliverPendingWithMealDrinks={onDeliverPendingWithMealDrinks}
            deliveringWithMealDrinks={
              deliveringWithMealDrinksTableId === table.id
            }
            busy={openingTableId === table.id}
            reservePickSelected={Boolean(highlighted?.has(table.id))}
            reservePickMode={reservePickMode}
          />
        </div>
      ))}
    </div>
  );
}
