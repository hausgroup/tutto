import { randomUUID } from "node:crypto";
import { canUseDemoExperience } from "@/lib/env";
import { getDemoRestaurantStore } from "@/lib/demo/restaurant-store";
import type {
  Ingredient,
  InventoryMovementType,
  InventorySnapshot,
  Recipe,
} from "@/lib/inventory/types";
import {
  adjustIngredientStock,
  applyStockMovement,
  consumeProductRecipeStock,
  deleteRecipe,
  fetchInventorySnapshot,
  insertIngredient,
  saveRecipeWithLines,
  updateIngredientRow,
} from "@/lib/inventory/supabase-repository";
import {
  getActiveMembership,
  PERMISSIONS,
  requirePermission,
  type AuthContext,
} from "@/lib/auth/permissions";

function demoApplyMovement(
  store: ReturnType<typeof getDemoRestaurantStore>,
  input: {
    restaurantId: string;
    ingredientId: string;
    movementType: InventoryMovementType;
    quantityDelta: number;
    notes?: string;
  },
): Ingredient {
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
    movementType: input.movementType,
    quantityDelta: input.quantityDelta,
    unitCostMinor: ingredient.costMinorPerUnit,
    referenceType: "manual",
    referenceId: null,
    notes: input.notes ?? null,
    createdAt: new Date().toISOString(),
  });
  return structuredClone(ingredient);
}

export const inventoryService = {
  canManage(context: AuthContext, restaurantId: string) {
    const membership = getActiveMembership(context, restaurantId);
    if (!membership) return false;
    return membership.permissions.includes(PERMISSIONS.INVENTORY_MANAGE);
  },

  canManageRecipes(context: AuthContext, restaurantId: string) {
    const membership = getActiveMembership(context, restaurantId);
    if (!membership) return false;
    return membership.permissions.includes(PERMISSIONS.PRODUCTS_MANAGE);
  },

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

  async createIngredient(
    context: AuthContext,
    input: {
      restaurantId: string;
      name: string;
      unit: string;
      stockQuantity: number;
      minStockQuantity: number;
      costMinorPerUnit: number;
    },
  ): Promise<Ingredient> {
    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const ingredient: Ingredient = {
        id: randomUUID(),
        restaurantId: input.restaurantId,
        name: input.name,
        unit: input.unit,
        stockQuantity: 0,
        minStockQuantity: input.minStockQuantity,
        costMinorPerUnit: input.costMinorPerUnit,
        isActive: true,
      };
      store.inventory.ingredients.push(ingredient);
      if (input.stockQuantity > 0) {
        demoApplyMovement(store, {
          restaurantId: input.restaurantId,
          ingredientId: ingredient.id,
          movementType: "purchase",
          quantityDelta: input.stockQuantity,
          notes: "Stock inicial",
        });
      }
      return structuredClone(ingredient);
    }
    requirePermission(context, PERMISSIONS.INVENTORY_MANAGE, input.restaurantId);
    const created = await insertIngredient({
      ...input,
      stockQuantity: 0,
    });
    if (input.stockQuantity > 0) {
      await applyStockMovement({
        restaurantId: input.restaurantId,
        ingredientId: created.id,
        movementType: "purchase",
        quantityDelta: input.stockQuantity,
        notes: "Stock inicial",
        userId: context.userId,
      });
      return fetchInventorySnapshot(input.restaurantId).then(
        (s) =>
          s.ingredients.find((i) => i.id === created.id) ?? created,
      );
    }
    return created;
  },

  async updateIngredient(
    context: AuthContext,
    input: {
      restaurantId: string;
      ingredientId: string;
      name: string;
      unit: string;
      minStockQuantity: number;
      costMinorPerUnit: number;
      isActive?: boolean;
    },
  ): Promise<Ingredient> {
    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const ingredient = store.inventory.ingredients.find(
        (i) => i.id === input.ingredientId,
      );
      if (!ingredient) throw new Error("INGREDIENT_NOT_FOUND");
      ingredient.name = input.name;
      ingredient.unit = input.unit;
      ingredient.minStockQuantity = input.minStockQuantity;
      ingredient.costMinorPerUnit = input.costMinorPerUnit;
      if (input.isActive !== undefined) ingredient.isActive = input.isActive;
      return structuredClone(ingredient);
    }
    requirePermission(context, PERMISSIONS.INVENTORY_MANAGE, input.restaurantId);
    return updateIngredientRow(input);
  },

  async applyStockMovement(
    context: AuthContext,
    input: {
      restaurantId: string;
      ingredientId: string;
      movementType: InventoryMovementType;
      quantityDelta?: number;
      targetQuantity?: number;
      notes?: string;
    },
  ): Promise<Ingredient> {
    let quantityDelta = input.quantityDelta ?? 0;
    if (input.movementType === "stock_count") {
      if (input.targetQuantity == null) {
        throw new Error("TARGET_QUANTITY_REQUIRED");
      }
      const snapshot = await inventoryService.getSnapshot(
        context,
        input.restaurantId,
      );
      const current = snapshot.ingredients.find(
        (i) => i.id === input.ingredientId,
      );
      if (!current) throw new Error("INGREDIENT_NOT_FOUND");
      quantityDelta = input.targetQuantity - current.stockQuantity;
    }

    if (input.movementType === "waste" && quantityDelta > 0) {
      quantityDelta = -quantityDelta;
    }
    if (input.movementType === "purchase" && quantityDelta < 0) {
      quantityDelta = Math.abs(quantityDelta);
    }

    if (canUseDemoExperience()) {
      return demoApplyMovement(getDemoRestaurantStore(), {
        restaurantId: input.restaurantId,
        ingredientId: input.ingredientId,
        movementType: input.movementType,
        quantityDelta,
        notes: input.notes,
      });
    }

    requirePermission(context, PERMISSIONS.INVENTORY_MANAGE, input.restaurantId);
    if (input.movementType === "adjustment") {
      return adjustIngredientStock({
        restaurantId: input.restaurantId,
        ingredientId: input.ingredientId,
        quantityDelta,
        notes: input.notes,
        userId: context.userId,
      });
    }
    return applyStockMovement({
      restaurantId: input.restaurantId,
      ingredientId: input.ingredientId,
      movementType: input.movementType,
      quantityDelta,
      notes: input.notes,
      userId: context.userId,
    });
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
    return inventoryService.applyStockMovement(context, {
      ...input,
      movementType: "adjustment",
      quantityDelta: input.quantityDelta,
    });
  },

  async saveRecipe(
    context: AuthContext,
    input: {
      restaurantId: string;
      productId: string;
      name: string;
      lines: { ingredientId: string; quantity: number; wastageBps: number }[];
    },
  ): Promise<Recipe> {
    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const existing = store.inventory.recipes.find(
        (r) => r.productId === input.productId,
      );
      const recipeId = existing?.id ?? randomUUID();
      const lines = input.lines.map((line) => ({
        id: randomUUID(),
        recipeId,
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        wastageBps: line.wastageBps,
      }));
      const recipe: Recipe = {
        id: recipeId,
        restaurantId: input.restaurantId,
        productId: input.productId,
        name: input.name,
        lines,
      };
      if (existing) {
        const index = store.inventory.recipes.indexOf(existing);
        store.inventory.recipes[index] = recipe;
      } else {
        store.inventory.recipes.push(recipe);
      }
      return structuredClone(recipe);
    }
    requirePermission(context, PERMISSIONS.PRODUCTS_MANAGE, input.restaurantId);
    return saveRecipeWithLines(input);
  },

  async removeRecipe(
    context: AuthContext,
    restaurantId: string,
    recipeId: string,
  ) {
    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      store.inventory.recipes = store.inventory.recipes.filter(
        (r) => r.id !== recipeId,
      );
      return;
    }
    requirePermission(context, PERMISSIONS.PRODUCTS_MANAGE, restaurantId);
    await deleteRecipe(restaurantId, recipeId);
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
