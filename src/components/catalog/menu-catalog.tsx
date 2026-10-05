"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Coffee,
  CupSoda,
  IceCream,
  Pencil,
  Plus,
  Soup,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  createCategoryAction,
  createProductAction,
  setProductActiveAction,
  updateProductAction,
} from "@/lib/catalog/actions";
import type {
  CatalogSnapshot,
  PreparationStation,
  Product,
} from "@/lib/catalog/types";
import { invalidatePosCatalogCache } from "@/lib/pos/client-cache";
import { formatCurrency } from "@/lib/utils/money";
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
import { PageHeaderActions } from "@/components/layout/page-header-actions";
import { SoftSection, cosyPastel } from "@/components/ui/soft";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: LucideIcon[] = [
  Coffee,
  Soup,
  UtensilsCrossed,
  CupSoda,
  IceCream,
];

const TAX_OPTIONS = [
  { bps: 0, label: "0%" },
  { bps: 800, label: "8%" },
  { bps: 1900, label: "19%" },
] as const;

const STATION_OPTIONS: { value: PreparationStation; label: string }[] = [
  { value: "kitchen", label: "Cocina" },
  { value: "bar", label: "Bar" },
  { value: "dessert", label: "Postres" },
  { value: "other", label: "Otra" },
];

function stationLabel(station: string) {
  return (
    STATION_OPTIONS.find((option) => option.value === station)?.label ??
    "Cocina"
  );
}

export function MenuCatalog({
  restaurantId,
  initialSnapshot,
  canManage,
}: {
  restaurantId: string;
  initialSnapshot: CatalogSnapshot;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [productOpen, setProductOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [categoryStation, setCategoryStation] =
    useState<PreparationStation>("kitchen");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState(
    initialSnapshot.categories[0]?.id ?? "",
  );
  const [priceMinor, setPriceMinor] = useState(0);
  const [taxRateBps, setTaxRateBps] = useState(800);
  const [station, setStation] = useState<PreparationStation>("kitchen");
  const [visibleOnMenu, setVisibleOnMenu] = useState(true);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  const categories = useMemo(
    () => [...snapshot.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [snapshot.categories],
  );

  function stationForCategory(catId: string): PreparationStation {
    return (
      categories.find((category) => category.id === catId)
        ?.preparationStation ?? "kitchen"
    );
  }

  function resetCategoryForm() {
    setCategoryName("");
    setCategoryStation("kitchen");
  }

  function resetProductForm() {
    setEditingProduct(null);
    setName("");
    setSku("");
    setPriceMinor(0);
    setTaxRateBps(800);
    const defaultCategoryId = categories[0]?.id ?? "";
    setCategoryId(defaultCategoryId);
    setStation(
      defaultCategoryId
        ? stationForCategory(defaultCategoryId)
        : "kitchen",
    );
    setVisibleOnMenu(true);
  }

  function onProductCategoryChange(catId: string) {
    setCategoryId(catId);
    if (!editingProduct) {
      setStation(stationForCategory(catId));
    }
  }

  function openProductEditor(product: Product) {
    setEditingProduct(product);
    setName(product.name);
    setSku(product.sku ?? "");
    setCategoryId(product.categoryId ?? categories[0]?.id ?? "");
    setPriceMinor(product.priceMinor);
    setTaxRateBps(product.taxRateBps);
    setStation(product.preparationStation);
    setVisibleOnMenu(product.isActive);
    setProductOpen(true);
  }

  function replaceProductInSnapshot(product: Product) {
    setSnapshot((current) => ({
      ...current,
      products: current.products.map((item) =>
        item.id === product.id ? product : item,
      ),
    }));
  }

  function createCategory() {
    if (!categoryName.trim()) return;
    startTransition(async () => {
      const result = await createCategoryAction({
        restaurantId,
        name: categoryName.trim(),
        preparationStation: categoryStation,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.category) {
        setSnapshot((current) => ({
          ...current,
          categories: [...current.categories, result.category!],
        }));
        setCategoryId(result.category.id);
      }
      invalidatePosCatalogCache();
      toast.success("Categoría creada");
      resetCategoryForm();
      setCategoryOpen(false);
      router.refresh();
    });
  }

  function saveProduct() {
    if (!name.trim() || !categoryId) return;
    startTransition(async () => {
      if (editingProduct) {
        const result = await updateProductAction({
          restaurantId,
          productId: editingProduct.id,
          categoryId,
          name: name.trim(),
          description: editingProduct.description ?? undefined,
          sku: sku.trim() || undefined,
          priceMinor,
          costMinor: editingProduct.costMinor,
          taxRateBps,
          preparationStation: station,
          trackInventory: editingProduct.trackInventory,
          isActive: visibleOnMenu,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.product) {
          replaceProductInSnapshot(result.product);
        }
        invalidatePosCatalogCache();
        toast.success("Producto actualizado");
      } else {
        const result = await createProductAction({
          restaurantId,
          categoryId,
          name: name.trim(),
          sku: sku.trim() || undefined,
          priceMinor,
          costMinor: 0,
          taxRateBps,
          preparationStation: station,
          trackInventory: false,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.product) {
          setSnapshot((current) => ({
            ...current,
            products: [...current.products, result.product!],
          }));
        }
        invalidatePosCatalogCache();
        toast.success("Producto agregado al menú");
      }
      resetProductForm();
      setProductOpen(false);
      router.refresh();
    });
  }

  function toggleProductOnMenu(product: Product, onMenu: boolean) {
    startTransition(async () => {
      const result = await setProductActiveAction({
        restaurantId,
        productId: product.id,
        isActive: onMenu,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.product) {
        replaceProductInSnapshot(result.product);
      }
      invalidatePosCatalogCache();
      toast.message(onMenu ? "Visible en el menú" : "Oculto del menú");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <PageHeaderActions>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/recipes">Recetas</Link>
          </Button>
          {canManage ? (
            <>
              <Dialog
                open={categoryOpen}
                onOpenChange={(open) => {
                  setCategoryOpen(open);
                  if (!open) resetCategoryForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetCategoryForm()}
                  >
                    <Plus className="size-4" />
                    Categoría
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva categoría</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Nombre</Label>
                      <Input
                        id="category-name"
                        value={categoryName}
                        onChange={(event) => setCategoryName(event.target.value)}
                        placeholder="Ej. Entradas"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estación de pedidos</Label>
                      <Select
                        value={categoryStation}
                        onValueChange={(value) =>
                          setCategoryStation(value as PreparationStation)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATION_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Los productos nuevos en esta categoría usarán esta
                        estación por defecto (Cocina, Bar, etc.).
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      disabled={pending || !categoryName.trim()}
                      onClick={createCategory}
                    >
                      Crear categoría
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog
                open={productOpen}
                onOpenChange={(open) => {
                  setProductOpen(open);
                  if (!open) resetProductForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetProductForm()}
                  >
                    <Plus className="size-4" />
                    Producto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? "Editar producto" : "Agregar al menú"}
                    </DialogTitle>
                  </DialogHeader>
                  {categories.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">
                      Crea una categoría primero para organizar el producto.
                    </p>
                  ) : (
                    <div className="grid gap-3 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="product-name">Nombre</Label>
                        <Input
                          id="product-name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Ej. Classic Burger"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Select
                          value={categoryId}
                          onValueChange={onProductCategoryChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Elige categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product-price">Precio (COP)</Label>
                        <MoneyInput
                          id="product-price"
                          value={priceMinor}
                          onValueChange={setPriceMinor}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Impuesto</Label>
                          <Select
                            value={String(taxRateBps)}
                            onValueChange={(value) =>
                              setTaxRateBps(Number(value))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TAX_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.bps}
                                  value={String(option.bps)}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Estación</Label>
                          <Select
                            value={station}
                            onValueChange={(value) =>
                              setStation(value as PreparationStation)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATION_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product-sku">SKU (opcional)</Label>
                        <Input
                          id="product-sku"
                          value={sku}
                          onChange={(event) => setSku(event.target.value)}
                          placeholder="BRG-001"
                        />
                      </div>
                      {editingProduct ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium">En el menú</p>
                            <p className="text-xs text-muted-foreground">
                              {visibleOnMenu
                                ? "Visible en POS y pedidos"
                                : "Oculto; no aparece al tomar pedidos"}
                            </p>
                          </div>
                          <Switch
                            checked={visibleOnMenu}
                            onCheckedChange={setVisibleOnMenu}
                            disabled={pending}
                            aria-label="Mostrar en el menú"
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                  <DialogFooter>
                    <Button
                      variant="outline"
                      disabled={
                        pending ||
                        categories.length === 0 ||
                        !name.trim() ||
                        !categoryId
                      }
                      onClick={saveProduct}
                    >
                      {editingProduct ? "Guardar cambios" : "Agregar producto"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : null}
        </div>
      </PageHeaderActions>

      <SoftSection title="Categorías">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay categorías. Agrega una para empezar el menú.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {categories.map((category, index) => {
              const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]!;
              const count = snapshot.products.filter(
                (p) => p.categoryId === category.id,
              ).length;
              return (
                <div
                  key={category.id}
                  className={cn(
                    "flex min-h-[108px] flex-col items-start justify-between rounded-[20px] p-4",
                    cosyPastel(index),
                  )}
                >
                  <Icon className="size-5 opacity-80" aria-hidden />
                  <div>
                    <p className="text-base font-semibold leading-tight">
                      {category.name}
                    </p>
                    <p className="mt-0.5 text-xs opacity-70">
                      {stationLabel(category.preparationStation)} ·{" "}
                      {count} {count === 1 ? "ítem" : "ítems"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SoftSection>

      {categories.map((category) => {
        const products = snapshot.products.filter(
          (p) => p.categoryId === category.id,
        );
        if (products.length === 0) return null;
        return (
          <SoftSection key={category.id} title={category.name}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      "flex min-h-[150px] flex-col justify-between rounded-[20px] p-4",
                      product.isActive
                        ? "bg-card text-card-foreground ring-1 ring-border"
                        : "bg-muted/60 text-muted-foreground ring-1 ring-border",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-[11px] text-muted-foreground">
                          {stationLabel(product.preparationStation)}
                        </p>
                        {canManage ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="-mt-1 -mr-1 h-7 shrink-0 px-2 text-xs"
                            onClick={() => openProductEditor(product)}
                          >
                            <Pencil className="size-3.5" />
                            Editar
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-2 text-base font-semibold leading-snug">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(product.priceMinor)}
                      </p>
                      <p className="mt-2 truncate text-[11px] text-muted-foreground">
                        {product.sku ?? "Sin SKU"}
                      </p>
                    </div>
                    {canManage ? (
                      <div
                        className="-mx-4 mt-3 flex items-center justify-between gap-2 border-t border-border/60 px-4 pt-2"
                      >
                        <Label
                          htmlFor={`menu-visible-${product.id}`}
                          className="text-[11px] font-normal text-muted-foreground"
                        >
                          En el menú
                        </Label>
                        <Switch
                          id={`menu-visible-${product.id}`}
                          size="sm"
                          checked={product.isActive}
                          disabled={pending}
                          onCheckedChange={(checked) =>
                            toggleProductOnMenu(product, checked)
                          }
                          aria-label={`${product.name}, visible en el menú`}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
          </SoftSection>
        );
      })}
    </div>
  );
}
