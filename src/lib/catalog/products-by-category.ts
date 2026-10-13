import type { Product, ProductCategory } from "@/lib/catalog/types";

export type ProductCategoryGroup<T> = {
  categoryId: string | null;
  title: string;
  items: T[];
};

/** Groups items by menu category order; empty categories omitted; uncategorised last. */
export function groupByProductCategory<T>(
  items: T[],
  categories: ProductCategory[],
  resolveCategoryId: (item: T) => string | null,
  compareItems?: (a: T, b: T) => number,
): ProductCategoryGroup<T>[] {
  const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const idSet = new Set(ordered.map((c) => c.id));
  const buckets = new Map<string | null, T[]>();
  for (const cat of ordered) buckets.set(cat.id, []);
  buckets.set(null, []);

  for (const item of items) {
    const catId = resolveCategoryId(item);
    const key = catId && idSet.has(catId) ? catId : null;
    buckets.get(key)!.push(item);
  }

  const cmp = compareItems ?? (() => 0);
  const out: ProductCategoryGroup<T>[] = [];

  for (const cat of ordered) {
    const bucket = buckets.get(cat.id)!;
    if (bucket.length === 0) continue;
    bucket.sort(cmp);
    out.push({ categoryId: cat.id, title: cat.name, items: bucket });
  }

  const uncategorized = buckets.get(null)!;
  if (uncategorized.length > 0) {
    uncategorized.sort(cmp);
    out.push({
      categoryId: null,
      title: "Sin categoría",
      items: uncategorized,
    });
  }

  return out;
}

export function compareProductsByName(a: Product, b: Product): number {
  return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
}
