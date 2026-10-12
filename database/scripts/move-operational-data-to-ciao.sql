-- Moves floor + menu data that lived on the original single restaurant (Haus UUID)
-- onto the Ciao restaurant. Safe to run once after multi-restaurant migration.
-- Hunter & Butcher and Haus stay empty unless you add data there separately.

begin;

-- Haus (legacy single-tenant id) → Ciao
update public.floor_areas
set restaurant_id = '22222222-2222-4222-8222-222222222201'
where restaurant_id = '22222222-2222-4222-8222-222222222222';

update public.restaurant_tables
set restaurant_id = '22222222-2222-4222-8222-222222222201'
where restaurant_id = '22222222-2222-4222-8222-222222222222';

update public.product_categories
set restaurant_id = '22222222-2222-4222-8222-222222222201'
where restaurant_id = '22222222-2222-4222-8222-222222222222';

update public.products
set restaurant_id = '22222222-2222-4222-8222-222222222201'
where restaurant_id = '22222222-2222-4222-8222-222222222222';

update public.ingredients
set restaurant_id = '22222222-2222-4222-8222-222222222201'
where restaurant_id = '22222222-2222-4222-8222-222222222222';

update public.recipes
set restaurant_id = '22222222-2222-4222-8222-222222222201'
where restaurant_id = '22222222-2222-4222-8222-222222222222';

commit;
