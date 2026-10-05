-- Timestamp when a line leaves the POS draft (kitchen/bar send).

alter table public.order_items
  add column if not exists sent_at timestamptz;

create index if not exists order_items_order_sent_at_idx
  on public.order_items (order_id, sent_at desc nulls last);
