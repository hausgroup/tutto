import type { RestaurantTable } from "@/lib/floor/types";

/** Pixel size of one grid cell (tables snap to this). */
export const FLOOR_GRID_CELL_PX = 128;

/** Default visual size stored for tables (uniform slots in the salón). */
export const FLOOR_TABLE_SLOT_SIZE = 96;

/** Visible / editable floor grid. */
export const FLOOR_GRID_COLUMNS = 8;
export const FLOOR_GRID_ROWS = 5;

export type GridCell = {
  col: number;
  row: number;
};

export type GridPlacedTable = {
  table: RestaurantTable;
  col: number;
  row: number;
};

export type FloorGridLayout = {
  placed: GridPlacedTable[];
  columnCount: number;
  rowCount: number;
};

export function tableToGridCell(table: RestaurantTable): GridCell {
  const col = Math.max(
    0,
    Math.min(
      FLOOR_GRID_COLUMNS - 1,
      Math.round(table.posX / FLOOR_GRID_CELL_PX),
    ),
  );
  const row = Math.max(
    0,
    Math.min(
      FLOOR_GRID_ROWS - 1,
      Math.round(table.posY / FLOOR_GRID_CELL_PX),
    ),
  );
  return { col, row };
}

export function gridCellToPosition(cell: GridCell): {
  posX: number;
  posY: number;
} {
  return {
    posX: cell.col * FLOOR_GRID_CELL_PX,
    posY: cell.row * FLOOR_GRID_CELL_PX,
  };
}

export function cellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

/** First free cell in row-major order within the floor grid. */
export function findNextEmptyGridCell(tables: RestaurantTable[]): GridCell {
  const occupied = new Set(
    tables.map((table) => {
      const { col, row } = tableToGridCell(table);
      return cellKey(col, row);
    }),
  );
  return findNextEmptyCellFromKeys(occupied);
}

function findNextEmptyCellFromKeys(occupied: Set<string>): GridCell {
  for (let row = 0; row < FLOOR_GRID_ROWS; row += 1) {
    for (let col = 0; col < FLOOR_GRID_COLUMNS; col += 1) {
      if (!occupied.has(cellKey(col, row))) {
        return { col, row };
      }
    }
  }

  return { col: 0, row: 0 };
}

/** Map tables to grid coordinates; collisions get the next free cell. */
export function layoutTablesOnGrid(
  tables: RestaurantTable[],
  options?: { padEmpty?: boolean; minColumns?: number; minRows?: number },
): FloorGridLayout {
  const claimed = new Set<string>();
  const placed: GridPlacedTable[] = [];

  for (const table of tables) {
    let { col, row } = tableToGridCell(table);
    let key = cellKey(col, row);
    if (claimed.has(key)) {
      const free = findNextEmptyCellFromKeys(claimed);
      col = free.col;
      row = free.row;
      key = cellKey(col, row);
    }
    claimed.add(key);
    placed.push({ table, col, row });
  }

  let columnCount = options?.minColumns ?? FLOOR_GRID_COLUMNS;
  let rowCount = options?.minRows ?? FLOOR_GRID_ROWS;

  for (const { col, row } of placed) {
    columnCount = Math.max(columnCount, col + 1);
    rowCount = Math.max(rowCount, row + 1);
  }

  if (options?.padEmpty) {
    columnCount = Math.min(columnCount + 1, FLOOR_GRID_COLUMNS);
    rowCount = Math.min(rowCount + 1, FLOOR_GRID_ROWS);
  }

  columnCount = Math.min(
    Math.max(columnCount, options?.minColumns ?? FLOOR_GRID_COLUMNS),
    FLOOR_GRID_COLUMNS,
  );
  rowCount = Math.min(
    Math.max(rowCount, options?.minRows ?? FLOOR_GRID_ROWS),
    FLOOR_GRID_ROWS,
  );

  return { placed, columnCount, rowCount };
}
