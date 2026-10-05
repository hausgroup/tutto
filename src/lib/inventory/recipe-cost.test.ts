import { describe, expect, it } from "vitest";
import {
  foodCostPercent,
  recipeCostMinor,
} from "@/lib/inventory/recipe-cost";
import type { Ingredient, Recipe } from "@/lib/inventory/types";

const ingredients: Ingredient[] = [
  {
    id: "a",
    restaurantId: "r",
    name: "Pan",
    unit: "unit",
    stockQuantity: 10,
    minStockQuantity: 2,
    costMinorPerUnit: 800,
    isActive: true,
  },
  {
    id: "b",
    restaurantId: "r",
    name: "Carne",
    unit: "g",
    stockQuantity: 1000,
    minStockQuantity: 100,
    costMinorPerUnit: 50,
    isActive: true,
  },
];

const recipe: Recipe = {
  id: "rec",
  restaurantId: "r",
  productId: "p",
  name: "Burger",
  lines: [
    { id: "l1", recipeId: "rec", ingredientId: "a", quantity: 1, wastageBps: 0 },
    {
      id: "l2",
      recipeId: "rec",
      ingredientId: "b",
      quantity: 150,
      wastageBps: 500,
    },
  ],
};

describe("recipeCostMinor", () => {
  it("sums line costs with wastage", () => {
    // 800 + 150 * 1.05 * 50 = 800 + 7875 = 8675
    expect(recipeCostMinor(recipe, ingredients)).toBe(8675);
  });
});

describe("foodCostPercent", () => {
  it("returns percent of price", () => {
    expect(foodCostPercent(8675, 28000)).toBeCloseTo(31, 0);
  });
});
