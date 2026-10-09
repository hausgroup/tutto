import type { AllergenId } from "@/lib/catalog/allergens";

export type PreparationStation = "kitchen" | "bar" | "dessert" | "other";

export type ProductCategory = {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  preparationStation: PreparationStation;
};

export type Product = {
  id: string;
  restaurantId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  allergens: AllergenId[];
  sku: string | null;
  priceMinor: number;
  costMinor: number;
  taxRateBps: number;
  isActive: boolean;
  trackInventory: boolean;
  preparationStation: PreparationStation;
};

export type ProductModifier = {
  id: string;
  restaurantId: string;
  productId: string;
  name: string;
  priceMinorDelta: number;
  isActive: boolean;
  sortOrder: number;
};

export type CatalogSnapshot = {
  categories: ProductCategory[];
  products: Product[];
  modifiers: ProductModifier[];
};
