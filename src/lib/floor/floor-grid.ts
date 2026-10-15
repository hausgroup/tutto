import type { RestaurantTable } from "@/lib/floor/types";

/** Pixel size of one grid cell (tables snap to this). */
export const FLOOR_GRID_CELL_PX = 128;

/** Default visual size stored for tables (uniform slots in the salón). */
export const FLOOR_TABLE_SLOT_SIZE = 96;

/** Default minimum visible floor grid (can grow with table positions). */
export const FLOOR_GRID_COLUMNS = 6;
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
  const col = Math.max(0, Math.round(table.posX / FLOOR_GRID_CELL_PX));
  const row = Math.max(0, Math.round(table.posY / FLOOR_GRID_CELL_PX));
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

function findNextEmptyCellFromKeys(
  occupied: Set<string>,
  minColumns = FLOOR_GRID_COLUMNS,
  minRows = FLOOR_GRID_ROWS,
): GridCell {
  let maxCol = minColumns - 1;
  let maxRow = minRows - 1;
  for (const key of occupied) {
    const [col, row] = key.split(":").map((part) => Number(part));
    if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
    maxCol = Math.max(maxCol, col);
    maxRow = Math.max(maxRow, row);
  }

  const searchCols = Math.max(minColumns, maxCol + 2);
  const searchRows = Math.max(minRows, maxRow + 2);

  for (let row = 0; row < searchRows; row += 1) {
    for (let col = 0; col < searchCols; col += 1) {
      if (!occupied.has(cellKey(col, row))) {
        return { col, row };
      }
    }
  }

  return { col: 0, row: 0 };
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

/** Map tables to grid coordinates; collisions get the next free cell. */
export function layoutTablesOnGrid(
  tables: RestaurantTable[],
  options?: { padEmpty?: boolean; minColumns?: number; minRows?: number },
): FloorGridLayout {
  const claimed = new Set<string>();
  const placed: GridPlacedTable[] = [];
  const minColumns = options?.minColumns ?? FLOOR_GRID_COLUMNS;
  const minRows = options?.minRows ?? FLOOR_GRID_ROWS;

  for (const table of tables) {
    let { col, row } = tableToGridCell(table);
    let key = cellKey(col, row);
    if (claimed.has(key)) {
      const free = findNextEmptyCellFromKeys(claimed, minColumns, minRows);
      col = free.col;
      row = free.row;
      key = cellKey(col, row);
    }
    claimed.add(key);
    placed.push({ table, col, row });
  }

  let columnCount = minColumns;
  let rowCount = minRows;

  for (const { col, row } of placed) {
    columnCount = Math.max(columnCount, col + 1);
    rowCount = Math.max(rowCount, row + 1);
  }

  if (options?.padEmpty) {
    columnCount += 1;
    rowCount += 1;
  }

  columnCount = Math.max(columnCount, minColumns);
  rowCount = Math.max(rowCount, minRows);

  return { placed, columnCount, rowCount };
}
