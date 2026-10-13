/** Stable ids stored in `products.allergens` (text[]). */
export type AllergenGroupId = "mandatory" | "tree_nuts" | "other";

export type MenuAllergen = {
  id: string;
  group: AllergenGroupId;
  label: string;
  detail?: string;
};

export const MENU_ALLERGEN_GROUPS: {
  id: AllergenGroupId;
  title: string;
}[] = [
  { id: "mandatory", title: "Declaración obligatoria" },
  { id: "tree_nuts", title: "Frutos secos" },
  { id: "other", title: "Otros" },
];

export const MENU_ALLERGENS = [
  {
    id: "gluten",
    group: "mandatory" as const,
    label: "Gluten",
    detail: "trigo, cebada, centeno, avena",
  },
  {
    id: "crustaceans",
    group: "mandatory" as const,
    label: "Crustáceos",
    detail: "camarón, langostino, cangrejo",
  },
  { id: "eggs", group: "mandatory" as const, label: "Huevo" },
  { id: "fish", group: "mandatory" as const, label: "Pescado" },
  { id: "peanuts", group: "mandatory" as const, label: "Maní / cacahuate" },
  { id: "soy", group: "mandatory" as const, label: "Soja" },
  { id: "milk", group: "mandatory" as const, label: "Lácteos / leche" },
  {
    id: "celery",
    group: "mandatory" as const,
    label: "Apio",
  },
  { id: "mustard", group: "mandatory" as const, label: "Mostaza" },
  { id: "sesame", group: "mandatory" as const, label: "Sésamo / ajonjolí" },
  { id: "sulphites", group: "mandatory" as const, label: "Sulfitos" },
  { id: "lupin", group: "mandatory" as const, label: "Altramuces" },
  {
    id: "molluscs",
    group: "mandatory" as const,
    label: "Moluscos",
    detail: "pulpo, calamar, mejillón",
  },
  {
    id: "tree_nuts",
    group: "tree_nuts" as const,
    label: "Frutos secos (general)",
    detail: "nueces, almendras, avellanas…",
  },
  { id: "almonds", group: "tree_nuts" as const, label: "Almendras" },
  { id: "walnuts", group: "tree_nuts" as const, label: "Nueces" },
  { id: "cashews", group: "tree_nuts" as const, label: "Marañón / anacardo" },
  { id: "pistachios", group: "tree_nuts" as const, label: "Pistachos" },
  { id: "coconut", group: "other" as const, label: "Coco" },
  { id: "corn", group: "other" as const, label: "Maíz" },
  { id: "garlic", group: "other" as const, label: "Ajo" },
  { id: "onion", group: "other" as const, label: "Cebolla" },
  {
    id: "nightshades",
    group: "other" as const,
    label: "Solanáceas",
    detail: "tomate, pimentón, berenjena",
  },
  { id: "caffeine", group: "other" as const, label: "Cafeína" },
] satisfies readonly MenuAllergen[];

export type AllergenId = (typeof MENU_ALLERGENS)[number]["id"];

export const ALLERGEN_IDS: AllergenId[] = MENU_ALLERGENS.map((item) => item.id);

const allergenIdSet = new Set<string>(ALLERGEN_IDS);

const allergensByGroup = new Map<AllergenGroupId, (typeof MENU_ALLERGENS)[number][]>();
for (const group of MENU_ALLERGEN_GROUPS) {
  allergensByGroup.set(
    group.id,
    MENU_ALLERGENS.filter((item) => item.group === group.id),
  );
}

export function allergensForGroup(groupId: AllergenGroupId) {
  return allergensByGroup.get(groupId) ?? [];
}

export function allergenDisplayLabel(
  item: Pick<MenuAllergen, "label" | "detail">,
): string {
  return item.detail ? `${item.label} (${item.detail})` : item.label;
}

export function normalizeAllergenIds(values: string[]): AllergenId[] {
  const seen = new Set<AllergenId>();
  for (const value of values) {
    if (!allergenIdSet.has(value)) continue;
    seen.add(value as AllergenId);
  }
  return ALLERGEN_IDS.filter((id) => seen.has(id));
}

export function allergenLabels(ids: AllergenId[]): string[] {
  const byId = new Map(MENU_ALLERGENS.map((item) => [item.id, item]));
  return ids.map((id) => {
    const item = byId.get(id);
    return item ? allergenDisplayLabel(item) : id;
  });
}
