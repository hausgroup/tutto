import { describe, expect, it } from "vitest";
import {
  convertQuantityToIngredientUnit,
  convertQuantityFromIngredientUnit,
} from "@/lib/inventory/units";

describe("convertQuantityToIngredientUnit", () => {
  it("converts kg entry to g inventory", () => {
    expect(convertQuantityToIngredientUnit(0.5, "kg", "g")).toBe(500);
  });

  it("converts ml entry to L inventory", () => {
    expect(convertQuantityToIngredientUnit(250, "ml", "L")).toBe(0.25);
  });

  it("rejects incompatible families", () => {
    expect(convertQuantityToIngredientUnit(100, "ml", "g")).toBeNull();
  });
});

describe("convertQuantityFromIngredientUnit", () => {
  it("shows grams when stock is in kg", () => {
    expect(convertQuantityFromIngredientUnit(0.5, "kg", "g")).toBe(500);
  });
});
