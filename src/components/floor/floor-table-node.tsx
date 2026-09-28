"use client";

import { cn } from "@/lib/utils";
import { TABLE_STATUS_META } from "@/lib/floor/status";
import type { RestaurantTable } from "@/lib/floor/types";
import { FloorTableVisual } from "@/components/floor/floor-table-visual";

export function FloorTableNode({
  table,
  selected,
  onSelect,
  readOnly = false,
  embedded = false,
}: {
  table: RestaurantTable;
  selected?: boolean;
  onSelect?: (table: RestaurantTable) => void;
  readOnly?: boolean;
  embedded?: boolean;
}) {
  const meta = TABLE_STATUS_META[table.status];

  return (
    <button
      type="button"
      disabled={!table.isActive}
      onClick={() => onSelect?.(table)}
      className={cn(
        "touch-manipulation p-0 text-left transition-shadow",
        embedded ? "relative size-full" : "absolute",
        selected && "z-10",
        readOnly ? "cursor-pointer" : "cursor-move",
        !table.isActive && "opacity-40",
      )}
      style={
        embedded
          ? { transform: `rotate(${table.rotationDeg}deg)` }
          : {
              left: table.posX,
              top: table.posY,
              width: table.width,
              height: table.height,
              transform: `rotate(${table.rotationDeg}deg)`,
            }
      }
      aria-label={`Mesa ${table.label}, ${meta.label}, capacidad ${table.capacity}`}
    >
      <FloorTableVisual
        table={table}
        showStatusLabel={readOnly}
        selected={selected}
      />
    </button>
  );
}
