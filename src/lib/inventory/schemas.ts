import { z } from "zod";

export const INGREDIENT_UNITS = ["g", "kg", "ml", "L", "unit", "oz"] as const;

export const createIngredientSchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(120),
  unit: z.enum(INGREDIENT_UNITS),
  stockQuantity: z.number().min(0).default(0),
  minStockQuantity: z.number().min(0).default(0),
  costMinorPerUnit: z.number().int().min(0).default(0),
});

export const updateIngredientSchema = createIngredientSchema
  .omit({ stockQuantity: true })
  .extend({
    ingredientId: z.string().uuid(),
    isActive: z.boolean().optional(),
  });

export const stockMovementSchema = z.object({
  restaurantId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  movementType: z.enum([
    "purchase",
    "waste",
    "adjustment",
    "stock_count",
  ]),
  quantityDelta: z.number().optional(),
  targetQuantity: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const recipeLineInputSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number().positive(),
  wastageBps: z.number().int().min(0).max(10_000).default(0),
});

export const saveRecipeSchema = z.object({
  restaurantId: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string().min(1).max(120),
  lines: z.array(recipeLineInputSchema).min(1),
});
