/** Stable ids stored in `products.allergens` (text[]). */
export const MENU_ALLERGENS = [
  { id: "gluten", label: "Gluten (trigo, cebada, centeno, avena)" },
  { id: "crustaceans", label: "Crustáceos (camarón, langostino, cangrejo)" },
  { id: "eggs", label: "Huevo" },
  { id: "fish", label: "Pescado" },
  { id: "peanuts", label: "Maní / cacahuate" },
  { id: "soy", label: "Soja" },
  { id: "milk", label: "Lácteos / leche" },
  { id: "tree_nuts", label: "Frutos secos (nueces, almendras, avellanas…)" },
  { id: "almonds", label: "Almendras" },
  { id: "walnuts", label: "Nueces" },
  { id: "cashews", label: "Marañón / anacardo" },
  { id: "pistachios", label: "Pistachos" },
  { id: "celery", label: "Apio" },
  { id: "mustard", label: "Mostaza" },
  { id: "sesame", label: "Sésamo / ajonjolí" },
  { id: "sulphites", label: "Sulfitos" },
  { id: "lupin", label: "Altramuces" },
  { id: "molluscs", label: "Moluscos (pulpo, calamar, mejillón)" },
  { id: "coconut", label: "Coco" },
  { id: "corn", label: "Maíz" },
  { id: "garlic", label: "Ajo" },
  { id: "onion", label: "Cebolla" },
  { id: "nightshades", label: "Solanáceas (tomate, pimentón, berenjena)" },
  { id: "caffeine", label: "Cafeína" },
] as const;

export type AllergenId = (typeof MENU_ALLERGENS)[number]["id"];

export const ALLERGEN_IDS: AllergenId[] = MENU_ALLERGENS.map((item) => item.id);

const allergenIdSet = new Set<string>(ALLERGEN_IDS);

export function normalizeAllergenIds(values: string[]): AllergenId[] {
  const seen = new Set<AllergenId>();
  for (const value of values) {
    if (!allergenIdSet.has(value)) continue;
    seen.add(value as AllergenId);
  }
  return ALLERGEN_IDS.filter((id) => seen.has(id));
}

export function allergenLabels(ids: AllergenId[]): string[] {
  const byId = new Map(MENU_ALLERGENS.map((item) => [item.id, item.label]));
  return ids.map((id) => byId.get(id) ?? id);
}
