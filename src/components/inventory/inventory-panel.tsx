"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChefHat,
  Package,
  Pencil,
  Plus,
} from "lucide-react";
import {
  createIngredientAction,
  stockMovementAction,
  updateIngredientAction,
} from "@/lib/inventory/actions";
import type {
  Ingredient,
  InventoryMovement,
  InventorySnapshot,
} from "@/lib/inventory/types";
import { INGREDIENT_UNITS } from "@/lib/inventory/schemas";
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
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COSY_ACCENT,
  SoftChip,
  SoftSection,
  SoftStat,
  cosyPastel,
} from "@/components/ui/soft";
import { cn } from "@/lib/utils";

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: "Compra",
  sale_consumption: "Venta",
  waste: "Merma",
  adjustment: "Ajuste",
  transfer: "Traslado",
  return: "Devolución",
  stock_count: "Conteo",
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function IngredientStockDialog({
  ingredient,
  restaurantId,
  mode,
}: {
  ingredient: Ingredient;
  restaurantId: string;
  mode: "purchase" | "waste" | "count" | "adjust";
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const titles = {
    purchase: "Registrar compra",
    waste: "Registrar merma",
    count: "Conteo de inventario",
    adjust: "Ajuste manual",
  };

  function submit() {
    startTransition(async () => {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        toast.error("Cantidad inválida");
        return;
      }
      const payload =
        mode === "count"
          ? {
              restaurantId,
              ingredientId: ingredient.id,
              movementType: "stock_count" as const,
              targetQuantity: num,
              notes: notes || undefined,
            }
          : {
              restaurantId,
              ingredientId: ingredient.id,
              movementType:
                mode === "purchase"
                  ? ("purchase" as const)
                  : mode === "waste"
                    ? ("waste" as const)
                    : ("adjustment" as const),
              quantityDelta: num,
              notes: notes || undefined,
            };

      const result = await stockMovementAction(payload);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Stock actualizado");
        setOpen(false);
        setValue("");
        setNotes("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          {mode === "purchase"
            ? "Compra"
            : mode === "waste"
              ? "Merma"
              : mode === "count"
                ? "Conteo"
                : "Ajuste"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{ingredient.name}</p>
        <p className="text-sm">
          Stock actual:{" "}
          <strong>
            {ingredient.stockQuantity} {ingredient.unit}
          </strong>
        </p>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>
              {mode === "count"
                ? "Cantidad contada"
                : mode === "adjust"
                  ? "Cambio (+/-)"
                  : "Cantidad"}
            </Label>
            <Input
              type="number"
              step="0.001"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Proveedor, motivo…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={submit} disabled={pending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IngredientEditor({
  restaurantId,
  ingredient,
  canManage,
  onDone,
}: {
  restaurantId: string;
  ingredient?: Ingredient;
  canManage: boolean;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(ingredient?.name ?? "");
  const [unit, setUnit] = useState(ingredient?.unit ?? "g");
  const [minStock, setMinStock] = useState(ingredient?.minStockQuantity ?? 0);
  const [costMinor, setCostMinor] = useState(ingredient?.costMinorPerUnit ?? 0);
  const [initialStock, setInitialStock] = useState(0);
  const [isActive, setIsActive] = useState(ingredient?.isActive ?? true);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setName(ingredient?.name ?? "");
    setUnit(ingredient?.unit ?? "g");
    setMinStock(ingredient?.minStockQuantity ?? 0);
    setCostMinor(ingredient?.costMinorPerUnit ?? 0);
    setInitialStock(0);
    setIsActive(ingredient?.isActive ?? true);
  }

  function save() {
    startTransition(async () => {
      if (!name.trim()) {
        toast.error("Nombre requerido");
        return;
      }
      if (ingredient) {
        const result = await updateIngredientAction({
          restaurantId,
          ingredientId: ingredient.id,
          name: name.trim(),
          unit,
          minStockQuantity: minStock,
          costMinorPerUnit: costMinor,
          isActive,
        });
        if (result.error) toast.error(result.error);
        else {
          toast.success("Insumo actualizado");
          setOpen(false);
          onDone?.();
        }
      } else {
        const result = await createIngredientAction({
          restaurantId,
          name: name.trim(),
          unit,
          stockQuantity: initialStock,
          minStockQuantity: minStock,
          costMinorPerUnit: costMinor,
        });
        if (result.error) toast.error(result.error);
        else {
          toast.success("Insumo creado");
          setOpen(false);
          onDone?.();
        }
      }
    });
  }

  if (!canManage) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {ingredient ? (
          <Button variant="ghost" size="icon-sm" className="shrink-0">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="size-4" />
            Nuevo insumo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {ingredient ? "Editar insumo" : "Nuevo insumo"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stock mínimo</Label>
              <Input
                type="number"
                step="0.001"
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Costo por unidad (COP)</Label>
            <MoneyInput value={costMinor} onValueChange={setCostMinor} />
          </div>
          {!ingredient ? (
            <div className="space-y-2">
              <Label>Stock inicial (opcional)</Label>
              <Input
                type="number"
                step="0.001"
                value={initialStock}
                onChange={(e) => setInitialStock(Number(e.target.value))}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <Label>Activo en inventario</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={pending}>
            {ingredient ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryPanel({
  restaurantId,
  initialSnapshot,
  canManage,
}: {
  restaurantId: string;
  initialSnapshot: InventorySnapshot;
  canManage: boolean;
}) {
  const router = useRouter();
  const [filterIngredient, setFilterIngredient] = useState<string>("all");
  const snapshot = initialSnapshot;

  const ingredientById = useMemo(
    () => new Map(snapshot.ingredients.map((i) => [i.id, i])),
    [snapshot.ingredients],
  );

  const lowStock = snapshot.ingredients.filter(
    (i) => i.isActive && i.stockQuantity <= i.minStockQuantity,
  );

  const movements: InventoryMovement[] = useMemo(() => {
    const list = snapshot.movements;
    if (filterIngredient === "all") return list;
    return list.filter((m) => m.ingredientId === filterIngredient);
  }, [snapshot.movements, filterIngredient]);

  const activeIngredients = snapshot.ingredients.filter((i) => i.isActive);

  return (
    <div className="space-y-8">
      <PageHeaderActions>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/recipes">
              <ChefHat className="size-4" />
              Recetas
            </Link>
          </Button>
          {canManage ? (
            <IngredientEditor
              restaurantId={restaurantId}
              canManage={canManage}
              onDone={() => router.refresh()}
            />
          ) : null}
        </div>
      </PageHeaderActions>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SoftStat
          index={0}
          icon={Package}
          label="Insumos activos"
          value={activeIngredients.length}
          hint={`${snapshot.ingredients.length} en catálogo`}
        />
        <SoftStat
          index={3}
          icon={AlertTriangle}
          label="Stock bajo"
          value={lowStock.length}
          hint={
            lowStock.length > 0
              ? lowStock.map((i) => i.name).slice(0, 3).join(", ")
              : "Todo dentro del mínimo"
          }
        />
        <SoftStat
          index={1}
          label="Recetas"
          value={snapshot.recipes.length}
          hint="Productos con ficha técnica"
        />
      </div>

      {lowStock.length > 0 ? (
        <SoftSection title="Alertas">
          <div className="flex flex-wrap gap-2">
            {lowStock.map((item) => (
              <SoftChip key={item.id} className={COSY_ACCENT} active>
                {item.name}: {item.stockQuantity} {item.unit}
              </SoftChip>
            ))}
          </div>
        </SoftSection>
      ) : null}

      <Tabs defaultValue="ingredients">
        <TabsList>
          <TabsTrigger value="ingredients">Insumos</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {snapshot.ingredients.map((ingredient, index) => {
              const isLow =
                ingredient.isActive &&
                ingredient.stockQuantity <= ingredient.minStockQuantity;
              return (
                <div
                  key={ingredient.id}
                  className={cn(
                    "flex min-h-[200px] flex-col justify-between rounded-[20px] p-4",
                    !ingredient.isActive
                      ? "bg-muted/40 ring-1 ring-border opacity-70"
                      : isLow
                        ? cosyPastel(3)
                        : "bg-card text-card-foreground ring-1 ring-border",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] opacity-70">
                        Mín. {ingredient.minStockQuantity} {ingredient.unit}
                        {!ingredient.isActive ? " · Inactivo" : ""}
                      </p>
                      <IngredientEditor
                        restaurantId={restaurantId}
                        ingredient={ingredient}
                        canManage={canManage}
                        onDone={() => router.refresh()}
                      />
                    </div>
                    <p className="mt-2 text-base font-semibold leading-snug">
                      {ingredient.name}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                      {ingredient.stockQuantity}{" "}
                      <span className="text-sm font-medium opacity-70">
                        {ingredient.unit}
                      </span>
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                      Costo unit.: {formatCurrency(ingredient.costMinorPerUnit)}
                    </p>
                  </div>
                  {canManage && ingredient.isActive ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <IngredientStockDialog
                        ingredient={ingredient}
                        restaurantId={restaurantId}
                        mode="purchase"
                      />
                      <IngredientStockDialog
                        ingredient={ingredient}
                        restaurantId={restaurantId}
                        mode="waste"
                      />
                      <IngredientStockDialog
                        ingredient={ingredient}
                        restaurantId={restaurantId}
                        mode="count"
                      />
                      <IngredientStockDialog
                        ingredient={ingredient}
                        restaurantId={restaurantId}
                        mode="adjust"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-muted-foreground">Filtrar</Label>
            <Select
              value={filterIngredient}
              onValueChange={setFilterIngredient}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los insumos</SelectItem>
                {snapshot.ingredients.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-hidden rounded-[20px] ring-1 ring-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Insumo</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium text-right">Cambio</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Sin movimientos recientes.
                    </td>
                  </tr>
                ) : (
                  movements.map((movement) => {
                    const ing = ingredientById.get(movement.ingredientId);
                    return (
                      <tr
                        key={movement.id}
                        className="border-t border-border/60"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                          {formatWhen(movement.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          {ing?.name ?? movement.ingredientId}
                        </td>
                        <td className="px-4 py-2.5">
                          {MOVEMENT_LABELS[movement.movementType] ??
                            movement.movementType}
                          {movement.notes ? (
                            <span className="block text-xs text-muted-foreground">
                              {movement.notes}
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5 text-right tabular-nums font-medium",
                            movement.quantityDelta > 0
                              ? "text-emerald-700 dark:text-emerald-400"
                              : movement.quantityDelta < 0
                                ? "text-rose-700 dark:text-rose-400"
                                : "",
                          )}
                        >
                          {movement.quantityDelta > 0 ? "+" : ""}
                          {movement.quantityDelta}{" "}
                          <span className="text-xs font-normal opacity-70">
                            {ing?.unit}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
