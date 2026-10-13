"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Product, ProductCategory } from "@/lib/catalog/types";
import { saveRecipeAction } from "@/lib/inventory/actions";
import type { Ingredient, Recipe } from "@/lib/inventory/types";
import {
  convertQuantityFromIngredientUnit,
  convertQuantityToIngredientUnit,
  defaultEntryUnitForIngredient,
  RECIPE_ENTRY_UNITS,
} from "@/lib/inventory/units";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
  FormDialogTitle,
  formSelectTriggerClassName,
} from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  ModalForm,
  ModalFormField,
} from "@/components/ui/modal-form-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const recipeQtyUnitShellClass =
  "flex h-11 min-w-0 items-stretch overflow-hidden rounded-input bg-muted ring-1 ring-input-border transition-shadow focus-within:ring-2 focus-within:ring-ring [&_[data-slot=select-trigger]]:h-full [&_[data-slot=select-trigger]]:min-h-0 [&_[data-slot=select-trigger]]:[border-radius:0!important] [&_[data-slot=select-trigger]]:border-0 [&_[data-slot=select-trigger]]:shadow-none [&_[data-slot=select-trigger]]:ring-0";

const recipeQtyInputClass =
  "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-2 text-base shadow-none outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-0 md:text-sm tabular-nums";

const recipeUnitTriggerClass =
  "h-full w-full min-h-0 gap-1 rounded-none border-0 bg-transparent px-2 shadow-none ring-0 focus-visible:ring-0";

const recipeFreeDecimalInputClass =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

type LineDraft = {
  ingredientId: string;
  quantity: string;
  unit: string;
  wastagePercent: string;
};

function emptyLine(ingredients: Ingredient[]): LineDraft {
  const first = ingredients.find((item) => item.isActive) ?? ingredients[0];
  return {
    ingredientId: first?.id ?? "",
    quantity: "1",
    unit: first ? defaultEntryUnitForIngredient(first.unit) : "g",
    wastagePercent: "0",
  };
}

function lineFromRecipe(
  line: Recipe["lines"][number],
  ingredients: Ingredient[],
): LineDraft {
  const ingredient = ingredients.find((item) => item.id === line.ingredientId);
  const entryUnit = ingredient
    ? defaultEntryUnitForIngredient(ingredient.unit)
    : "g";
  const displayQty =
    ingredient &&
    convertQuantityFromIngredientUnit(
      line.quantity,
      ingredient.unit,
      entryUnit,
    );
  return {
    ingredientId: line.ingredientId,
    quantity: String(
      displayQty != null
        ? Number(displayQty.toPrecision(6))
        : line.quantity,
    ),
    unit: entryUnit,
    wastagePercent: String(line.wastageBps / 100),
  };
}

export function RecipeEditorDialog({
  restaurantId,
  products,
  categories,
  ingredients,
  recipe,
  productIdPreset,
  canManage,
}: {
  restaurantId: string;
  products: Product[];
  categories: ProductCategory[];
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
    recipe?.lines.length
      ? recipe.lines.map((line) => lineFromRecipe(line, ingredients))
      : [emptyLine(ingredients)],
  );
  const [pending, startTransition] = useTransition();

  const activeIngredients = useMemo(
    () => ingredients.filter((item) => item.isActive),
    [ingredients],
  );

  const ingredientById = useMemo(
    () => new Map(ingredients.map((item) => [item.id, item])),
    [ingredients],
  );

  const categoryByProductId = useMemo(() => {
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    return new Map(
      products.map((p) => [
        p.id,
        p.categoryId ? categoryMap.get(p.categoryId) ?? null : null,
      ]),
    );
  }, [categories, products]);

  function reset() {
    setProductId(recipe?.productId ?? productIdPreset ?? products[0]?.id ?? "");
    setLines(
      recipe?.lines.length
        ? recipe.lines.map((line) => lineFromRecipe(line, ingredients))
        : [emptyLine(ingredients)],
    );
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => {
      const next = [...current];
      const merged = { ...next[index]!, ...patch };
      if (patch.ingredientId) {
        const ingredient = ingredientById.get(patch.ingredientId);
        if (ingredient) {
          merged.unit = defaultEntryUnitForIngredient(ingredient.unit);
        }
      }
      next[index] = merged;
      return next;
    });
  }

  function save() {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      toast.error("Elige un producto del menú");
      return;
    }

    const parsedLines: {
      ingredientId: string;
      quantity: number;
      wastageBps: number;
    }[] = [];

    for (const line of lines) {
      if (!line.ingredientId) continue;
      const ingredient = ingredientById.get(line.ingredientId);
      if (!ingredient) continue;
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const converted = convertQuantityToIngredientUnit(
        qty,
        line.unit,
        ingredient.unit,
      );
      if (converted == null) {
        toast.error(
          `Unidad incompatible para ${ingredient.name}: usa ${ingredient.unit} o una unidad equivalente.`,
        );
        return;
      }
      parsedLines.push({
        ingredientId: line.ingredientId,
        quantity: converted,
        wastageBps: Math.round(Number(line.wastagePercent || "0") * 100),
      });
    }

    if (parsedLines.length === 0) {
      toast.error("Agrega al menos un ingrediente con cantidad válida");
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
        {recipe ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        ) : productIdPreset ? (
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-auto w-full justify-center gap-2 rounded-none rounded-b-[20px] border-0 py-3",
              "text-sm font-medium shadow-none",
              "hover:bg-muted/80 dark:hover:bg-muted/50",
            )}
          >
            <Plus className="size-4" />
            Crear receta
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="size-4" />
            Nueva receta
          </Button>
        )}
      </DialogTrigger>
      <FormDialogContent className="sm:max-w-xl">
        <FormDialogHeader>
          <FormDialogTitle>
            {recipe ? "Editar receta" : "Nueva receta"}
          </FormDialogTitle>
        </FormDialogHeader>
        <FormDialogBody>
          <ModalForm>
            <ModalFormField label="Producto del menú">
              <Select
                value={productId}
                onValueChange={setProductId}
                disabled={Boolean(recipe)}
              >
                <SelectTrigger className={formSelectTriggerClassName}>
                  <SelectValue placeholder="Producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {categoryByProductId.get(p.id)
                        ? ` · ${categoryByProductId.get(p.id)}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ModalFormField>

            <ModalFormField label="Ingredientes">
              <div className="space-y-2 rounded-input bg-muted/30 p-3 ring-1 ring-input-border">
                <div
                  className="hidden gap-2 px-1 text-[11px] text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,11.5rem)_4rem_2.25rem]"
                >
                  <span>Insumo</span>
                  <span>Cantidad</span>
                  <span className="text-center">Merma %</span>
                  <span />
                </div>

                {lines.map((line, index) => (
                  <div
                    key={index}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,11.5rem)_4rem_2.25rem] sm:items-center"
                  >
                    <Select
                      value={line.ingredientId}
                      onValueChange={(value) =>
                        updateLine(index, { ingredientId: value })
                      }
                    >
                      <SelectTrigger className={formSelectTriggerClassName}>
                        <SelectValue placeholder="Insumo" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeIngredients.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className={recipeQtyUnitShellClass}>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        aria-label="Cantidad"
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(index, { quantity: event.target.value })
                        }
                        className={cn(
                          recipeQtyInputClass,
                          recipeFreeDecimalInputClass,
                        )}
                      />
                      <div
                        className="w-px shrink-0 self-stretch bg-input-border"
                        aria-hidden
                      />
                      <div className="flex w-[7.25rem] shrink-0 self-stretch">
                        <Select
                          value={line.unit}
                          onValueChange={(value) =>
                            updateLine(index, { unit: value })
                          }
                        >
                          <SelectTrigger className={recipeUnitTriggerClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RECIPE_ENTRY_UNITS.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Input
                      type="text"
                      inputMode="decimal"
                      className={cn(
                        "text-center",
                        recipeFreeDecimalInputClass,
                      )}
                      aria-label="Merma porcentaje"
                      value={line.wastagePercent}
                      onChange={(event) =>
                        updateLine(index, {
                          wastagePercent: event.target.value,
                        })
                      }
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0"
                      disabled={lines.length <= 1}
                      onClick={() =>
                        setLines(lines.filter((_, i) => i !== index))
                      }
                      aria-label="Quitar línea"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1 w-full sm:w-auto"
                  onClick={() => setLines([...lines, emptyLine(ingredients)])}
                >
                  <Plus className="size-4" />
                  Agregar ingrediente
                </Button>
              </div>
            </ModalFormField>
          </ModalForm>
        </FormDialogBody>
        <FormDialogFooter>
          <Button
            onClick={save}
            disabled={pending || activeIngredients.length === 0}
          >
            Guardar receta
          </Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
