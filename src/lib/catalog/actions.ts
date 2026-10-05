"use server";

import { revalidatePath } from "next/cache";
import { resolveAuthContext } from "@/lib/auth/resolve-context";
import {
  createCategorySchema,
  createProductSchema,
  setProductActiveSchema,
  updateProductSchema,
} from "@/lib/catalog/schemas";
import { catalogService } from "@/lib/catalog/service";
import type { Product, ProductCategory } from "@/lib/catalog/types";

export type CatalogActionState = {
  ok?: boolean;
  error?: string;
  product?: Product;
  category?: ProductCategory;
};

function mapError(error: unknown): CatalogActionState {
  if (error instanceof Error) {
    switch (error.message) {
      case "FORBIDDEN":
        return { error: "No tienes permiso para gestionar el menú." };
      case "RESTAURANT_NOT_FOUND":
        return { error: "Restaurante no encontrado." };
      case "CATEGORY_NOT_FOUND":
        return { error: "Categoría no encontrada." };
      case "PRODUCT_NOT_FOUND":
        return { error: "Producto no encontrado." };
      case "UNAUTHORIZED":
        return { error: "Debes iniciar sesión." };
      default:
        return { error: "No pudimos completar la operación." };
    }
  }
  return { error: "No pudimos completar la operación." };
}

function revalidateCatalog() {
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  revalidatePath("/recipes");
}

export async function createCategoryAction(
  input: unknown,
): Promise<CatalogActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = createCategorySchema.parse(input);
    const category = await catalogService.createCategory(context, parsed);
    revalidateCatalog();
    return { ok: true, category };
  } catch (error) {
    return mapError(error);
  }
}

export async function createProductAction(
  input: unknown,
): Promise<CatalogActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = createProductSchema.parse(input);
    const product = await catalogService.createProduct(context, parsed);
    revalidateCatalog();
    return { ok: true, product };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateProductAction(
  input: unknown,
): Promise<CatalogActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = updateProductSchema.parse(input);
    const product = await catalogService.updateProduct(context, parsed);
    revalidateCatalog();
    return { ok: true, product };
  } catch (error) {
    return mapError(error);
  }
}

export async function setProductActiveAction(
  input: unknown,
): Promise<CatalogActionState> {
  try {
    const context = await resolveAuthContext();
    const parsed = setProductActiveSchema.parse(input);
    const product = await catalogService.setProductActive(context, parsed);
    revalidateCatalog();
    return { ok: true, product };
  } catch (error) {
    return mapError(error);
  }
}
