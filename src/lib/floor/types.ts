export const TABLE_STATUSES = [
  "available",
  "occupied",
  "order_ready",
  "payment_pending",
  "reserved",
  "closed",
] as const;

export type TableStatus = (typeof TABLE_STATUSES)[number];

export const TABLE_SHAPES = ["rectangle", "square", "circle"] as const;

export type TableShape = (typeof TABLE_SHAPES)[number];

export type TableReservation = {
  guestName: string;
  partySize: number;
  occasion: string;
};

export type FloorArea = {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
};

export type RestaurantTable = {
  id: string;
  restaurantId: string;
  floorAreaId: string;
  label: string;
  capacity: number;
  status: TableStatus;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotationDeg: number;
  shape: TableShape;
  isActive: boolean;
  reservation: TableReservation | null;
};

export type FloorSnapshot = {
  areas: FloorArea[];
  tables: RestaurantTable[];
};

export type FloorSummary = {
  totalTables: number;
  activeTables: number;
  byStatus: Record<TableStatus, number>;
  areasCount: number;
};

export const FLOOR_CANVAS = {
  width: 1024,
  height: 640,
} as const;
