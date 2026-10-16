"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Coffee,
  CupSoda,
  IceCream,
  Plus,
  SlidersHorizontal,
  Soup,
  Trash2,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { CatalogSearchField } from "@/components/catalog/catalog-search-field";
import { filterMenuProductsByQuery } from "@/lib/catalog/menu-search";
import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
  deleteProductAction,
  setProductActiveAction,
  updateProductAction,
} from "@/lib/catalog/actions";
import { AllergenPicker } from "@/components/catalog/allergen-picker";
import type { AllergenId } from "@/lib/catalog/allergens";
import type {
  CatalogSnapshot,
  PreparationStation,
  Product,
  ProductCategory,
} from "@/lib/catalog/types";
import { invalidatePosCatalogCache } from "@/lib/pos/client-cache";
import { formatCurrency } from "@/lib/utils/money";
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
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  ModalForm,
  ModalFormField,
  ModalFormRow,
} from "@/components/ui/modal-form-grid";
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

const MENU_TEXTAREA_CLASS =
  "min-h-[5rem] resize-none rounded-input border-0 bg-muted ring-1 ring-input-border focus-visible:ring-2 focus-visible:ring-ring dark:bg-muted";

function stationLabel(station: string) {
  return (
    STATION_OPTIONS.find((option) => option.value === station)?.label ??
    "Cocina"
  );
}

function menuCategorySectionId(categoryId: string) {
  return `menu-category-${categoryId}`;
}

function scrollToMenuCategory(categoryId: string) {
  document
    .getElementById(menuCategorySectionId(categoryId))
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  const categories = useMemo(
    () => [...snapshot.categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [snapshot.categories],
  );

  const categoryIdSet = useMemo(
    () => new Set(categories.map((c) => c.id)),
    [categories],
  );

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const searchActive = menuSearchQuery.trim().length > 0;

  const matchingProductCount = useMemo(() => {
    if (!searchActive) return 0;
    return filterMenuProductsByQuery(
      snapshot.products,
      menuSearchQuery,
      categoryNameById,
    ).length;
  }, [searchActive, snapshot.products, menuSearchQuery, categoryNameById]);

  const uncategorisedProducts = useMemo(
    () =>
      filterMenuProductsByQuery(
        snapshot.products.filter(
          (p) => !p.categoryId || !categoryIdSet.has(p.categoryId),
        ),
        menuSearchQuery,
        categoryNameById,
      ),
    [snapshot.products, categoryIdSet, menuSearchQuery, categoryNameById],
  );

  const visibleCategories = useMemo(() => {
    if (!searchActive) return categories;
    return categories.filter((category) =>
      filterMenuProductsByQuery(
        snapshot.products.filter((p) => p.categoryId === category.id),
        menuSearchQuery,
        categoryNameById,
      ).length > 0,
    );
  }, [
    categories,
    searchActive,
    snapshot.products,
    menuSearchQuery,
    categoryNameById,
  ]);

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

  function deleteCategory(category: ProductCategory) {
    const count = snapshot.products.filter(
      (p) => p.categoryId === category.id,
    ).length;
    const confirmMessage =
      count > 0
        ? `¿Eliminar la categoría "${category.name}"? ${count} producto${count === 1 ? "" : "s"} quedarán sin categoría.`
        : `¿Eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCategoryAction({
        restaurantId,
        categoryId: category.id,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSnapshot((current) => {
        const nextCategories = current.categories.filter(
          (c) => c.id !== category.id,
        );
        const nextProducts = current.products.map((p) =>
          p.categoryId === category.id ? { ...p, categoryId: null } : p,
        );
        if (categoryId === category.id) {
          setCategoryId(nextCategories[0]?.id ?? "");
        }
        return {
          ...current,
          categories: nextCategories,
          products: nextProducts,
        };
      });
      invalidatePosCatalogCache();
      toast.success(
        count > 0
          ? "Categoría eliminada; productos en Sin categoría"
          : "Categoría eliminada",
      );
      router.refresh();
    });
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

  function deleteProduct() {
    if (!editingProduct) return;
    const label = editingProduct.name;
    if (
      !window.confirm(
        `¿Eliminar "${label}" del menú? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteProductAction({
        restaurantId,
        productId: editingProduct.id,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSnapshot((current) => ({
        ...current,
        products: current.products.filter((p) => p.id !== editingProduct.id),
      }));
      invalidatePosCatalogCache();
      toast.success("Producto eliminado");
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

  function renderProductCards(products: Product[]) {
    return (
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
                    size="icon-sm"
                    className="-mt-1 -mr-1 shrink-0"
                    aria-label={`Editar ${product.name}`}
                    onClick={() => openProductEditor(product)}
                  >
                    <SlidersHorizontal className="size-3.5" />
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
                className="-mx-4 -mb-4 mt-3 flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3"
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
    );
  }

  return (
    <div className="space-y-8 pb-6">
      <PageHeaderActions>
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <CatalogSearchField
            className="w-full min-w-[11rem] max-w-sm sm:w-56"
            value={menuSearchQuery}
            onChange={setMenuSearchQuery}
            onClear={() => setMenuSearchQuery("")}
          />
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
                <FormDialogContent>
                  <FormDialogHeader>
                    <FormDialogTitle>Nueva categoría</FormDialogTitle>
                  </FormDialogHeader>
                  <FormDialogBody>
                    <ModalForm>
                      <ModalFormField label="Nombre" htmlFor="category-name">
                        <Input
                          id="category-name"
                          value={categoryName}
                          onChange={(event) =>
                            setCategoryName(event.target.value)
                          }
                          placeholder="Ej. Entradas"
                          autoFocus
                        />
                      </ModalFormField>
                      <ModalFormField label="Estación de pedidos">
                        <Select
                          value={categoryStation}
                          onValueChange={(value) =>
                            setCategoryStation(value as PreparationStation)
                          }
                        >
                          <SelectTrigger
                            className={formSelectTriggerClassName}
                          >
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
                      </ModalFormField>
                    </ModalForm>
                  </FormDialogBody>
                  <FormDialogFooter>
                    <Button
                      variant="outline"
                      disabled={pending || !categoryName.trim()}
                      onClick={createCategory}
                    >
                      Crear categoría
                    </Button>
                  </FormDialogFooter>
                </FormDialogContent>
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
                <FormDialogContent>
                  <FormDialogHeader>
                    <FormDialogTitle>
                      {editingProduct ? "Editar producto" : "Nuevo producto"}
                    </FormDialogTitle>
                  </FormDialogHeader>
                  {categories.length === 0 ? (
                    <FormDialogBody>
                      <p className="text-sm text-muted-foreground">
                        Crea una categoría primero.
                      </p>
                    </FormDialogBody>
                  ) : (
                    <FormDialogBody>
                      <ModalForm>
                      <ModalFormField label="Nombre" htmlFor="product-name">
                        <Input
                          id="product-name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Classic Burger"
                          autoFocus
                        />
                      </ModalFormField>

                      <ModalFormRow cols={2}>
                        <ModalFormField label="Categoría">
                          <Select
                            value={categoryId}
                            onValueChange={onProductCategoryChange}
                          >
                            <SelectTrigger
                              className={formSelectTriggerClassName}
                            >
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
                        </ModalFormField>
                        <ModalFormField label="Precio (COP)" htmlFor="product-price">
                          <MoneyInput
                            id="product-price"
                            value={priceMinor}
                            onValueChange={setPriceMinor}
                          />
                        </ModalFormField>
                      </ModalFormRow>

                      <ModalFormRow cols={3}>
                        <ModalFormField label="Impuesto">
                          <Select
                            value={String(taxRateBps)}
                            onValueChange={(value) =>
                              setTaxRateBps(Number(value))
                            }
                          >
                            <SelectTrigger
                              className={formSelectTriggerClassName}
                            >
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
                        </ModalFormField>
                        <ModalFormField label="Estación">
                          <Select
                            value={station}
                            onValueChange={(value) =>
                              setStation(value as PreparationStation)
                            }
                          >
                            <SelectTrigger
                              className={formSelectTriggerClassName}
                            >
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
                        </ModalFormField>
                        <ModalFormField label="SKU" htmlFor="product-sku">
                          <Input
                            id="product-sku"
                            value={sku}
                            onChange={(event) => setSku(event.target.value)}
                            placeholder="Opcional"
                          />
                        </ModalFormField>
                      </ModalFormRow>

                      <ModalFormField
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
                      </ModalFormField>

                      <ModalFormField
                        label={
                          selectedAllergens.length > 0
                            ? `Alérgenos (${selectedAllergens.length})`
                            : "Alérgenos"
                        }
                      >
                        <AllergenPicker
                          selected={selectedAllergens}
                          onChange={setSelectedAllergens}
                          disabled={pending}
                        />
                      </ModalFormField>

                      {editingProduct ? (
                        <div className="flex items-center justify-between gap-3 pt-2">
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
                      </ModalForm>
                    </FormDialogBody>
                  )}
                  <FormDialogFooter>
                    {editingProduct ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="mr-auto"
                        disabled={pending}
                        onClick={deleteProduct}
                      >
                        <Trash2 className="size-4" />
                        Eliminar
                      </Button>
                    ) : (
                      <span className="mr-auto" />
                    )}
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
                  </FormDialogFooter>
                </FormDialogContent>
              </Dialog>
            </>
          ) : null}
        </div>
      </PageHeaderActions>

      {searchActive ? (
        <p className="text-sm text-muted-foreground">
          {matchingProductCount === 0
            ? "Ningún producto coincide con tu búsqueda."
            : `${matchingProductCount} resultado${matchingProductCount === 1 ? "" : "s"} para “${menuSearchQuery.trim()}”.`}
        </p>
      ) : null}

      <SoftSection title="Categorías">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay categorías. Agrega una para empezar el menú.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {(searchActive ? visibleCategories : categories).map(
              (category, index) => {
              const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]!;
              const count = snapshot.products.filter(
                (p) => p.categoryId === category.id,
              ).length;
              const canJump = count > 0;
              return (
                <div
                  key={category.id}
                  role={canJump ? "button" : undefined}
                  tabIndex={canJump ? 0 : undefined}
                  className={cn(
                    "relative flex min-h-[108px] flex-col items-start justify-between rounded-[20px] p-4 text-left",
                    cosyPastel(index),
                    canJump &&
                      "cursor-pointer transition-[filter] hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                  onClick={
                    canJump
                      ? () => scrollToMenuCategory(category.id)
                      : undefined
                  }
                  onKeyDown={
                    canJump
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            scrollToMenuCategory(category.id);
                          }
                        }
                      : undefined
                  }
                >
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-7 w-7 p-0 opacity-70 hover:opacity-100"
                      aria-label={`Eliminar categoría ${category.name}`}
                      disabled={pending}
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteCategory(category);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
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
            },
            )}
          </div>
        )}
      </SoftSection>

      {categories.map((category) => {
        const products = filterMenuProductsByQuery(
          snapshot.products.filter((p) => p.categoryId === category.id),
          menuSearchQuery,
          categoryNameById,
        );
        if (products.length === 0) return null;
        return (
          <SoftSection
            key={category.id}
            id={menuCategorySectionId(category.id)}
            className="scroll-mt-24"
            title={category.name}
          >
            {renderProductCards(products)}
          </SoftSection>
        );
      })}

      {uncategorisedProducts.length > 0 ? (
        <SoftSection title="Sin categoría">
          {renderProductCards(uncategorisedProducts)}
        </SoftSection>
      ) : null}
    </div>
  );
}
