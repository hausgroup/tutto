/** Stable IDs for the three operational brands under Grupo Nazesch. */
export const RESTAURANT_IDS = {
  haus: "22222222-2222-4222-8222-222222222222",
  ciao: "22222222-2222-4222-8222-222222222201",
  hunterButcher: "22222222-2222-4222-8222-222222222202",
} as const;

export type BrandRestaurantId =
  (typeof RESTAURANT_IDS)[keyof typeof RESTAURANT_IDS];

export const RESTAURANT_BRANDS: {
  id: BrandRestaurantId;
  name: string;
  slug: string;
}[] = [
  { id: RESTAURANT_IDS.ciao, name: "Ciao", slug: "ciao" },
  {
    id: RESTAURANT_IDS.hunterButcher,
    name: "Hunter & Butcher",
    slug: "hunter-butcher",
  },
  { id: RESTAURANT_IDS.haus, name: "Haus", slug: "haus" },
];

export const ALL_BRAND_RESTAURANT_IDS: BrandRestaurantId[] =
  RESTAURANT_BRANDS.map((b) => b.id);

export function isBrandRestaurantId(id: string): id is BrandRestaurantId {
  return (ALL_BRAND_RESTAURANT_IDS as string[]).includes(id);
}

export function restaurantDisplayName(id: string): string {
  return (
    RESTAURANT_BRANDS.find((b) => b.id === id)?.name ?? "Restaurante"
  );
}
