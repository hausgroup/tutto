import { normalizeAllergenIds } from "@/lib/catalog/allergens";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CatalogSnapshot,
  PreparationStation,
  Product,
  ProductCategory,
  ProductModifier,
} from "@/lib/catalog/types";

type CategoryRow = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  preparation_station?: PreparationStation;
};

type ProductRow = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  price_minor: number | string;
  cost_minor: number | string;
  tax_rate_bps: number;
  is_active: boolean;
  track_inventory: boolean;
  preparation_station: PreparationStation;
  allergens?: string[] | null;
};

type ModifierRow = {
  id: string;
  restaurant_id: string;
  product_id: string;
  name: string;
  price_minor_delta: number | string;
  is_active: boolean;
  sort_order: number;
};

function mapCategory(row: CategoryRow): ProductCategory {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    preparationStation: row.preparation_station ?? "kitchen",
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    allergens: normalizeAllergenIds(row.allergens ?? []),
    sku: row.sku,
    priceMinor: Number(row.price_minor),
    costMinor: Number(row.cost_minor),
    taxRateBps: row.tax_rate_bps,
    isActive: row.is_active,
    trackInventory: row.track_inventory,
    preparationStation: row.preparation_station,
  };
}

function mapModifier(row: ModifierRow): ProductModifier {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    productId: row.product_id,
    name: row.name,
    priceMinorDelta: Number(row.price_minor_delta),
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export async function fetchCatalogSnapshot(
  restaurantId: string,
): Promise<CatalogSnapshot> {
  const supabase = await createSupabaseServerClient();
  const [categoriesRes, productsRes, modifiersRes] = await Promise.all([
    supabase
      .from("product_categories")
      .select(
        "id, restaurant_id, name, sort_order, is_active, preparation_station",
      )
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
    supabase
      .from("products")
      .select(
        "id, restaurant_id, category_id, name, description, allergens, sku, price_minor, cost_minor, tax_rate_bps, is_active, track_inventory, preparation_station",
      )
      .eq("restaurant_id", restaurantId)
      .order("name"),
    supabase
      .from("product_modifiers")
      .select(
        "id, restaurant_id, product_id, name, price_minor_delta, is_active, sort_order",
      )
      .eq("restaurant_id", restaurantId)
      .order("sort_order"),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (productsRes.error) throw productsRes.error;
  if (modifiersRes.error) throw modifiersRes.error;

  return {
    categories: ((categoriesRes.data ?? []) as CategoryRow[]).map(mapCategory),
    products: ((productsRes.data ?? []) as ProductRow[]).map(mapProduct),
    modifiers: ((modifiersRes.data ?? []) as ModifierRow[]).map(mapModifier),
  };
}

export async function fetchProductById(
  restaurantId: string,
  productId: string,
): Promise<Product | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, restaurant_id, category_id, name, description, allergens, sku, price_minor, cost_minor, tax_rate_bps, is_active, track_inventory, preparation_station",
    )
    .eq("restaurant_id", restaurantId)
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapProduct(data as ProductRow);
}

export async function fetchModifiersByIds(
  restaurantId: string,
  modifierIds: string[],
): Promise<ProductModifier[]> {
  if (modifierIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_modifiers")
    .select(
      "id, restaurant_id, product_id, name, price_minor_delta, is_active, sort_order",
    )
    .eq("restaurant_id", restaurantId)
    .in("id", modifierIds);

  if (error) throw error;
  return ((data ?? []) as ModifierRow[]).map(mapModifier);
}

export async function insertCategory(input: {
  restaurantId: string;
  name: string;
  sortOrder: number;
  preparationStation: PreparationStation;
}): Promise<ProductCategory> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_categories")
    .insert({
      restaurant_id: input.restaurantId,
      name: input.name,
      sort_order: input.sortOrder,
      is_active: true,
      preparation_station: input.preparationStation,
    })
    .select(
      "id, restaurant_id, name, sort_order, is_active, preparation_station",
    )
    .single();

  if (error) throw error;
  return mapCategory(data as CategoryRow);
}

export async function insertProduct(input: {
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  allergens: string[];
  sku: string | null;
  priceMinor: number;
  costMinor: number;
  taxRateBps: number;
  preparationStation: PreparationStation;
  trackInventory: boolean;
}): Promise<Product> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      restaurant_id: input.restaurantId,
      category_id: input.categoryId,
      name: input.name,
      description: input.description,
      allergens: input.allergens,
      sku: input.sku,
      price_minor: input.priceMinor,
      cost_minor: input.costMinor,
      tax_rate_bps: input.taxRateBps,
      preparation_station: input.preparationStation,
      track_inventory: input.trackInventory,
      is_active: true,
    })
    .select(
      "id, restaurant_id, category_id, name, description, allergens, sku, price_minor, cost_minor, tax_rate_bps, is_active, track_inventory, preparation_station",
    )
    .single();

  if (error) throw error;
  return mapProduct(data as ProductRow);
}

const productSelect =
  "id, restaurant_id, category_id, name, description, allergens, sku, price_minor, cost_minor, tax_rate_bps, is_active, track_inventory, preparation_station";

export async function updateProduct(input: {
  restaurantId: string;
  productId: string;
  categoryId: string;
  name: string;
  description: string | null;
  allergens: string[];
  sku: string | null;
  priceMinor: number;
  costMinor: number;
  taxRateBps: number;
  preparationStation: PreparationStation;
  trackInventory: boolean;
  isActive: boolean;
}): Promise<Product> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      category_id: input.categoryId,
      name: input.name,
      description: input.description,
      allergens: input.allergens,
      sku: input.sku,
      price_minor: input.priceMinor,
      cost_minor: input.costMinor,
      tax_rate_bps: input.taxRateBps,
      preparation_station: input.preparationStation,
      track_inventory: input.trackInventory,
      is_active: input.isActive,
    })
    .eq("id", input.productId)
    .eq("restaurant_id", input.restaurantId)
    .select(productSelect)
    .single();

  if (error) throw error;
  return mapProduct(data as ProductRow);
}

export async function setProductActive(input: {
  restaurantId: string;
  productId: string;
  isActive: boolean;
}): Promise<Product> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: input.isActive })
    .eq("id", input.productId)
    .eq("restaurant_id", input.restaurantId)
    .select(productSelect)
    .single();

  if (error) throw error;
  return mapProduct(data as ProductRow);
}
