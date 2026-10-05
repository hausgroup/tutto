import type { Ingredient, Recipe } from "@/lib/inventory/types";

/** Recipe ingredient cost in minor units (includes wastage). */
export function recipeCostMinor(
  recipe: Recipe,
  ingredients: Ingredient[],
): number {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  let total = 0;
  for (const line of recipe.lines) {
    const ingredient = byId.get(line.ingredientId);
    if (!ingredient) continue;
    const wastageMultiplier = 1 + line.wastageBps / 10_000;
    total += Math.round(
      line.quantity * wastageMultiplier * ingredient.costMinorPerUnit,
    );
  }
  return total;
}

export function foodCostPercent(
  costMinor: number,
  priceMinor: number,
): number | null {
  if (priceMinor <= 0 || costMinor < 0) return null;
  return Math.round((costMinor / priceMinor) * 1000) / 10;
}

export function grossMarginPercent(
  costMinor: number,
  priceMinor: number,
): number | null {
  const fc = foodCostPercent(costMinor, priceMinor);
  if (fc == null) return null;
  return Math.round((100 - fc) * 10) / 10;
}
