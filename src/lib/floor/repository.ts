import type {
  FloorArea,
  FloorSnapshot,
  FloorSummary,
  RestaurantTable,
  TableStatus,
} from "@/lib/floor/types";

export type CreateFloorAreaInput = {
  restaurantId: string;
  name: string;
  sortOrder?: number;
};

export type UpdateFloorAreaInput = {
  id: string;
  restaurantId: string;
  name?: string;
  sortOrder?: number;
};

export type CreateTableInput = {
  restaurantId: string;
  floorAreaId: string;
  label: string;
  capacity: number;
  shape: RestaurantTable["shape"];
};

export type UpdateTableLayoutInput = {
  id: string;
  restaurantId: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotationDeg: number;
};

export type UpdateTablePropertiesInput = {
  id: string;
  restaurantId: string;
  label: string;
  capacity: number;
  shape: RestaurantTable["shape"];
  status: TableStatus;
  floorAreaId: string;
  isActive: boolean;
};

export type ReserveTableInput = {
  tableId: string;
  restaurantId: string;
  guestName: string;
  partySize: number;
  occasion: string;
  scheduledAt: string;
};

export interface FloorRepository {
  getSnapshot(restaurantId: string): Promise<FloorSnapshot>;
  getSummary(restaurantId: string): Promise<FloorSummary>;
  createArea(input: CreateFloorAreaInput): Promise<FloorArea>;
  updateArea(input: UpdateFloorAreaInput): Promise<FloorArea>;
  deleteArea(id: string, restaurantId: string): Promise<void>;
  createTable(input: CreateTableInput): Promise<RestaurantTable>;
  updateTableLayout(input: UpdateTableLayoutInput): Promise<RestaurantTable>;
  updateTableProperties(
    input: UpdateTablePropertiesInput,
  ): Promise<RestaurantTable>;
  updateTableStatus(
    id: string,
    restaurantId: string,
    status: TableStatus,
  ): Promise<RestaurantTable>;
  reserveTable(input: ReserveTableInput): Promise<RestaurantTable>;
  deleteTable(id: string, restaurantId: string): Promise<void>;
  getTableById(id: string, restaurantId: string): Promise<RestaurantTable | null>;
}

export function buildFloorSummary(snapshot: FloorSnapshot): FloorSummary {
  const activeTables = snapshot.tables.filter((table) => table.isActive);
  const byStatus = {
    available: 0,
    occupied: 0,
    order_ready: 0,
    payment_pending: 0,
    reserved: 0,
    closed: 0,
  } satisfies Record<TableStatus, number>;

  for (const table of activeTables) {
    byStatus[table.status] += 1;
  }

  return {
    totalTables: snapshot.tables.length,
    activeTables: activeTables.length,
    byStatus,
    areasCount: snapshot.areas.length,
  };
}
