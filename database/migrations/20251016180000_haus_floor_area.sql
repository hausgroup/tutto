-- Haus (legacy default restaurant id) had no floor_areas after three-restaurants split.
insert into public.floor_areas (id, restaurant_id, name, sort_order) values
  (
    '33333333-3333-4333-8333-333333333313',
    '22222222-2222-4222-8222-222222222222',
    'Salón',
    1
  )
on conflict (id) do update set
  restaurant_id = excluded.restaurant_id,
  name = excluded.name,
  sort_order = excluded.sort_order;
