"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { RecipeEditorDialog } from "@/components/recipes/recipe-editor-dialog";
import {
  compareProductsByName,
  groupByProductCategory,
} from "@/lib/catalog/products-by-category";
import type { Product, ProductCategory } from "@/lib/catalog/types";
import { deleteRecipeAction } from "@/lib/inventory/actions";
import {
  foodCostPercent,
  grossMarginPercent,
  recipeCostMinor,
} from "@/lib/inventory/recipe-cost";
import type { Ingredient, InventorySnapshot, Recipe } from "@/lib/inventory/types";
import { formatCurrency } from "@/lib/utils/money";
import { Button as ArcButton } from "@/components/arc/button/button";
import { PageHeaderActions } from "@/components/layout/page-header-actions";
import { Button } from "@/components/ui/button";
import { PageStat, PageStatGrid } from "@/components/ui/page-stat";
import { SoftSection } from "@/components/ui/soft";

const RECIPE_CARD_GRID =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4";

type RecipesTab = "recipes" | "pending";

function ingredientPreview(
  recipe: Recipe,
  ingredients: Ingredient[],
  maxLines = 4,
) {
  const lines = recipe.lines.map((line) => {
    const ingredient = ingredients.find((i) => i.id === line.ingredientId);
    const wastage =
      line.wastageBps > 0 ? ` (+${line.wastageBps / 100}% merma)` : "";
    return `${ingredient?.name ?? "Insumo"}: ${line.quantity} ${ingredient?.unit ?? ""}${wastage}`;
  });
  const shown = lines.slice(0, maxLines);
  const rest = lines.length - shown.length;
  return { shown, rest };
}

function recipeProductName(
  recipe: Recipe,
  products: Product[],
): string {
  return products.find((p) => p.id === recipe.productId)?.name ?? recipe.name;
}

export function RecipesPanel({
  restaurantId,
  inventory,
  products,
  categories,
  canManage,
}: {
  restaurantId: string;
  inventory: InventorySnapshot;
  products: Product[];
  categories: ProductCategory[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const recipeByProduct = useMemo(
    () => new Map(inventory.recipes.map((r) => [r.productId, r])),
    [inventory.recipes],
  );
  const menuProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products],
  );
  const withoutRecipe = useMemo(
    () => menuProducts.filter((p) => !recipeByProduct.has(p.id)),
    [menuProducts, recipeByProduct],
  );

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const recipeGroups = useMemo(
    () =>
      groupByProductCategory(
        inventory.recipes,
        categories,
        (recipe) => productById.get(recipe.productId)?.categoryId ?? null,
        (a, b) =>
          recipeProductName(a, products).localeCompare(
            recipeProductName(b, products),
            "es",
            { sensitivity: "base" },
          ),
      ),
    [inventory.recipes, categories, productById, products],
  );

  const pendingGroups = useMemo(
    () =>
      groupByProductCategory(
        withoutRecipe,
        categories,
        (product) => product.categoryId,
        compareProductsByName,
      ),
    [withoutRecipe, categories],
  );

  const avgFoodCostPercent = useMemo(() => {
    const values: number[] = [];
    for (const recipe of inventory.recipes) {
      const product = products.find((p) => p.id === recipe.productId);
      const cost = recipeCostMinor(recipe, inventory.ingredients);
      const fc = foodCostPercent(cost, product?.priceMinor ?? 0);
      if (fc != null) values.push(fc);
    }
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
  }, [inventory.recipes, inventory.ingredients, products]);

  function removeRecipe(recipeId: string) {
    startTransition(async () => {
      const result = await deleteRecipeAction({ restaurantId, recipeId });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Receta eliminada");
        router.refresh();
      }
    });
  }

  const defaultTab: RecipesTab =
    inventory.recipes.length === 0 && withoutRecipe.length > 0
      ? "pending"
      : "recipes";
  const [tab, setTab] = useState<RecipesTab>(defaultTab);

  return (
    <div className="w-full space-y-8">
      {canManage ? (
        <PageHeaderActions>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RecipeEditorDialog
              restaurantId={restaurantId}
              products={menuProducts}
              categories={categories}
              ingredients={inventory.ingredients}
              canManage={canManage}
            />
          </div>
        </PageHeaderActions>
      ) : null}

      <PageStatGrid columns={3}>
        <PageStat
          label="Fichas técnicas"
          value={inventory.recipes.length}
          hint={`${menuProducts.length} productos activos en menú`}
        />
        <PageStat
          label="Sin receta"
          value={withoutRecipe.length}
          hint={
            withoutRecipe.length > 0
              ? "Vincula insumos para descontar inventario"
              : "Todos los ítems activos tienen ficha"
          }
        />
        <PageStat
          label="Food cost medio"
          value={avgFoodCostPercent != null ? `${avgFoodCostPercent}%` : "—"}
          hint={
            avgFoodCostPercent != null
              ? "Promedio sobre ítems con precio"
              : "Agrega precio en el menú para calcular"
          }
        />
      </PageStatGrid>

      <div className="flex w-full flex-col gap-5">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Vista de recetas"
        >
          <ArcButton
            type="button"
            role="tab"
            aria-selected={tab === "recipes"}
            variant={tab === "recipes" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("recipes")}
          >
            <span className="inline-flex items-center gap-1">
              Fichas técnicas
              {inventory.recipes.length > 0 ? (
                <span className="tabular-nums opacity-70">
                  ({inventory.recipes.length})
                </span>
              ) : null}
            </span>
          </ArcButton>
          <ArcButton
            type="button"
            role="tab"
            aria-selected={tab === "pending"}
            variant={tab === "pending" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("pending")}
          >
            <span className="inline-flex items-center gap-1">
              Sin receta
              {withoutRecipe.length > 0 ? (
                <span className="tabular-nums opacity-70">
                  ({withoutRecipe.length})
                </span>
              ) : null}
            </span>
          </ArcButton>
        </div>

        <div role="tabpanel" className="w-full">
          {tab === "recipes" ? (
            inventory.recipes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay recetas. Crea una para vincular ventas con inventario.
              </p>
            ) : (
              <div className="space-y-8">
                {recipeGroups.map((group) => (
                  <SoftSection key={group.categoryId ?? "uncategorized"} title={group.title}>
                    <div className={RECIPE_CARD_GRID}>
              {group.items.map((recipe) => {
                const product = productById.get(recipe.productId);
                const cost = recipeCostMinor(recipe, inventory.ingredients);
                const price = product?.priceMinor ?? 0;
                const fc = foodCostPercent(cost, price);
                const margin = grossMarginPercent(cost, price);
                const { shown, rest } = ingredientPreview(
                  recipe,
                  inventory.ingredients,
                );

                return (
                  <div
                    key={recipe.id}
                    className="flex min-h-[180px] flex-col justify-between rounded-[20px] bg-card p-4 text-card-foreground ring-1 ring-border"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-[11px] text-muted-foreground">
                          {recipe.lines.length}{" "}
                          {recipe.lines.length === 1 ? "insumo" : "insumos"}
                        </p>
                        {canManage ? (
                          <div className="-mt-1 -mr-1 flex shrink-0 gap-0.5">
                            <RecipeEditorDialog
                              restaurantId={restaurantId}
                              products={menuProducts}
                              categories={categories}
                              ingredients={inventory.ingredients}
                              recipe={recipe}
                              canManage={canManage}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={pending}
                              onClick={() => removeRecipe(recipe.id)}
                              aria-label="Eliminar receta"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-2 text-base font-semibold leading-snug">
                        {product?.name ?? recipe.name}
                      </p>
                      <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                        Venta {formatCurrency(price)} · Costo{" "}
                        {formatCurrency(cost)}
                      </p>
                      {price > 0 && fc != null ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Food cost {fc}%
                          {margin != null ? ` · Margen ${margin}%` : ""}
                        </p>
                      ) : null}
                      <ul className="mt-3 space-y-0.5 text-[11px] leading-snug text-muted-foreground">
                        {shown.map((line, i) => (
                          <li key={i} className="truncate">{line}</li>
                        ))}
                        {rest > 0 ? (
                          <li className="text-muted-foreground/80">
                            y {rest} más…
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                );
              })}
                    </div>
                  </SoftSection>
                ))}
              </div>
            )
          ) : null}

          {tab === "pending" ? (
            withoutRecipe.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todos los productos activos del menú tienen ficha técnica.
              </p>
            ) : (
              <div className="space-y-8">
                {pendingGroups.map((group) => (
                  <SoftSection key={group.categoryId ?? "uncategorized"} title={group.title}>
                    <div className={RECIPE_CARD_GRID}>
              {group.items.map((product) => (
                <div
                  key={product.id}
                  className="flex min-h-[150px] flex-col justify-between rounded-[20px] bg-muted/50 p-4 text-card-foreground ring-1 ring-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">
                      Pendiente
                    </p>
                    <p className="mt-2 text-base font-semibold leading-snug">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(product.priceMinor)}
                    </p>
                  </div>
                  {canManage ? (
                    <div
                      className="-mx-4 -mb-4 mt-3 overflow-hidden rounded-b-[20px] border-t border-border/60"
                    >
                      <RecipeEditorDialog
                        restaurantId={restaurantId}
                        products={menuProducts}
                        categories={categories}
                        ingredients={inventory.ingredients}
                        productIdPreset={product.id}
                        canManage={canManage}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
                    </div>
                  </SoftSection>
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
