"use client";

import type { ReactNode } from "react";
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
import {
  MENU_ALLERGENS,
  type AllergenId,
} from "@/lib/catalog/allergens";
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
import { Textarea } from "@/components/ui/textarea";
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

/** Match `Input` height and surface in product form. */
const MENU_SELECT_TRIGGER_CLASS =
  "h-11 w-full rounded-2xl border-0 bg-muted shadow-none ring-1 ring-border focus:ring-2 focus:ring-ring data-[size=default]:h-11 dark:bg-muted";

const MENU_TEXTAREA_CLASS =
  "min-h-[5rem] resize-none rounded-2xl border-0 bg-muted ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring dark:bg-muted";

function MenuFormField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-normal text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

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
  const [description, setDescription] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenId[]>(
    [],
  );
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
    setDescription("");
    setSelectedAllergens([]);
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
    setDescription(product.description ?? "");
    setSelectedAllergens(product.allergens ?? []);
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
          description: description.trim() || undefined,
          allergens: selectedAllergens,
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
          description: description.trim() || undefined,
          allergens: selectedAllergens,
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
                <DialogContent
                  className="flex max-h-[min(92dvh,36rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
                >
                  <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
                    <DialogTitle className="text-base font-semibold">
                      {editingProduct ? "Editar producto" : "Nuevo producto"}
                    </DialogTitle>
                  </DialogHeader>
                  {categories.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">
                      Crea una categoría primero.
                    </p>
                  ) : (
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                      <MenuFormField label="Nombre" htmlFor="product-name">
                        <Input
                          id="product-name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Classic Burger"
                          autoFocus
                        />
                      </MenuFormField>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <MenuFormField label="Categoría">
                          <Select
                            value={categoryId}
                            onValueChange={onProductCategoryChange}
                          >
                            <SelectTrigger className={MENU_SELECT_TRIGGER_CLASS}>
                              <SelectValue placeholder="Categoría" />
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
                        </MenuFormField>
                        <MenuFormField label="Precio (COP)" htmlFor="product-price">
                          <MoneyInput
                            id="product-price"
                            value={priceMinor}
                            onValueChange={setPriceMinor}
                          />
                        </MenuFormField>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <MenuFormField label="Impuesto">
                          <Select
                            value={String(taxRateBps)}
                            onValueChange={(value) =>
                              setTaxRateBps(Number(value))
                            }
                          >
                            <SelectTrigger className={MENU_SELECT_TRIGGER_CLASS}>
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
                        </MenuFormField>
                        <MenuFormField label="Estación">
                          <Select
                            value={station}
                            onValueChange={(value) =>
                              setStation(value as PreparationStation)
                            }
                          >
                            <SelectTrigger className={MENU_SELECT_TRIGGER_CLASS}>
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
                        </MenuFormField>
                        <MenuFormField label="SKU" htmlFor="product-sku">
                          <Input
                            id="product-sku"
                            value={sku}
                            onChange={(event) => setSku(event.target.value)}
                            placeholder="Opcional"
                          />
                        </MenuFormField>
                      </div>

                      <MenuFormField
                        label="Descripción"
                        htmlFor="product-description"
                      >
                        <Textarea
                          id="product-description"
                          value={description}
                          onChange={(event) =>
                            setDescription(event.target.value)
                          }
                          placeholder="Ingredientes y notas (opcional)"
                          maxLength={500}
                          rows={3}
                          className={MENU_TEXTAREA_CLASS}
                        />
                      </MenuFormField>

                      <div className="space-y-2 border-t border-border/60 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs font-normal text-muted-foreground">
                            Alérgenos
                          </Label>
                          {selectedAllergens.length > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {selectedAllergens.length}
                            </span>
                          ) : null}
                        </div>
                        <ul
                          className="max-h-36 space-y-0.5 overflow-y-auto pr-1 sm:columns-2 sm:gap-x-4"
                        >
                          {MENU_ALLERGENS.map((allergen) => {
                            const checked = selectedAllergens.includes(
                              allergen.id,
                            );
                            return (
                              <li
                                key={allergen.id}
                                className="break-inside-avoid py-0.5"
                              >
                                <label
                                  className="flex cursor-pointer items-center gap-2 text-sm leading-snug"
                                >
                                  <input
                                    type="checkbox"
                                    className="size-3.5 shrink-0 rounded border-border"
                                    checked={checked}
                                    disabled={pending}
                                    onChange={() => {
                                      setSelectedAllergens((current) =>
                                        checked
                                          ? current.filter(
                                              (id) => id !== allergen.id,
                                            )
                                          : [...current, allergen.id],
                                      );
                                    }}
                                  />
                                  <span className="text-foreground/90">
                                    {allergen.label}
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {editingProduct ? (
                        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                          <Label
                            htmlFor="product-visible"
                            className="text-xs font-normal text-muted-foreground"
                          >
                            Visible en el menú
                          </Label>
                          <Switch
                            id="product-visible"
                            checked={visibleOnMenu}
                            onCheckedChange={setVisibleOnMenu}
                            disabled={pending}
                          />
                        </div>
                      ) : null}
                    </div>
                  )}
                  <DialogFooter
                    className="m-0 shrink-0 flex-row justify-end gap-2 rounded-none border-t border-border/60 bg-transparent px-5 py-3"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setProductOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      disabled={
                        pending ||
                        categories.length === 0 ||
                        !name.trim() ||
                        !categoryId
                      }
                      onClick={saveProduct}
                    >
                      {editingProduct ? "Guardar" : "Agregar"}
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
