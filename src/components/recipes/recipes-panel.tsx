"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChefHat,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";
import type { Product } from "@/lib/catalog/types";
import {
  deleteRecipeAction,
  saveRecipeAction,
} from "@/lib/inventory/actions";
import {
  foodCostPercent,
  grossMarginPercent,
  recipeCostMinor,
} from "@/lib/inventory/recipe-cost";
import type { Ingredient, InventorySnapshot, Recipe } from "@/lib/inventory/types";
import { formatCurrency } from "@/lib/utils/money";
import { PageHeaderActions } from "@/components/layout/page-header-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoftStat } from "@/components/ui/soft";

const RECIPE_CARD_GRID =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4";

type LineDraft = {
  ingredientId: string;
  quantity: string;
  wastagePercent: string;
};

function emptyLine(ingredients: Ingredient[]): LineDraft {
  return {
    ingredientId: ingredients[0]?.id ?? "",
    quantity: "1",
    wastagePercent: "0",
  };
}

function RecipeEditorDialog({
  restaurantId,
  products,
  ingredients,
  recipe,
  productIdPreset,
  canManage,
}: {
  restaurantId: string;
  products: Product[];
  ingredients: Ingredient[];
  recipe?: Recipe;
  productIdPreset?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(
    recipe?.productId ?? productIdPreset ?? products[0]?.id ?? "",
  );
  const [lines, setLines] = useState<LineDraft[]>(
    recipe?.lines.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: String(line.quantity),
      wastagePercent: String(line.wastageBps / 100),
    })) ?? [emptyLine(ingredients)],
  );
  const [pending, startTransition] = useTransition();

  function reset() {
    setProductId(recipe?.productId ?? productIdPreset ?? products[0]?.id ?? "");
    setLines(
      recipe?.lines.map((line) => ({
        ingredientId: line.ingredientId,
        quantity: String(line.quantity),
        wastagePercent: String(line.wastageBps / 100),
      })) ?? [emptyLine(ingredients)],
    );
  }

  function save() {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      toast.error("Elige un producto del menú");
      return;
    }
    const parsedLines = lines
      .filter((l) => l.ingredientId && Number(l.quantity) > 0)
      .map((l) => ({
        ingredientId: l.ingredientId,
        quantity: Number(l.quantity),
        wastageBps: Math.round(Number(l.wastagePercent || "0") * 100),
      }));
    if (parsedLines.length === 0) {
      toast.error("Agrega al menos un ingrediente");
      return;
    }

    startTransition(async () => {
      const result = await saveRecipeAction({
        restaurantId,
        productId,
        name: product.name,
        lines: parsedLines,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success(recipe ? "Receta actualizada" : "Receta creada");
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!canManage) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        {recipe || productIdPreset ? (
          <Button variant="outline" size="sm">
            {recipe ? (
              <>
                <Pencil className="size-4" />
                Editar
              </>
            ) : (
              <>
                <Plus className="size-4" />
                Crear receta
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="size-4" />
            Nueva receta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {recipe ? "Editar receta" : "Nueva receta"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>Producto del menú</Label>
            <Select
              value={productId}
              onValueChange={setProductId}
              disabled={Boolean(recipe)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Producto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ingredientes</Label>
            {lines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_80px_72px_36px] gap-2 items-end"
              >
                <Select
                  value={line.ingredientId}
                  onValueChange={(value) => {
                    const next = [...lines];
                    next[index] = { ...line, ingredientId: value };
                    setLines(next);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients
                      .filter((i) => i.isActive)
                      .map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.001"
                  min={0}
                  placeholder="Cant."
                  value={line.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...line, quantity: e.target.value };
                    setLines(next);
                  }}
                />
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="% merma"
                  value={line.wastagePercent}
                  onChange={(e) => {
                    const next = [...lines];
                    next[index] = { ...line, wastagePercent: e.target.value };
                    setLines(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={lines.length <= 1}
                  onClick={() =>
                    setLines(lines.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines([...lines, emptyLine(ingredients)])}
            >
              <Plus className="size-4" />
              Línea
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={pending || ingredients.length === 0}>
            Guardar receta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

export function RecipesPanel({
  restaurantId,
  inventory,
  products,
  canManage,
}: {
  restaurantId: string;
  inventory: InventorySnapshot;
  products: Product[];
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

  const defaultTab =
    inventory.recipes.length === 0 && withoutRecipe.length > 0
      ? "pending"
      : "recipes";

  return (
    <div className="w-full space-y-8">
      <PageHeaderActions>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/products">
              <UtensilsCrossed className="size-4" />
              Menú
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory">
              <Warehouse className="size-4" />
              Inventario
            </Link>
          </Button>
          {canManage ? (
            <RecipeEditorDialog
              restaurantId={restaurantId}
              products={menuProducts}
              ingredients={inventory.ingredients}
              canManage={canManage}
            />
          ) : null}
        </div>
      </PageHeaderActions>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SoftStat
          index={0}
          icon={ClipboardList}
          label="Fichas técnicas"
          value={inventory.recipes.length}
          hint={`${menuProducts.length} productos activos en menú`}
        />
        <SoftStat
          index={3}
          icon={AlertTriangle}
          label="Sin receta"
          value={withoutRecipe.length}
          hint={
            withoutRecipe.length > 0
              ? "Vincula insumos para descontar inventario"
              : "Todos los ítems activos tienen ficha"
          }
        />
        <SoftStat
          index={1}
          icon={ChefHat}
          label="Food cost medio"
          value={
            avgFoodCostPercent != null ? `${avgFoodCostPercent}%` : "—"
          }
          hint={
            avgFoodCostPercent != null
              ? "Promedio sobre ítems con precio"
              : "Agrega precio en el menú para calcular"
          }
        />
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full max-w-none justify-start sm:w-auto">
          <TabsTrigger value="recipes">
            Fichas técnicas
            {inventory.recipes.length > 0 ? (
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                ({inventory.recipes.length})
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Sin receta
            {withoutRecipe.length > 0 ? (
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                ({withoutRecipe.length})
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="mt-4 w-full">
          {inventory.recipes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay recetas. Crea una para vincular ventas con inventario.
            </p>
          ) : (
            <div className={RECIPE_CARD_GRID}>
              {inventory.recipes.map((recipe) => {
                const product = products.find((p) => p.id === recipe.productId);
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
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 w-full">
          {withoutRecipe.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todos los productos activos del menú tienen ficha técnica.
            </p>
          ) : (
            <div className={RECIPE_CARD_GRID}>
              {withoutRecipe.map((product) => (
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
                      className="-mx-4 -mb-4 mt-3 flex items-center justify-center border-t border-border/60 px-4 py-3"
                    >
                      <RecipeEditorDialog
                        restaurantId={restaurantId}
                        products={menuProducts}
                        ingredients={inventory.ingredients}
                        productIdPreset={product.id}
                        canManage={canManage}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
