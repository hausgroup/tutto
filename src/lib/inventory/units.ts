import { INGREDIENT_UNITS } from "@/lib/inventory/schemas";

/** Units shown when editing recipe lines (converted to each ingredient's stock unit on save). */
export const RECIPE_ENTRY_UNITS = [
  { id: "g", label: "g (gramos)", family: "mass" as const },
  { id: "kg", label: "kg", family: "mass" as const },
  { id: "mg", label: "mg", family: "mass" as const },
  { id: "oz", label: "oz", family: "mass" as const },
  { id: "lb", label: "lb", family: "mass" as const },
  { id: "ml", label: "ml", family: "volume" as const },
  { id: "cl", label: "cl", family: "volume" as const },
  { id: "L", label: "L", family: "volume" as const },
  { id: "unit", label: "ud (unidad)", family: "each" as const },
] as const;

export type RecipeEntryUnit = (typeof RECIPE_ENTRY_UNITS)[number]["id"];

const RECIPE_ENTRY_UNIT_IDS = new Set(
  RECIPE_ENTRY_UNITS.map((unit) => unit.id),
);

const MASS_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  mg: 0.001,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  cl: 10,
  L: 1000,
};

type UnitFamily = "mass" | "volume" | "each";

function unitFamily(unit: string): UnitFamily | null {
  if (unit === "unit") return "each";
  if (unit in MASS_TO_GRAMS) return "mass";
  if (unit in VOLUME_TO_ML) return "volume";
  return null;
}

export function isRecipeEntryUnit(unit: string): boolean {
  return RECIPE_ENTRY_UNIT_IDS.has(unit as RecipeEntryUnit);
}

export function defaultEntryUnitForIngredient(ingredientUnit: string): string {
  if (isRecipeEntryUnit(ingredientUnit)) return ingredientUnit;
  if (ingredientUnit === "kg") return "kg";
  if (ingredientUnit === "L") return "L";
  if (INGREDIENT_UNITS.includes(ingredientUnit as (typeof INGREDIENT_UNITS)[number])) {
    return ingredientUnit;
  }
  return "g";
}

/** Convert a quantity from an entry unit into the ingredient's inventory unit. */
export function convertQuantityToIngredientUnit(
  quantity: number,
  entryUnit: string,
  ingredientUnit: string,
): number | null {
  if (!Number.isFinite(quantity) || quantity < 0) return null;
  if (entryUnit === ingredientUnit) return quantity;

  const fromFamily = unitFamily(entryUnit);
  const toFamily = unitFamily(ingredientUnit);
  if (!fromFamily || !toFamily || fromFamily !== toFamily) return null;

  if (fromFamily === "each") return quantity;

  if (fromFamily === "mass") {
    const grams =
      quantity * (MASS_TO_GRAMS[entryUnit] ?? 0);
    const perIngredient = MASS_TO_GRAMS[ingredientUnit];
    if (!perIngredient) return null;
    return grams / perIngredient;
  }

  const ml = quantity * (VOLUME_TO_ML[entryUnit] ?? 0);
  const perIngredient = VOLUME_TO_ML[ingredientUnit];
  if (!perIngredient) return null;
  return ml / perIngredient;
}

/** Display quantity from inventory unit into the chosen entry unit. */
export function convertQuantityFromIngredientUnit(
  quantity: number,
  ingredientUnit: string,
  entryUnit: string,
): number | null {
  if (!Number.isFinite(quantity)) return null;
  if (entryUnit === ingredientUnit) return quantity;

  const fromFamily = unitFamily(ingredientUnit);
  const toFamily = unitFamily(entryUnit);
  if (!fromFamily || !toFamily || fromFamily !== toFamily) return null;

  if (fromFamily === "each") return quantity;

  if (fromFamily === "mass") {
    const grams = quantity * (MASS_TO_GRAMS[ingredientUnit] ?? 0);
    const perEntry = MASS_TO_GRAMS[entryUnit];
    if (!perEntry) return null;
    return grams / perEntry;
  }

  const ml = quantity * (VOLUME_TO_ML[ingredientUnit] ?? 0);
  const perEntry = VOLUME_TO_ML[entryUnit];
  if (!perEntry) return null;
  return ml / perEntry;
}
