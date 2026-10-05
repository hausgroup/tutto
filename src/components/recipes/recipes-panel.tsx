"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Warehouse } from "lucide-react";
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
import { SoftSection, cosyPastel } from "@/components/ui/soft";
import { cn } from "@/lib/utils";

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

  const recipeByProduct = new Map(
    inventory.recipes.map((r) => [r.productId, r]),
  );
  const menuProducts = products.filter((p) => p.isActive);
  const withoutRecipe = menuProducts.filter((p) => !recipeByProduct.has(p.id));

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

  return (
    <div className="space-y-8">
      <PageHeaderActions>
        <div className="flex flex-wrap items-center justify-end gap-2">
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

      {withoutRecipe.length > 0 ? (
        <SoftSection title="Sin receta">
          <div className="flex flex-wrap gap-2">
            {withoutRecipe.map((product) => (
              <div key={product.id} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm ring-1 ring-border">
                <span>{product.name}</span>
                <RecipeEditorDialog
                  restaurantId={restaurantId}
                  products={menuProducts}
                  ingredients={inventory.ingredients}
                  productIdPreset={product.id}
                  canManage={canManage}
                />
              </div>
            ))}
          </div>
        </SoftSection>
      ) : null}

      <SoftSection title="Fichas técnicas">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {inventory.recipes.map((recipe, index) => {
            const product = products.find((p) => p.id === recipe.productId);
            const cost = recipeCostMinor(recipe, inventory.ingredients);
            const price = product?.priceMinor ?? 0;
            const fc = foodCostPercent(cost, price);
            const margin = grossMarginPercent(cost, price);

            return (
              <div
                key={recipe.id}
                className={cn(
                  "flex min-h-[180px] flex-col justify-between rounded-[20px] p-4",
                  index % 3 === 0
                    ? cosyPastel(index)
                    : "bg-card text-card-foreground ring-1 ring-border",
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] opacity-70">Receta</p>
                    {canManage ? (
                      <div className="flex gap-1">
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
                          disabled={pending}
                          onClick={() => removeRecipe(recipe.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-semibold leading-snug">
                    {product?.name ?? recipe.name}
                  </p>
                  <p className="mt-1 text-sm opacity-80">
                    Costo: {formatCurrency(cost)}
                    {price > 0 && fc != null ? (
                      <>
                        {" "}
                        · Food cost {fc}%
                        {margin != null ? ` · Margen ${margin}%` : ""}
                      </>
                    ) : null}
                  </p>
                </div>
                <ul className="mt-3 space-y-1 text-sm opacity-80">
                  {recipe.lines.map((line) => {
                    const ingredient = inventory.ingredients.find(
                      (i) => i.id === line.ingredientId,
                    );
                    return (
                      <li key={line.id}>
                        {ingredient?.name ?? "Insumo"}: {line.quantity}{" "}
                        {ingredient?.unit}
                        {line.wastageBps > 0
                          ? ` (+${line.wastageBps / 100}% merma)`
                          : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        {inventory.recipes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay recetas. Crea una para vincular ventas con inventario.
          </p>
        ) : null}
      </SoftSection>
    </div>
  );
}
