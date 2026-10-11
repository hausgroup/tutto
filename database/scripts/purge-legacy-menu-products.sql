-- Removes pre-Ciao demo menu rows (and their order line items) for the demo restaurant.
-- Safe to re-run: only targets products whose SKU does not start with CIAO-.

begin;

with legacy as (
  select id
  from public.products
  where restaurant_id = '22222222-2222-4222-8222-222222222222'
    and coalesce(sku, '') not like 'CIAO-%'
),
removed_lines as (
  delete from public.order_items oi
  using legacy
  where oi.product_id = legacy.id
  returning oi.id
)
select count(*) as removed_order_items from removed_lines;

delete from public.products
where restaurant_id = '22222222-2222-4222-8222-222222222222'
  and coalesce(sku, '') not like 'CIAO-%';

delete from public.product_categories c
where c.restaurant_id = '22222222-2222-4222-8222-222222222222'
  and not exists (
    select 1 from public.products p where p.category_id = c.id
  );

commit;
