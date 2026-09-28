import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Ingredient,
  InventoryMovement,
  InventoryMovementType,
  InventorySnapshot,
  Recipe,
  RecipeLine,
} from "@/lib/inventory/types";

type IngredientRow = {
  id: string;
  restaurant_id: string;
  name: string;
  unit: string;
  stock_quantity: number | string;
  min_stock_quantity: number | string;
  cost_minor_per_unit: number | string;
  is_active: boolean;
};

type MovementRow = {
  id: string;
  restaurant_id: string;
  ingredient_id: string;
  movement_type: InventoryMovementType;
  quantity_delta: number | string;
  unit_cost_minor: number | string;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
};

type RecipeRow = {
  id: string;
  restaurant_id: string;
  product_id: string;
  name: string;
};

type RecipeLineRow = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number | string;
  wastage_bps: number;
};

function mapIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    unit: row.unit,
    stockQuantity: Number(row.stock_quantity),
    minStockQuantity: Number(row.min_stock_quantity),
    costMinorPerUnit: Number(row.cost_minor_per_unit),
    isActive: row.is_active,
  };
}

function mapMovement(row: MovementRow): InventoryMovement {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    ingredientId: row.ingredient_id,
    movementType: row.movement_type,
    quantityDelta: Number(row.quantity_delta),
    unitCostMinor: Number(row.unit_cost_minor),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function fetchInventorySnapshot(
  restaurantId: string,
): Promise<InventorySnapshot> {
  const supabase = await createSupabaseServerClient();
  const [ingredientsRes, movementsRes, recipesRes] = await Promise.all([
    supabase
      .from("ingredients")
      .select(
        "id, restaurant_id, name, unit, stock_quantity, min_stock_quantity, cost_minor_per_unit, is_active",
      )
      .eq("restaurant_id", restaurantId)
      .order("name"),
    supabase
      .from("inventory_movements")
      .select(
        "id, restaurant_id, ingredient_id, movement_type, quantity_delta, unit_cost_minor, reference_type, reference_id, notes, created_at",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("recipes")
      .select("id, restaurant_id, product_id, name")
      .eq("restaurant_id", restaurantId),
  ]);

  if (ingredientsRes.error) throw ingredientsRes.error;
  if (movementsRes.error) throw movementsRes.error;
  if (recipesRes.error) throw recipesRes.error;

  const recipeRows = (recipesRes.data ?? []) as RecipeRow[];
  const linesByRecipe = new Map<string, RecipeLine[]>();
  const recipeIds = recipeRows.map((r) => r.id);

  if (recipeIds.length > 0) {
    const { data: lines, error: linesError } = await supabase
      .from("recipe_lines")
      .select("id, recipe_id, ingredient_id, quantity, wastage_bps")
      .in("recipe_id", recipeIds);
    if (linesError) throw linesError;
    for (const row of (lines ?? []) as RecipeLineRow[]) {
      const line: RecipeLine = {
        id: row.id,
        recipeId: row.recipe_id,
        ingredientId: row.ingredient_id,
        quantity: Number(row.quantity),
        wastageBps: row.wastage_bps,
      };
      const list = linesByRecipe.get(row.recipe_id) ?? [];
      list.push(line);
      linesByRecipe.set(row.recipe_id, list);
    }
  }

  const recipes: Recipe[] = recipeRows.map((r) => ({
    id: r.id,
    restaurantId: r.restaurant_id,
    productId: r.product_id,
    name: r.name,
    lines: linesByRecipe.get(r.id) ?? [],
  }));

  return {
    ingredients: ((ingredientsRes.data ?? []) as IngredientRow[]).map(
      mapIngredient,
    ),
    movements: ((movementsRes.data ?? []) as MovementRow[]).map(mapMovement),
    recipes,
  };
}

export async function adjustIngredientStock(input: {
  restaurantId: string;
  ingredientId: string;
  quantityDelta: number;
  notes?: string;
  userId: string;
}): Promise<Ingredient> {
  const supabase = await createSupabaseServerClient();
  const { data: ingredient, error: readError } = await supabase
    .from("ingredients")
    .select(
      "id, restaurant_id, name, unit, stock_quantity, min_stock_quantity, cost_minor_per_unit, is_active",
    )
    .eq("restaurant_id", input.restaurantId)
    .eq("id", input.ingredientId)
    .single();

  if (readError) throw readError;

  const current = Number((ingredient as IngredientRow).stock_quantity);
  const next = current + input.quantityDelta;
  if (next < 0) throw new Error("INSUFFICIENT_STOCK");

  const costMinor = Number((ingredient as IngredientRow).cost_minor_per_unit);

  const { error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
      restaurant_id: input.restaurantId,
      ingredient_id: input.ingredientId,
      movement_type: "adjustment",
      quantity_delta: input.quantityDelta,
      unit_cost_minor: costMinor,
      reference_type: "manual_adjustment",
      reference_id: null,
      notes: input.notes ?? null,
      created_by: input.userId,
    });

  if (movementError) throw movementError;

  const { data: updated, error: updateError } = await supabase
    .from("ingredients")
    .update({ stock_quantity: next })
    .eq("id", input.ingredientId)
    .eq("restaurant_id", input.restaurantId)
    .select(
      "id, restaurant_id, name, unit, stock_quantity, min_stock_quantity, cost_minor_per_unit, is_active",
    )
    .single();

  if (updateError) throw updateError;
  return mapIngredient(updated as IngredientRow);
}

export async function consumeProductRecipeStock(input: {
  restaurantId: string;
  productId: string;
  quantity: number;
  referenceId?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("consume_product_recipe_stock", {
    p_restaurant_id: input.restaurantId,
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_reference_id: input.referenceId ?? null,
  });
  if (error) throw error;
}
