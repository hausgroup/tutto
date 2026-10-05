-- Table labels only need to be unique within a zone (e.g. "1" in Atrás and in Salón).

alter table public.restaurant_tables
  drop constraint if exists restaurant_tables_restaurant_id_label_key;

create unique index if not exists restaurant_tables_floor_area_label_unique
  on public.restaurant_tables (floor_area_id, label);
