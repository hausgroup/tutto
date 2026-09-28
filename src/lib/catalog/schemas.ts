import { z } from "zod";

export const PREPARATION_STATIONS = [
  "kitchen",
  "bar",
  "dessert",
  "other",
] as const;

export const createCategorySchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
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

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
