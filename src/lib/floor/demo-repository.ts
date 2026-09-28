import { randomUUID } from "node:crypto";
import { getDemoFloorStore } from "@/lib/floor/demo-store";
import {
  buildFloorSummary,
  type CreateFloorAreaInput,
  type CreateTableInput,
  type FloorRepository,
  type ReserveTableInput,
  type UpdateFloorAreaInput,
  type UpdateTableLayoutInput,
  type UpdateTablePropertiesInput,
} from "@/lib/floor/repository";
import type {
  FloorArea,
  FloorSnapshot,
  RestaurantTable,
  TableStatus,
} from "@/lib/floor/types";
import { FLOOR_CANVAS } from "@/lib/floor/types";
import {
  findNextEmptyGridCell,
  FLOOR_TABLE_SLOT_SIZE,
  gridCellToPosition,
} from "@/lib/floor/floor-grid";

import { DEMO_RESTAURANT_ID } from "@/lib/floor/demo-data";

function assertRestaurant(restaurantId: string) {
  if (restaurantId !== DEMO_RESTAURANT_ID) {
    throw new Error("RESTAURANT_NOT_FOUND");
  }
}

function nextTablePosition(areaId: string, store: FloorSnapshot) {
  const areaTables = store.tables.filter((table) => table.floorAreaId === areaId);
  const cell = findNextEmptyGridCell(areaTables);
  return {
    ...gridCellToPosition(cell),
    width: FLOOR_TABLE_SLOT_SIZE,
    height: FLOOR_TABLE_SLOT_SIZE,
  };
}

export class DemoFloorRepository implements FloorRepository {
  private get store() {
    return getDemoFloorStore();
  }

  async getSnapshot(restaurantId: string): Promise<FloorSnapshot> {
    assertRestaurant(restaurantId);
    return structuredClone(this.store);
  }

  async getSummary(restaurantId: string) {
    const snapshot = await this.getSnapshot(restaurantId);
    return buildFloorSummary(snapshot);
  }

  async createArea(input: CreateFloorAreaInput): Promise<FloorArea> {
    assertRestaurant(input.restaurantId);
    const area: FloorArea = {
      id: randomUUID(),
      restaurantId: input.restaurantId,
      name: input.name,
      sortOrder: input.sortOrder ?? this.store.areas.length + 1,
    };
    this.store.areas.push(area);
    return structuredClone(area);
  }

  async updateArea(input: UpdateFloorAreaInput): Promise<FloorArea> {
    assertRestaurant(input.restaurantId);
    const area = this.store.areas.find((item) => item.id === input.id);
    if (!area) throw new Error("AREA_NOT_FOUND");
    if (input.name !== undefined) area.name = input.name;
    if (input.sortOrder !== undefined) area.sortOrder = input.sortOrder;
    return structuredClone(area);
  }

  async deleteArea(id: string, restaurantId: string): Promise<void> {
    assertRestaurant(restaurantId);
    const hasTables = this.store.tables.some((table) => table.floorAreaId === id);
    if (hasTables) throw new Error("AREA_NOT_EMPTY");
    this.store.areas = this.store.areas.filter((area) => area.id !== id);
  }

  async createTable(input: CreateTableInput): Promise<RestaurantTable> {
    assertRestaurant(input.restaurantId);
    const area = this.store.areas.find((item) => item.id === input.floorAreaId);
    if (!area) throw new Error("AREA_NOT_FOUND");

    const position = nextTablePosition(input.floorAreaId, this.store);
    const table: RestaurantTable = {
      id: randomUUID(),
      restaurantId: input.restaurantId,
      floorAreaId: input.floorAreaId,
      label: input.label,
      capacity: input.capacity,
      status: "available",
      posX: position.posX,
      posY: position.posY,
      width: position.width,
      height: position.height,
      rotationDeg: 0,
      shape: input.shape === "circle" ? "circle" : "square",
      isActive: true,
      reservation: null,
    };
    this.store.tables.push(table);
    return structuredClone(table);
  }

  async updateTableLayout(input: UpdateTableLayoutInput): Promise<RestaurantTable> {
    assertRestaurant(input.restaurantId);
    const table = this.store.tables.find((item) => item.id === input.id);
    if (!table) throw new Error("TABLE_NOT_FOUND");
    table.posX = Math.min(input.posX, FLOOR_CANVAS.width - table.width);
    table.posY = Math.min(input.posY, FLOOR_CANVAS.height - table.height);
    table.width = input.width;
    table.height = input.height;
    table.rotationDeg = input.rotationDeg;
    return structuredClone(table);
  }

  async updateTableProperties(
    input: UpdateTablePropertiesInput,
  ): Promise<RestaurantTable> {
    assertRestaurant(input.restaurantId);
    const table = this.store.tables.find((item) => item.id === input.id);
    if (!table) throw new Error("TABLE_NOT_FOUND");
    Object.assign(table, {
      label: input.label,
      capacity: input.capacity,
      shape: input.shape,
      status: input.status,
      floorAreaId: input.floorAreaId,
      isActive: input.isActive,
    });
    return structuredClone(table);
  }

  async updateTableStatus(
    id: string,
    restaurantId: string,
    status: TableStatus,
  ): Promise<RestaurantTable> {
    assertRestaurant(restaurantId);
    const table = this.store.tables.find((item) => item.id === id);
    if (!table) throw new Error("TABLE_NOT_FOUND");
    table.status = status;
    if (status !== "reserved") {
      table.reservation = null;
    }
    return structuredClone(table);
  }

  async reserveTable(input: ReserveTableInput): Promise<RestaurantTable> {
    assertRestaurant(input.restaurantId);
    const table = this.store.tables.find((item) => item.id === input.tableId);
    if (!table) throw new Error("TABLE_NOT_FOUND");
    if (
      table.status !== "available" &&
      table.status !== "reserved"
    ) {
      throw new Error("TABLE_NOT_AVAILABLE");
    }
    table.status = "reserved";
    table.reservation = {
      guestName: input.guestName,
      partySize: input.partySize,
      occasion: input.occasion,
    };
    return structuredClone(table);
  }

  async deleteTable(id: string, restaurantId: string): Promise<void> {
    assertRestaurant(restaurantId);
    this.store.tables = this.store.tables.filter((table) => table.id !== id);
  }

  async getTableById(
    id: string,
    restaurantId: string,
  ): Promise<RestaurantTable | null> {
    assertRestaurant(restaurantId);
    const table = this.store.tables.find((item) => item.id === id);
    return table ? structuredClone(table) : null;
  }
}
