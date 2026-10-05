"use server";

import { revalidatePath } from "next/cache";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import {
  createIngredientSchema,
  saveRecipeSchema,
  stockMovementSchema,
  updateIngredientSchema,
} from "@/lib/inventory/schemas";
import { inventoryService } from "@/lib/inventory/service";
import type { Ingredient, Recipe } from "@/lib/inventory/types";

export type InventoryActionState = {
  ok?: boolean;
  error?: string;
  ingredient?: Ingredient;
  recipe?: Recipe;
};

function mapError(error: unknown): InventoryActionState {
  if (error instanceof Error) {
    switch (error.message) {
      case "FORBIDDEN":
        return { error: "No tienes permiso para gestionar inventario." };
      case "RESTAURANT_NOT_FOUND":
        return { error: "Restaurante no encontrado." };
      case "INGREDIENT_NOT_FOUND":
        return { error: "Insumo no encontrado." };
      case "INSUFFICIENT_STOCK":
        return { error: "Stock insuficiente para esta operación." };
      case "TARGET_QUANTITY_REQUIRED":
        return { error: "Indica la cantidad contada." };
      default:
        return { error: "No pudimos completar la operación." };
    }
  }
  return { error: "No pudimos completar la operación." };
}

function revalidateInventory() {
  revalidatePath("/inventory");
  revalidatePath("/recipes");
  revalidatePath("/dashboard");
}

export async function createIngredientAction(
  input: unknown,
): Promise<InventoryActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = createIngredientSchema.parse(input);
    const ingredient = await inventoryService.createIngredient(context, parsed);
    revalidateInventory();
    return { ok: true, ingredient };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateIngredientAction(
  input: unknown,
): Promise<InventoryActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = updateIngredientSchema.parse(input);
    const ingredient = await inventoryService.updateIngredient(context, parsed);
    revalidateInventory();
    return { ok: true, ingredient };
  } catch (error) {
    return mapError(error);
  }
}

export async function stockMovementAction(
  input: unknown,
): Promise<InventoryActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = stockMovementSchema.parse(input);
    const ingredient = await inventoryService.applyStockMovement(context, {
      restaurantId: parsed.restaurantId,
      ingredientId: parsed.ingredientId,
      movementType: parsed.movementType,
      quantityDelta: parsed.quantityDelta,
      targetQuantity: parsed.targetQuantity,
      notes: parsed.notes,
    });
    revalidateInventory();
    return { ok: true, ingredient };
  } catch (error) {
    return mapError(error);
  }
}

export async function saveRecipeAction(
  input: unknown,
): Promise<InventoryActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = saveRecipeSchema.parse(input);
    const recipe = await inventoryService.saveRecipe(context, parsed);
    revalidateInventory();
    return { ok: true, recipe };
  } catch (error) {
    return mapError(error);
  }
}

export async function deleteRecipeAction(input: {
  restaurantId: string;
  recipeId: string;
}): Promise<InventoryActionState> {
  try {
    const context = await resolveAuthContext();
    await inventoryService.removeRecipe(
      context,
      input.restaurantId,
      input.recipeId,
    );
    revalidateInventory();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

/** @deprecated use stockMovementAction — kept for existing form */
export async function adjustInventoryAction(input: {
  ingredientId: string;
  quantityDelta: number;
  notes?: string;
}): Promise<InventoryActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("RESTAURANT_NOT_FOUND");
    const ingredient = await inventoryService.adjustStock(context, {
      restaurantId,
      ingredientId: input.ingredientId,
      quantityDelta: input.quantityDelta,
      notes: input.notes,
    });
    revalidateInventory();
    return { ok: true, ingredient };
  } catch (error) {
    return mapError(error);
  }
}
