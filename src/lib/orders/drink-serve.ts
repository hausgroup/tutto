import type {
  PreparationStation,
  Product,
  ProductCategory,
} from "@/lib/catalog/types";
import type {
  DrinkServeTiming,
  OrderItem,
  OrderItemStatus,
  OrderStatus,
} from "@/lib/orders/types";

export { type DrinkServeTiming } from "@/lib/orders/types";

export const DRINK_SERVE_LABELS: Record<
  DrinkServeTiming,
  { title: string; hint: string }
> = {
  immediate: {
    title: "Enseguida",
    hint: "Llévalo en cuanto envíes el pedido a barra",
  },
  with_meal: {
    title: "Comida",
    hint: "Servir junto con el resto del pedido",
  },
};

export function isBarBeverageProduct(station: PreparationStation): boolean {
  return station === "bar";
}

const POS_BAR_CATEGORY =
  /bebida|bebidas|cocktail|cocktails|c[oó]ctel|c[oó]cteles|bar|licor|vino|cerveza|drink/i;

export function categoryNameIsPosBarDrink(categoryName: string): boolean {
  const normalized = categoryName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  return POS_BAR_CATEGORY.test(normalized);
}

export function catalogProductIsPosBarDrink(
  product:
    | Pick<Product, "preparationStation" | "categoryId">
    | undefined
    | null,
  categories: Pick<ProductCategory, "id" | "name">[],
): boolean {
  if (!product) return false;
  if (isBarBeverageProduct(product.preparationStation)) return true;
  if (!product.categoryId) return false;
  const category = categories.find((c) => c.id === product.categoryId);
  return category ? categoryNameIsPosBarDrink(category.name) : false;
}

export function resolveServeTiming(
  product:
    | Pick<Product, "preparationStation" | "categoryId">
    | undefined
    | null,
  categories: Pick<ProductCategory, "id" | "name">[],
  timing?: DrinkServeTiming,
): DrinkServeTiming | null {
  if (!catalogProductIsPosBarDrink(product, categories)) return null;
  return timing ?? "immediate";
}

export function initialItemStatusForServeTiming(
  _serveTiming: DrinkServeTiming | null,
  _isPosBarDrink: boolean,
): OrderItemStatus {
  return "pending";
}

export function deriveOrderStatusFromItems(
  items: OrderItem[],
  current: OrderStatus,
): OrderStatus {
  if (current === "completed" || current === "voided") return current;
  const active = items.filter(
    (item) => item.status !== "cancelled" && item.quantity > 0,
  );
  if (active.length === 0) return "open";
  const hasSent = active.some((item) => item.status !== "pending");
  return hasSent ? "in_progress" : "open";
}

export function orderItemServeHint(item: OrderItem): string | null {
  if (!item.serveTiming) return null;
  return DRINK_SERVE_LABELS[item.serveTiming].title;
}

export function isBarOrderLine(
  item: OrderItem,
  product:
    | Pick<Product, "preparationStation" | "categoryId">
    | undefined
    | null,
  categories: Pick<ProductCategory, "id" | "name">[],
): boolean {
  if (item.serveTiming != null) return true;
  if (item.preparationStation === "bar") return true;
  return catalogProductIsPosBarDrink(product, categories);
}

export function canMoveBarUnitToWithMeal(
  item: OrderItem,
  product:
    | Pick<Product, "preparationStation" | "categoryId">
    | undefined
    | null,
  categories: Pick<ProductCategory, "id" | "name">[],
): boolean {
  if (!isBarOrderLine(item, product, categories)) return false;
  if (item.serveTiming === "with_meal") return false;
  if (item.modifiers.length > 0) return false;
  if (item.quantity <= 0) return false;
  if (item.status === "cancelled" || item.status === "delivered") return false;
  return item.status === "pending" || item.status === "sent";
}

/** POS trash control — pending kitchen lines and enseguida bar lines (sent on add). */
export function canRemoveLineFromPosTicket(item: OrderItem): boolean {
  if (item.status === "cancelled" || item.status === "delivered") return false;
  if (item.quantity <= 0) return false;
  return item.status === "pending" || item.status === "sent";
}

export function isWithMealBarLine(
  item: OrderItem,
  product:
    | Pick<Product, "preparationStation" | "categoryId">
    | undefined
    | null,
  categories: Pick<ProductCategory, "id" | "name">[],
): boolean {
  if (!isBarOrderLine(item, product, categories)) return false;
  return (
    item.serveTiming === "with_meal" &&
    item.quantity > 0 &&
    item.status !== "cancelled"
  );
}

export function isEnseguidaServePool(
  timing: DrinkServeTiming | null | undefined,
): boolean {
  return timing !== "with_meal";
}

/** Same product + enseguida pool (null/immediate), including sent bar lines. */
export function enseguidaLinesMatch(
  item: OrderItem,
  productId: string,
  serveTiming?: DrinkServeTiming | null,
): boolean {
  if (item.productId !== productId) return false;
  if (item.modifiers.length > 0) return false;
  if (item.serveTiming === "with_meal") return false;
  if (!isEnseguidaServePool(serveTiming)) return false;
  if (item.status !== "pending" && item.status !== "sent") return false;
  return true;
}

export function pendingLinesMatch(
  item: OrderItem,
  productId: string,
  serveTiming: DrinkServeTiming | null | undefined,
): boolean {
  return linesMatchForQuantityAdjust(item, productId, serveTiming, 1);
}

/** Match lines for +/- qty (with_meal adds merge pending only; removes include sent). */
export function linesMatchForQuantityAdjust(
  item: OrderItem,
  productId: string,
  serveTiming: DrinkServeTiming | null | undefined,
  delta: number,
): boolean {
  if (item.productId !== productId || item.modifiers.length > 0) return false;
  if (serveTiming === "with_meal") {
    if (item.serveTiming !== "with_meal") return false;
    if (delta > 0) return item.status === "pending";
    return canRemoveLineFromPosTicket(item);
  }
  if (item.serveTiming === "with_meal") return false;
  if (!isEnseguidaServePool(serveTiming)) return false;
  if (delta > 0) return item.status === "pending";
  return item.status === "pending" || item.status === "sent";
}

export function withMealLinesMatch(
  item: OrderItem,
  productId: string,
): boolean {
  if (item.productId !== productId) return false;
  if (item.serveTiming !== "with_meal") return false;
  if (item.modifiers.length > 0) return false;
  if (item.status === "cancelled" || item.quantity <= 0) return false;
  return true;
}

/** Prefer pending with-meal line when merging moved units. */
export function findWithMealLineToMerge(
  items: OrderItem[],
  productId: string,
): OrderItem | undefined {
  const matches = items.filter((item) => withMealLinesMatch(item, productId));
  if (matches.length === 0) return undefined;
  return matches.find((item) => item.status === "pending") ?? matches[0];
}
