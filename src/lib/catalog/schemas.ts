import { z } from "zod";
import { normalizeAllergenIds } from "@/lib/catalog/allergens";

export const PREPARATION_STATIONS = [
  "kitchen",
  "bar",
  "dessert",
  "other",
] as const;

export const createCategorySchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  preparationStation: z.enum(PREPARATION_STATIONS).default("kitchen"),
});

export const createProductSchema = z.object({
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
  allergens: z
    .array(z.string())
    .optional()
    .transform((value) => normalizeAllergenIds(value ?? [])),
  sku: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value ? value : null)),
  /** Price in pesos (same units as formatCurrency). */
  priceMinor: z.number().int().min(0).max(99_999_999),
  costMinor: z.number().int().min(0).max(99_999_999).default(0),
  /** Basis points: 800 = 8%, 1900 = 19%. */
  taxRateBps: z.number().int().min(0).max(10000).default(800),
  preparationStation: z.enum(PREPARATION_STATIONS).default("kitchen"),
  trackInventory: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.extend({
  productId: z.string().uuid(),
  isActive: z.boolean(),
});

export const setProductActiveSchema = z.object({
  restaurantId: z.string().uuid(),
  productId: z.string().uuid(),
  isActive: z.boolean(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SetProductActiveInput = z.infer<typeof setProductActiveSchema>;
