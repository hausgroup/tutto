alter table public.product_categories
  add column if not exists preparation_station public.preparation_station not null default 'kitchen';

update public.product_categories
set preparation_station = 'bar'
where name ilike '%bebida%'
   or name ilike '%bar%'
   or name ilike '%cocktail%'
   or name ilike '%cóctel%';
