"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

function mapPostgresFailure(error: unknown): FloorActionState | null {
  const code = errorCode(error);
  const message = errorMessage(error);

  if (code === "PGRST204" || message.includes("reservation_scheduled_at")) {
    return {
      error:
        "Falta aplicar la migración reservation_scheduled_at en Supabase.",
    };
  }

  if (code === "23505" || message.includes("duplicate key")) {
    if (
      message.includes("floor_area_label") ||
      message.includes("floor_area_id")
    ) {
      return { error: "Ya hay una mesa con esa etiqueta en esta zona." };
    }
    return {
      error:
        "Ya hay una mesa con esa etiqueta en otra zona. Usa un nombre distinto (por ejemplo A1, A2) o aplica en Supabase la migración table_label_unique_per_area.",
    };
  }

  if (code === "42501" || message.toLowerCase().includes("permission denied")) {
    return { error: "No tienes permiso para gestionar mesas." };
  }

  return null;
}

function mapError(error: unknown): FloorActionState {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    return {
      error:
        first?.message ??
        "Revisa los datos del formulario e intenta de nuevo.",
    };
  }

  const postgres = mapPostgresFailure(error);
  if (postgres) return postgres;

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
      case "AREA_NOT_FOUND":
        return { error: "No encontramos esa zona del salón." };
      case "TABLE_LABEL_TAKEN_IN_AREA":
        return { error: "Ya hay una mesa con esa etiqueta en esta zona." };
      case "TABLE_LABEL_TAKEN_OTHER_ZONE":
        return {
          error:
            "Esa etiqueta ya la usa una mesa en otra zona. Elige otro nombre (por ejemplo A1) o aplica la migración de etiquetas por zona en Supabase.",
        };
      default: {
        const fromMessage = mapPostgresFailure(error);
        if (fromMessage) return fromMessage;
        if (process.env.NODE_ENV === "development") {
          console.error("[floor action]", error);
        }
        return { error: "No pudimos completar la operación. Intenta de nuevo." };
      }
    }
  }

  const fallback = mapPostgresFailure(error);
  if (fallback) return fallback;
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

const reorderFloorAreasSchema = z.object({
  restaurantId: z.string().uuid(),
  orderedAreaIds: z.array(z.string().uuid()).min(1),
});

export async function reorderFloorAreasAction(
  input: z.infer<typeof reorderFloorAreasSchema>,
): Promise<FloorActionState> {
  try {
    const parsed = reorderFloorAreasSchema.parse(input);
    const context = await resolveAuthContext();
    for (let index = 0; index < parsed.orderedAreaIds.length; index++) {
      const id = parsed.orderedAreaIds[index]!;
      await floorService.updateArea(context, {
        id,
        restaurantId: parsed.restaurantId,
        sortOrder: index + 1,
      });
    }
    revalidateFloorPaths();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function renameFloorAreaAction(input: {
  id: string;
  restaurantId: string;
  name: string;
}): Promise<FloorActionState> {
  const formData = new FormData();
  formData.set("id", input.id);
  formData.set("restaurantId", input.restaurantId);
  formData.set("name", input.name);
  return updateFloorAreaAction({}, formData);
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
