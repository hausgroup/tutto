"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  cellKey,
  FLOOR_GRID_COLUMNS,
  FLOOR_GRID_ROWS,
  layoutTablesOnGrid,
  type GridCell,
} from "@/lib/floor/floor-grid";
import type { RestaurantTable } from "@/lib/floor/types";
import { DRAG_MIME, FloorTableSlot } from "@/components/floor/floor-table-slot";

const CANVAS_BG = "bg-[#fcfcfd] dark:bg-zinc-950/40";

/** Spaced dashes like a file drop-zone (not dense dotted borders). */
const EMPTY_CELL = cn(
  "bg-transparent [background-image:url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='16' ry='16' stroke='%23d4d4d8' stroke-width='1.5' stroke-dasharray='7%2c 7' stroke-linecap='round'/%3e%3c/svg%3e\")]",
  "dark:[background-image:url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='16' ry='16' stroke='%2352525b' stroke-width='1.5' stroke-dasharray='7%2c 7' stroke-linecap='round'/%3e%3c/svg%3e\")]",
);

export function FloorGridView({
  tables,
  onSelect,
  onWarm,
  selectedTableId,
  emptyLabel = "No hay mesas activas en esta área.",
  /** Show empty slots so the editor can place / move tables. */
  editable = false,
  onEmptySlotClick,
  onDropToCell,
  allowInactive = false,
  billTotalsByTableId,
  pendingBarDrinksByTableId,
  openingTableId = null,
  className,
}: {
  tables: RestaurantTable[];
  onSelect?: (table: RestaurantTable) => void;
  onWarm?: (table: RestaurantTable) => void;
  selectedTableId?: string | null;
  emptyLabel?: string;
  editable?: boolean;
  onEmptySlotClick?: (cell: GridCell) => void;
  /** Drag-and-drop: move or swap into this cell. */
  onDropToCell?: (tableId: string, cell: GridCell) => void;
  allowInactive?: boolean;
  billTotalsByTableId?: Record<string, number>;
  pendingBarDrinksByTableId?: Record<string, true>;
  openingTableId?: string | null;
  className?: string;
}) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const layout = useMemo(
    () =>
      layoutTablesOnGrid(tables, {
        padEmpty: true,
        minColumns: FLOOR_GRID_COLUMNS,
        minRows: editable ? FLOOR_GRID_ROWS : Math.min(4, FLOOR_GRID_ROWS),
      }),
    [tables, editable],
  );

  const occupied = useMemo(() => {
    const map = new Map<string, RestaurantTable>();
    for (const { table, col, row } of layout.placed) {
      map.set(cellKey(col, row), table);
    }
    return map;
  }, [layout.placed]);

  if (tables.length === 0 && !editable) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground",
          CANVAS_BG,
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  const cells: { col: number; row: number }[] = [];
  for (let row = 0; row < layout.rowCount; row += 1) {
    for (let col = 0; col < layout.columnCount; col += 1) {
      cells.push({ col, row });
    }
  }

  function readDraggedTableId(event: React.DragEvent): string | null {
    return (
      event.dataTransfer.getData(DRAG_MIME) ||
      event.dataTransfer.getData("text/plain") ||
      null
    );
  }

  function handleDragOver(event: React.DragEvent, key: string) {
    if (!editable || !onDropToCell) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverKey(key);
  }

  function handleDrop(event: React.DragEvent, cell: GridCell) {
    if (!editable || !onDropToCell) return;
    event.preventDefault();
    const tableId = readDraggedTableId(event);
    setDragOverKey(null);
    setDraggingId(null);
    if (!tableId) return;
    onDropToCell(tableId, cell);
  }

  function handleDragEnd() {
    setDragOverKey(null);
    setDraggingId(null);
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        CANVAS_BG,
        className,
      )}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-0 flex-1 overflow-auto p-3 md:p-4">
        <div
          className="mx-auto grid w-full max-w-[1400px] gap-2 md:gap-2.5"
          style={{
            gridTemplateColumns: `repeat(${layout.columnCount}, minmax(0, 1fr))`,
          }}
        >
          {cells.map(({ col, row }) => {
            const key = cellKey(col, row);
            const table = occupied.get(key);
            const isOver = dragOverKey === key;

            if (table) {
              return (
                <div
                  key={table.id}
                  className={cn(
                    "aspect-square rounded-[16px] transition-colors",
                    isOver &&
                      draggingId !== table.id &&
                      "bg-primary/10 ring-2 ring-primary/40 ring-offset-1 ring-offset-[#fcfcfd]",
                  )}
                  style={{
                    gridColumn: col + 1,
                    gridRow: row + 1,
                  }}
                  onDragOver={(event) => handleDragOver(event, key)}
                  onDragLeave={() =>
                    setDragOverKey((current) =>
                      current === key ? null : current,
                    )
                  }
                  onDrop={(event) => handleDrop(event, { col, row })}
                  onDragStart={() => setDraggingId(table.id)}
                >
                  <FloorTableSlot
                    table={table}
                    onSelect={onSelect}
                    onWarm={onWarm}
                    selected={selectedTableId === table.id}
                    allowInactive={allowInactive}
                    draggable={editable}
                    isDragging={draggingId === table.id}
                    billTotalMinor={
                      editable
                        ? undefined
                        : billTotalsByTableId?.[table.id]
                    }
                    pendingBarDrinks={
                      !editable &&
                      Boolean(pendingBarDrinksByTableId?.[table.id])
                    }
                    busy={openingTableId === table.id}
                    neutralAppearance={editable}
                  />
                </div>
              );
            }

            if (editable) {
              return (
                <button
                  key={`empty-${col}-${row}`}
                  type="button"
                  onClick={() => onEmptySlotClick?.({ col, row })}
                  onDragOver={(event) => handleDragOver(event, key)}
                  onDragLeave={() =>
                    setDragOverKey((current) =>
                      current === key ? null : current,
                    )
                  }
                  onDrop={(event) => handleDrop(event, { col, row })}
                  className={cn(
                    "aspect-square rounded-[16px] transition-colors",
                    EMPTY_CELL,
                    "hover:bg-white/60",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isOver &&
                      "bg-primary/10 ring-2 ring-primary/30",
                  )}
                  style={{
                    gridColumn: col + 1,
                    gridRow: row + 1,
                  }}
                  aria-label={`Casilla vacía fila ${row + 1} columna ${col + 1}`}
                />
              );
            }

            return (
              <div
                key={`pad-${col}-${row}`}
                className="aspect-square rounded-[16px]"
                style={{
                  gridColumn: col + 1,
                  gridRow: row + 1,
                }}
                aria-hidden
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
