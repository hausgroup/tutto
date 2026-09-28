"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthContext } from "@/lib/auth/resolve-context";
import {
  floorAreaInputSchema,
  floorAreaUpdateSchema,
  tableInputSchema,
  tableLayoutSchema,
  tablePropertiesSchema,
  tableStatusSchema,
} from "@/lib/floor/schemas";
import type {
  FloorArea,
  RestaurantTable,
} from "@/lib/floor/types";
import { floorService } from "@/lib/floor/service";

export type FloorActionState = {
  ok?: boolean;
  error?: string;
  table?: RestaurantTable;
  area?: FloorArea;
};

function revalidateFloorPaths() {
  revalidatePath("/floor");
  revalidatePath("/floor/editor");
  revalidatePath("/dashboard");
}

function mapError(error: unknown): FloorActionState {
  if (error instanceof Error) {
    switch (error.message) {
      case "FORBIDDEN":
        return { error: "No tienes permiso para esta acción." };
      case "AREA_NOT_EMPTY":
        return {
          error: "No puedes eliminar un área que todavía tiene mesas.",
        };
      case "UNAUTHORIZED":
        return { error: "Debes iniciar sesión." };
      default:
        return { error: "No pudimos completar la operación. Intenta de nuevo." };
    }
  }
  return { error: "No pudimos completar la operación. Intenta de nuevo." };
}

export async function createFloorAreaAction(
  _prev: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = floorAreaInputSchema.parse({
      restaurantId: formData.get("restaurantId"),
      name: formData.get("name"),
    });
    const area = await floorService.createArea(context, parsed);
    revalidateFloorPaths();
    return { ok: true, area };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateFloorAreaAction(
  _prev: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = floorAreaUpdateSchema.parse({
      id: formData.get("id"),
      restaurantId: formData.get("restaurantId"),
      name: formData.get("name"),
    });
    await floorService.updateArea(context, parsed);
    revalidateFloorPaths();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function deleteFloorAreaAction(input: {
  id: string;
  restaurantId: string;
}): Promise<FloorActionState> {
  try {
    const context = await resolveAuthContext();
    await floorService.deleteArea(context, input.id, input.restaurantId);
    revalidateFloorPaths();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function createTableAction(
  _prev: FloorActionState,
  formData: FormData,
): Promise<FloorActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = tableInputSchema.parse({
      restaurantId: formData.get("restaurantId"),
      floorAreaId: formData.get("floorAreaId"),
      label: formData.get("label"),
      capacity: Number(formData.get("capacity")),
      shape: formData.get("shape"),
    });
    const table = await floorService.createTable(context, parsed);
    revalidateFloorPaths();
    return { ok: true, table };
  } catch (error) {
    return mapError(error);
  }
}

export async function saveTableLayoutAction(
  input: unknown,
): Promise<FloorActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = tableLayoutSchema.parse(input);
    await floorService.updateTableLayout(context, parsed);
    // Only refresh the live salón — not the editor (avoids slow RSC round-trip on drag).
    revalidatePath("/floor");
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function saveTablePropertiesAction(
  input: unknown,
): Promise<FloorActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = tablePropertiesSchema.parse(input);
    await floorService.updateTableProperties(context, parsed);
    revalidateFloorPaths();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function saveTableStatusAction(
  input: unknown,
): Promise<FloorActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = tableStatusSchema.parse(input);
    await floorService.updateTableStatus(
      context,
      parsed.id,
      parsed.restaurantId,
      parsed.status,
    );
    revalidateFloorPaths();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function deleteTableAction(input: {
  id: string;
  restaurantId: string;
}): Promise<FloorActionState> {
  try {
    const context = await resolveAuthContext();
    await floorService.deleteTable(context, input.id, input.restaurantId);
    revalidateFloorPaths();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}
