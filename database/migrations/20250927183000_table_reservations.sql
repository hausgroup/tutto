-- Active table reservation details (when status = reserved).

alter table public.restaurant_tables
  add column if not exists reservation_guest_name text,
  add column if not exists reservation_party_size int check (
    reservation_party_size is null or reservation_party_size > 0
  ),
  add column if not exists reservation_occasion text;
