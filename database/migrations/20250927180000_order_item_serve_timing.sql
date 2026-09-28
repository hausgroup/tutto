-- When to send bar drinks: immediately vs with the rest of the order.

create type public.drink_serve_timing as enum ('immediate', 'with_meal');

alter table public.order_items
  add column if not exists serve_timing public.drink_serve_timing;
