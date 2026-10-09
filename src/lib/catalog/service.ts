import { cache } from "react";
import { randomUUID } from "node:crypto";
import { canUseDemoExperience } from "@/lib/env";
import { getDemoRestaurantStore } from "@/lib/demo/restaurant-store";
import type {
  CatalogSnapshot,
  Product,
  ProductCategory,
} from "@/lib/catalog/types";
import type {
  CreateCategoryInput,
  CreateProductInput,
  SetProductActiveInput,
  UpdateProductInput,
} from "@/lib/catalog/schemas";
import {
  fetchCatalogSnapshot,
  insertCategory,
  insertProduct,
  setProductActive as setProductActiveRow,
  updateProduct as updateProductRow,
} from "@/lib/catalog/supabase-repository";
import {
  getActiveMembership,
  PERMISSIONS,
  requirePermission,
  type AuthContext,
} from "@/lib/auth/permissions";

function assertRestaurant(context: AuthContext, restaurantId: string) {
  const membership = getActiveMembership(context, restaurantId);
  if (!membership) throw new Error("RESTAURANT_NOT_FOUND");
  return membership;
}

/** One catalog fetch per restaurant per request (React cache only — no
 *  unstable_cache: Supabase auth reads cookies and can't run inside it). */
const loadCatalogSnapshot = cache(
  async (restaurantId: string): Promise<CatalogSnapshot> => {
    if (canUseDemoExperience()) {
      return structuredClone(getDemoRestaurantStore().catalog);
    }
    return fetchCatalogSnapshot(restaurantId);
  },
);

export const catalogService = {
  async getSnapshot(
    context: AuthContext,
    restaurantId: string,
  ): Promise<CatalogSnapshot> {
    assertRestaurant(context, restaurantId);
    return loadCatalogSnapshot(restaurantId);
  },

  async listActiveProducts(
    context: AuthContext,
    restaurantId: string,
  ): Promise<Product[]> {
    const snapshot = await catalogService.getSnapshot(context, restaurantId);
    return snapshot.products.filter((p) => p.isActive);
  },

  canManage(context: AuthContext, restaurantId: string) {
    if (canUseDemoExperience()) return true;
    try {
      requirePermission(context, PERMISSIONS.PRODUCTS_MANAGE, restaurantId);
      return true;
    } catch {
      return false;
    }
  },

  async createCategory(
    context: AuthContext,
    input: CreateCategoryInput,
  ): Promise<ProductCategory> {
    requirePermission(context, PERMISSIONS.PRODUCTS_MANAGE, input.restaurantId);
    assertRestaurant(context, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const category: ProductCategory = {
        id: randomUUID(),
        restaurantId: input.restaurantId,
        name: input.name,
        sortOrder: store.catalog.categories.length + 1,
        isActive: true,
        preparationStation: input.preparationStation,
      };
      store.catalog.categories.push(category);
      return structuredClone(category);
    }

    return insertCategory({
      restaurantId: input.restaurantId,
      name: input.name,
      sortOrder: 0,
      preparationStation: input.preparationStation,
    });
  },

  async createProduct(
    context: AuthContext,
    input: CreateProductInput,
  ): Promise<Product> {
    requirePermission(context, PERMISSIONS.PRODUCTS_MANAGE, input.restaurantId);
    assertRestaurant(context, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const category = store.catalog.categories.find(
        (item) => item.id === input.categoryId,
      );
      if (!category) throw new Error("CATEGORY_NOT_FOUND");

      const product: Product = {
        id: randomUUID(),
        restaurantId: input.restaurantId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        allergens: input.allergens,
        sku: input.sku,
        priceMinor: input.priceMinor,
        costMinor: input.costMinor,
        taxRateBps: input.taxRateBps,
        isActive: true,
        trackInventory: input.trackInventory,
        preparationStation: input.preparationStation,
      };
      store.catalog.products.push(product);
      return structuredClone(product);
    }

    return insertProduct({
      restaurantId: input.restaurantId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      allergens: input.allergens,
      sku: input.sku,
      priceMinor: input.priceMinor,
      costMinor: input.costMinor,
      taxRateBps: input.taxRateBps,
      preparationStation: input.preparationStation,
      trackInventory: input.trackInventory,
    });
  },

  async updateProduct(
    context: AuthContext,
    input: UpdateProductInput,
  ): Promise<Product> {
    requirePermission(context, PERMISSIONS.PRODUCTS_MANAGE, input.restaurantId);
    assertRestaurant(context, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const product = store.catalog.products.find(
        (item) =>
          item.id === input.productId &&
          item.restaurantId === input.restaurantId,
      );
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      const category = store.catalog.categories.find(
        (item) => item.id === input.categoryId,
      );
      if (!category) throw new Error("CATEGORY_NOT_FOUND");

      Object.assign(product, {
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        allergens: input.allergens,
        sku: input.sku,
        priceMinor: input.priceMinor,
        costMinor: input.costMinor,
        taxRateBps: input.taxRateBps,
        preparationStation: input.preparationStation,
        trackInventory: input.trackInventory,
        isActive: input.isActive,
      });
      return structuredClone(product);
    }

    return updateProductRow({
      restaurantId: input.restaurantId,
      productId: input.productId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      allergens: input.allergens,
      sku: input.sku,
      priceMinor: input.priceMinor,
      costMinor: input.costMinor,
      taxRateBps: input.taxRateBps,
      preparationStation: input.preparationStation,
      trackInventory: input.trackInventory,
      isActive: input.isActive,
    });
  },

  async setProductActive(
    context: AuthContext,
    input: SetProductActiveInput,
  ): Promise<Product> {
    requirePermission(context, PERMISSIONS.PRODUCTS_MANAGE, input.restaurantId);
    assertRestaurant(context, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const product = store.catalog.products.find(
        (item) =>
          item.id === input.productId &&
          item.restaurantId === input.restaurantId,
      );
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      product.isActive = input.isActive;
      return structuredClone(product);
    }

    return setProductActiveRow(input);
  },
};
