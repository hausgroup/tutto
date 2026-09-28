import { describe, expect, it } from "vitest";
import {
  FLOOR_GRID_CELL_PX,
  FLOOR_GRID_COLUMNS,
  FLOOR_GRID_ROWS,
  findNextEmptyGridCell,
  gridCellToPosition,
  layoutTablesOnGrid,
  tableToGridCell,
} from "@/lib/floor/floor-grid";
import type { RestaurantTable } from "@/lib/floor/types";

function table(overrides: Partial<RestaurantTable>): RestaurantTable {
  return {
    id: "t1",
    restaurantId: "r1",
    floorAreaId: "a1",
    label: "M1",
    capacity: 4,
    status: "available",
    posX: 0,
    posY: 0,
    width: 96,
    height: 96,
    rotationDeg: 0,
    shape: "square",
    isActive: true,
    reservation: null,
    ...overrides,
  };
}

describe("tableToGridCell", () => {
  it("snaps position to grid indices", () => {
    expect(tableToGridCell(table({ posX: 0, posY: 0 }))).toEqual({
      col: 0,
      row: 0,
    });
    expect(
      tableToGridCell(
        table({
          posX: FLOOR_GRID_CELL_PX,
          posY: FLOOR_GRID_CELL_PX * 2,
        }),
      ),
    ).toEqual({ col: 1, row: 2 });
  });
});

describe("gridCellToPosition", () => {
  it("converts cell back to canvas coordinates", () => {
    expect(gridCellToPosition({ col: 2, row: 1 })).toEqual({
      posX: FLOOR_GRID_CELL_PX * 2,
      posY: FLOOR_GRID_CELL_PX,
    });
  });
});

describe("layoutTablesOnGrid", () => {
  it("uses the full 8-column floor by default", () => {
    const layout = layoutTablesOnGrid([
      table({ id: "1", posX: 0, posY: 0 }),
      table({ id: "2", posX: FLOOR_GRID_CELL_PX * 2, posY: FLOOR_GRID_CELL_PX }),
    ]);
    expect(layout.columnCount).toBe(FLOOR_GRID_COLUMNS);
    expect(layout.rowCount).toBe(FLOOR_GRID_ROWS);
    expect(layout.placed).toHaveLength(2);
  });

  it("moves colliding tables to the next free cell", () => {
    const layout = layoutTablesOnGrid([
      table({ id: "1", posX: 0, posY: 0 }),
      table({ id: "2", posX: 40, posY: 40 }),
    ]);
    expect(layout.placed.map((item) => [item.col, item.row])).toEqual([
      [0, 0],
      [1, 0],
    ]);
  });
});

describe("findNextEmptyGridCell", () => {
  it("returns first free cell", () => {
    expect(
      findNextEmptyGridCell([
        table({ id: "1", posX: 0, posY: 0 }),
        table({ id: "2", posX: FLOOR_GRID_CELL_PX, posY: 0 }),
      ]),
    ).toEqual({ col: 2, row: 0 });
  });
});
