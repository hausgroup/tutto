import { randomUUID } from "node:crypto";
import { canUseDemoExperience } from "@/lib/env";
import { getDemoRestaurantStore } from "@/lib/demo/restaurant-store";
import type { InventorySnapshot, Ingredient } from "@/lib/inventory/types";
import {
  adjustIngredientStock,
  consumeProductRecipeStock,
  fetchInventorySnapshot,
} from "@/lib/inventory/supabase-repository";
import {
  getActiveMembership,
  PERMISSIONS,
  requirePermission,
  type AuthContext,
} from "@/lib/auth/permissions";

export const inventoryService = {
  async getSnapshot(
    context: AuthContext,
    restaurantId: string,
  ): Promise<InventorySnapshot> {
    const membership = getActiveMembership(context, restaurantId);
    if (!membership) throw new Error("RESTAURANT_NOT_FOUND");
    if (canUseDemoExperience()) {
      return structuredClone(getDemoRestaurantStore().inventory);
    }
    return fetchInventorySnapshot(restaurantId);
  },

  async listLowStock(context: AuthContext, restaurantId: string) {
    const snapshot = await inventoryService.getSnapshot(context, restaurantId);
    return snapshot.ingredients.filter(
      (i) => i.isActive && i.stockQuantity <= i.minStockQuantity,
    );
  },

  async adjustStock(
    context: AuthContext,
    input: {
      restaurantId: string;
      ingredientId: string;
      quantityDelta: number;
      notes?: string;
    },
  ): Promise<Ingredient> {
    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const ingredient = store.inventory.ingredients.find(
        (i) => i.id === input.ingredientId,
      );
      if (!ingredient) throw new Error("INGREDIENT_NOT_FOUND");
      const next = ingredient.stockQuantity + input.quantityDelta;
      if (next < 0) throw new Error("INSUFFICIENT_STOCK");
      ingredient.stockQuantity = next;
      store.inventory.movements.unshift({
        id: randomUUID(),
        restaurantId: input.restaurantId,
        ingredientId: input.ingredientId,
        movementType: "adjustment",
        quantityDelta: input.quantityDelta,
        unitCostMinor: ingredient.costMinorPerUnit,
        referenceType: "manual_adjustment",
        referenceId: null,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
      });
      return structuredClone(ingredient);
    }

    requirePermission(context, PERMISSIONS.INVENTORY_MANAGE, input.restaurantId);
    return adjustIngredientStock({
      ...input,
      userId: context.userId,
    });
  },

  async consumeForProductSale(
    restaurantId: string,
    productId: string,
    quantity: number,
    referenceId?: string | null,
  ) {
    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const recipe = store.inventory.recipes.find(
        (r) => r.productId === productId,
      );
      if (!recipe) return;

      for (const line of recipe.lines) {
        const ingredient = store.inventory.ingredients.find(
          (i) => i.id === line.ingredientId,
        );
        if (!ingredient) continue;
        const wastageMultiplier = 1 + line.wastageBps / 10_000;
        const delta = -(line.quantity * quantity * wastageMultiplier);
        ingredient.stockQuantity = Math.max(0, ingredient.stockQuantity + delta);
        store.inventory.movements.unshift({
          id: randomUUID(),
          restaurantId,
          ingredientId: ingredient.id,
          movementType: "sale_consumption",
          quantityDelta: delta,
          unitCostMinor: ingredient.costMinorPerUnit,
          referenceType: "order_item",
          referenceId: referenceId ?? null,
          notes: null,
          createdAt: new Date().toISOString(),
        });
      }
      return;
    }

    await consumeProductRecipeStock({
      restaurantId,
      productId,
      quantity,
      referenceId,
    });
  },
};
