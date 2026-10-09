import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  findNextEmptyGridCell,
  FLOOR_TABLE_SLOT_SIZE,
  gridCellToPosition,
} from "@/lib/floor/floor-grid";
import {
  buildFloorSummary,
  type CreateFloorAreaInput,
  type CreateTableInput,
  type FloorRepository,
  type ReserveTableInput,
  type ReserveTablesInput,
  type UpdateFloorAreaInput,
  type UpdateTableLayoutInput,
  type UpdateTablePropertiesInput,
} from "@/lib/floor/repository";
import type {
  FloorArea,
  FloorSnapshot,
  RestaurantTable,
  TableReservation,
  TableShape,
  TableStatus,
} from "@/lib/floor/types";

/** `*` keeps reads working before optional columns (e.g. reservation_scheduled_at) are migrated. */
const TABLE_SELECT = "*";

type AreaRow = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
};

type TableRow = {
  id: string;
  restaurant_id: string;
  floor_area_id: string;
  label: string;
  capacity: number;
  status: TableStatus;
  pos_x: number | string;
  pos_y: number | string;
  width: number | string;
  height: number | string;
  rotation_deg: number | string;
  shape: string;
  is_active: boolean;
  reservation_guest_name: string | null;
  reservation_party_size: number | null;
  reservation_occasion: string | null;
  reservation_scheduled_at?: string | null;
  reservation_group_id?: string | null;
};

function mapReservation(row: TableRow): TableReservation | null {
  if (
    !row.reservation_guest_name ||
    row.reservation_party_size == null ||
    !row.reservation_occasion
  ) {
    return null;
  }
  return {
    guestName: row.reservation_guest_name,
    partySize: Number(row.reservation_party_size),
    occasion: row.reservation_occasion,
    scheduledAt: row.reservation_scheduled_at ?? null,
    groupId: row.reservation_group_id ?? null,
  };
}

function mapArea(row: AreaRow): FloorArea {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

function mapTable(row: TableRow): RestaurantTable {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    floorAreaId: row.floor_area_id,
    label: row.label,
    capacity: row.capacity,
    status: row.status,
    posX: Number(row.pos_x),
    posY: Number(row.pos_y),
    width: Number(row.width),
    height: Number(row.height),
    rotationDeg: Number(row.rotation_deg),
    shape: row.shape as TableShape,
    isActive: row.is_active,
    reservation: mapReservation(row),
  };
}

export class SupabaseFloorRepository implements FloorRepository {
  async getSnapshot(restaurantId: string): Promise<FloorSnapshot> {
    const supabase = await createSupabaseServerClient();
    const [{ data: areas, error: areasError }, { data: tables, error: tablesError }] =
      await Promise.all([
        supabase
          .from("floor_areas")
          .select("id, restaurant_id, name, sort_order")
          .eq("restaurant_id", restaurantId)
          .order("sort_order"),
        supabase
          .from("restaurant_tables")
          .select(TABLE_SELECT)
          .eq("restaurant_id", restaurantId)
          .order("label"),
      ]);

    if (areasError) throw areasError;
    if (tablesError) throw tablesError;

    return {
      areas: ((areas ?? []) as AreaRow[]).map(mapArea),
      tables: ((tables ?? []) as TableRow[]).map(mapTable),
    };
  }

  async getSummary(restaurantId: string) {
    const snapshot = await this.getSnapshot(restaurantId);
    return buildFloorSummary(snapshot);
  }

  async createArea(input: CreateFloorAreaInput): Promise<FloorArea> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("floor_areas")
      .insert({
        restaurant_id: input.restaurantId,
        name: input.name,
        sort_order: input.sortOrder ?? 0,
      })
      .select("id, restaurant_id, name, sort_order")
      .single();

    if (error) throw error;
    return mapArea(data as AreaRow);
  }

  async updateArea(input: UpdateFloorAreaInput): Promise<FloorArea> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("floor_areas")
      .update({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
      })
      .eq("id", input.id)
      .eq("restaurant_id", input.restaurantId)
      .select("id, restaurant_id, name, sort_order")
      .single();

    if (error) throw error;
    return mapArea(data as AreaRow);
  }

  async deleteArea(id: string, restaurantId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { count, error: countError } = await supabase
      .from("restaurant_tables")
      .select("id", { count: "exact", head: true })
      .eq("floor_area_id", id);

    if (countError) throw countError;
    if ((count ?? 0) > 0) throw new Error("AREA_NOT_EMPTY");

    const { error } = await supabase
      .from("floor_areas")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);

    if (error) throw error;
  }

  async createTable(input: CreateTableInput): Promise<RestaurantTable> {
    const supabase = await createSupabaseServerClient();
    const label = input.label.trim();

    const { data: existingRows, error: existingError } = await supabase
      .from("restaurant_tables")
      .select(TABLE_SELECT)
      .eq("restaurant_id", input.restaurantId)
      .eq("floor_area_id", input.floorAreaId);

    if (existingError) throw existingError;

    const existing = ((existingRows ?? []) as TableRow[]).map(mapTable);
    if (existing.some((table) => table.label === label)) {
      throw new Error("TABLE_LABEL_TAKEN_IN_AREA");
    }

    const { data: sameLabelRows, error: labelError } = await supabase
      .from("restaurant_tables")
      .select("floor_area_id")
      .eq("restaurant_id", input.restaurantId)
      .eq("label", label);

    if (labelError) throw labelError;

    const otherZone = (sameLabelRows ?? []).some(
      (row) => row.floor_area_id !== input.floorAreaId,
    );
    if (otherZone) {
      throw new Error("TABLE_LABEL_TAKEN_OTHER_ZONE");
    }

    const cell = findNextEmptyGridCell(existing);
    const position = gridCellToPosition(cell);

    const { data, error } = await supabase
      .from("restaurant_tables")
      .insert({
        restaurant_id: input.restaurantId,
        floor_area_id: input.floorAreaId,
        label: input.label,
        capacity: input.capacity,
        shape: input.shape,
        status: "available",
        pos_x: position.posX,
        pos_y: position.posY,
        width: FLOOR_TABLE_SLOT_SIZE,
        height: FLOOR_TABLE_SLOT_SIZE,
      })
      .select(TABLE_SELECT)
      .single();

    if (error) throw error;
    return mapTable(data as TableRow);
  }

  async updateTableLayout(input: UpdateTableLayoutInput): Promise<RestaurantTable> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .update({
        pos_x: input.posX,
        pos_y: input.posY,
        width: input.width,
        height: input.height,
        rotation_deg: input.rotationDeg,
      })
      .eq("id", input.id)
      .eq("restaurant_id", input.restaurantId)
      .select(TABLE_SELECT)
      .single();

    if (error) throw error;
    return mapTable(data as TableRow);
  }

  async updateTableProperties(
    input: UpdateTablePropertiesInput,
  ): Promise<RestaurantTable> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .update({
        label: input.label,
        capacity: input.capacity,
        shape: input.shape,
        status: input.status,
        floor_area_id: input.floorAreaId,
        is_active: input.isActive,
      })
      .eq("id", input.id)
      .eq("restaurant_id", input.restaurantId)
      .select(TABLE_SELECT)
      .single();

    if (error) throw error;
    return mapTable(data as TableRow);
  }

  async updateTableStatus(
    id: string,
    restaurantId: string,
    status: TableStatus,
  ): Promise<RestaurantTable> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .update(
        status === "reserved"
          ? { status }
          : {
              status,
              reservation_guest_name: null,
              reservation_party_size: null,
              reservation_occasion: null,
              reservation_scheduled_at: null,
              reservation_group_id: null,
            },
      )
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .select(TABLE_SELECT)
      .single();

    if (error) throw error;
    return mapTable(data as TableRow);
  }

  async reserveTable(input: ReserveTableInput): Promise<RestaurantTable> {
    const [table] = await this.reserveTables({
      tableIds: [input.tableId],
      restaurantId: input.restaurantId,
      guestName: input.guestName,
      partySize: input.partySize,
      occasion: input.occasion,
      scheduledAt: input.scheduledAt,
      groupId: input.groupId ?? crypto.randomUUID(),
    });
    return table;
  }

  async reserveTables(input: ReserveTablesInput): Promise<RestaurantTable[]> {
    const supabase = await createSupabaseServerClient();
    const uniqueIds = [...new Set(input.tableIds)];
    const groupId = input.groupId ?? crypto.randomUUID();

    const { data: rows, error: fetchError } = await supabase
      .from("restaurant_tables")
      .select(TABLE_SELECT)
      .eq("restaurant_id", input.restaurantId)
      .in("id", uniqueIds);

    if (fetchError) throw fetchError;
    if ((rows ?? []).length !== uniqueIds.length) {
      throw new Error("TABLE_NOT_FOUND");
    }

    for (const row of rows ?? []) {
      const current = mapTable(row as TableRow);
      if (
        current.status !== "available" &&
        current.status !== "reserved"
      ) {
        throw new Error("TABLE_NOT_AVAILABLE");
      }
    }

    const updated: RestaurantTable[] = [];
    for (const tableId of uniqueIds) {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .update({
          status: "reserved",
          reservation_guest_name: input.guestName,
          reservation_party_size: input.partySize,
          reservation_occasion: input.occasion,
          reservation_scheduled_at: input.scheduledAt,
          reservation_group_id: groupId,
        })
        .eq("id", tableId)
        .eq("restaurant_id", input.restaurantId)
        .select(TABLE_SELECT)
        .single();

      if (error) throw error;
      updated.push(mapTable(data as TableRow));
    }

    return updated;
  }

  async cancelReservationForTable(
    restaurantId: string,
    tableId: string,
  ): Promise<RestaurantTable[]> {
    const supabase = await createSupabaseServerClient();
    const table = await this.getTableById(tableId, restaurantId);
    if (!table) throw new Error("TABLE_NOT_FOUND");
    if (table.status !== "reserved" || !table.reservation) {
      throw new Error("RESERVATION_NOT_FOUND");
    }

    const groupId = table.reservation.groupId;
    let tableIds = [tableId];

    if (groupId) {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("reservation_group_id", groupId);
      if (error) throw error;
      tableIds = (data ?? []).map((row) => row.id as string);
    }

    const updated: RestaurantTable[] = [];
    for (const id of tableIds) {
      const row = await this.updateTableStatus(id, restaurantId, "available");
      updated.push(row);
    }
    return updated;
  }

  async deleteTable(id: string, restaurantId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("restaurant_tables")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);

    if (error) throw error;
  }

  async getTableById(
    id: string,
    restaurantId: string,
  ): Promise<RestaurantTable | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select(TABLE_SELECT)
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapTable(data as TableRow);
  }
}
