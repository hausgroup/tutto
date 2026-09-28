import type { Product, ProductCategory } from "@/lib/catalog/types";
import { catalogProductIsPosBarDrink } from "@/lib/orders/drink-serve";
import type { OrderItem } from "@/lib/orders/types";

export type PrintStation = "kitchen" | "bar";

export function resolvePrintStationForItem(
  item: Pick<OrderItem, "productId" | "preparationStation">,
  product:
    | Pick<Product, "preparationStation" | "categoryId">
    | undefined
    | null,
  categories: Pick<ProductCategory, "id" | "name">[],
): PrintStation {
  if (catalogProductIsPosBarDrink(product, categories)) {
    return "bar";
  }
  if (item.preparationStation === "bar") {
    return "bar";
  }
  return "kitchen";
}

export function splitOrderItemsByPrintStation(
  items: OrderItem[],
  catalog: {
    products: Pick<
      Product,
      "id" | "preparationStation" | "categoryId"
    >[];
    categories: Pick<ProductCategory, "id" | "name">[];
  },
): Record<PrintStation, OrderItem[]> {
  const kitchen: OrderItem[] = [];
  const bar: OrderItem[] = [];
  for (const item of items) {
    if (item.status === "cancelled" || item.quantity <= 0) continue;
    const product = catalog.products.find((p) => p.id === item.productId);
    const station = resolvePrintStationForItem(item, product, catalog.categories);
    if (station === "bar") bar.push(item);
    else kitchen.push(item);
  }
  return { kitchen, bar };
}
