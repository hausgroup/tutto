-- Link multiple tables to the same reservation (hosting / large parties).

alter table public.restaurant_tables
  add column if not exists reservation_group_id uuid;

create index if not exists restaurant_tables_reservation_group_id_idx
  on public.restaurant_tables (reservation_group_id)
  where reservation_group_id is not null;
