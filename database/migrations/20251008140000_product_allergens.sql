-- Allergen tags for menu items (stable slug ids, see src/lib/catalog/allergens.ts).

alter table public.products
  add column if not exists allergens text[] not null default '{}';
