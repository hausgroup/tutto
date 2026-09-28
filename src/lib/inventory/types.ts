export type InventoryMovementType =
  | "purchase"
  | "sale_consumption"
  | "waste"
  | "adjustment"
  | "transfer"
  | "return"
  | "stock_count";

export type Ingredient = {
  id: string;
  restaurantId: string;
  name: string;
  unit: string;
  stockQuantity: number;
  minStockQuantity: number;
  costMinorPerUnit: number;
  isActive: boolean;
};

export type InventoryMovement = {
  id: string;
  restaurantId: string;
  ingredientId: string;
  movementType: InventoryMovementType;
  quantityDelta: number;
  unitCostMinor: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
};

export type RecipeLine = {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  wastageBps: number;
};

export type Recipe = {
  id: string;
  restaurantId: string;
  productId: string;
  name: string;
  lines: RecipeLine[];
};

export type InventorySnapshot = {
  ingredients: Ingredient[];
  movements: InventoryMovement[];
  recipes: Recipe[];
};
