-- Supplemental seed for phase 3–9 tables (run after 20250924100000 migration)

insert into public.ingredients (id, restaurant_id, name, unit, stock_quantity, min_stock_quantity, cost_minor_per_unit) values
  ('77777777-7777-4777-8777-777777777701', '22222222-2222-4222-8222-222222222222', 'Pan hamburguesa', 'unit', 120, 20, 800),
  ('77777777-7777-4777-8777-777777777702', '22222222-2222-4222-8222-222222222222', 'Carne molida', 'g', 25000, 5000, 45),
  ('77777777-7777-4777-8777-777777777703', '22222222-2222-4222-8222-222222222222', 'Queso', 'g', 8000, 1000, 35)
on conflict (id) do nothing;

insert into public.recipes (id, restaurant_id, product_id, name) values
  ('88888888-8888-4888-8888-888888888801', '22222222-2222-4222-8222-222222222222', '66666666-6666-4666-8666-666666666601', 'Classic Burger')
on conflict (id) do nothing;

insert into public.recipe_lines (recipe_id, ingredient_id, quantity, wastage_bps) values
  ('88888888-8888-4888-8888-888888888801', '77777777-7777-4777-8777-777777777701', 1, 0),
  ('88888888-8888-4888-8888-888888888801', '77777777-7777-4777-8777-777777777702', 150, 500),
  ('88888888-8888-4888-8888-888888888801', '77777777-7777-4777-8777-777777777703', 20, 0)
on conflict do nothing;

insert into public.product_modifiers (id, restaurant_id, product_id, name, price_minor_delta, sort_order) values
  ('99999999-9999-4999-8999-999999999901', '22222222-2222-4222-8222-222222222222', '66666666-6666-4666-8666-666666666601', 'Extra queso', 3000, 1),
  ('99999999-9999-4999-8999-999999999902', '22222222-2222-4222-8222-222222222222', '66666666-6666-4666-8666-666666666601', 'Sin cebolla', 0, 2)
on conflict (id) do nothing;
