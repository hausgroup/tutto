import type { AllergenId } from "@/lib/catalog/allergens";
import { MENU_ALLERGENS } from "@/lib/catalog/allergens";
import type { PreparationStation, Product } from "@/lib/catalog/types";

const STATION_SEARCH: Record<PreparationStation, string> = {
  kitchen: "cocina comida plato",
  bar: "bar bebida cocktail cóctel drink vino cerveza",
  dessert: "postre dessert dulce",
  other: "otra otras",
};

export function normalizeMenuSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function tokenizeQuery(query: string): string[] {
  const normalized = normalizeMenuSearchText(query);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

function allergenSearchText(ids: AllergenId[]): string {
  const labels = ids
    .map((id) => MENU_ALLERGENS.find((item) => item.id === id)?.label)
    .filter(Boolean);
  return normalizeMenuSearchText(labels.join(" "));
}

export function menuProductSearchHaystack(
  product: Product,
  categoryName: string | null,
): string {
  const parts = [
    product.name,
    product.description ?? "",
    product.sku ?? "",
    categoryName ?? "",
    STATION_SEARCH[product.preparationStation],
    allergenSearchText(product.allergens),
  ];
  return normalizeMenuSearchText(parts.join(" "));
}

function scoreProductMatch(haystack: string, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  let score = 0;
  for (const token of tokens) {
    if (!haystack.includes(token)) return 0;
    const index = haystack.indexOf(token);
    score += 10;
    if (index === 0) score += 8;
    if (token.length >= 4) score += 2;
  }
  return score;
}

/** Filters and ranks products for a menu search query (accent-insensitive, multi-token). */
export function filterMenuProductsByQuery(
  products: Product[],
  query: string,
  categoryNameById: Map<string, string>,
): Product[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return products;

  return products
    .map((product) => {
      const categoryName = product.categoryId
        ? categoryNameById.get(product.categoryId) ?? null
        : null;
      const haystack = menuProductSearchHaystack(product, categoryName);
      const score = scoreProductMatch(haystack, tokens);
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .map((entry) => entry.product);
}
