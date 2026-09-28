-- POS helpers: missing RLS, recipe consumption RPC, Siigo enqueue

-- order_item_modifiers (RLS enabled without policies in prior migration)
create policy order_item_modifiers_select on public.order_item_modifiers
  for select using (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_modifiers.order_item_id
        and public.is_restaurant_member(o.restaurant_id)
    )
  );

create policy order_item_modifiers_write on public.order_item_modifiers
  for all using (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_modifiers.order_item_id
        and (
          public.user_has_permission(o.restaurant_id, 'orders.modify')
          or public.user_has_permission(o.restaurant_id, 'orders.create')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_modifiers.order_item_id
        and (
          public.user_has_permission(o.restaurant_id, 'orders.modify')
          or public.user_has_permission(o.restaurant_id, 'orders.create')
        )
    )
  );

create policy siigo_sync_jobs_insert on public.siigo_sync_jobs
  for insert with check (
    public.user_has_permission(restaurant_id, 'payments.process')
    or public.user_has_permission(restaurant_id, 'siigo.manage')
  );

-- Decrement ingredient stock from recipe when a product is sold (POS payment path).
create or replace function public.consume_product_recipe_stock(
  p_restaurant_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_reference_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe public.recipes%rowtype;
  v_line public.recipe_lines%rowtype;
  v_delta numeric(14, 3);
  v_wastage numeric;
  v_cost bigint;
begin
  if p_quantity is null or p_quantity <= 0 then
    return;
  end if;

  if not public.is_restaurant_member(p_restaurant_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (
    public.user_has_permission(p_restaurant_id, 'payments.process')
    or public.user_has_permission(p_restaurant_id, 'inventory.manage')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_recipe
  from public.recipes
  where restaurant_id = p_restaurant_id
    and product_id = p_product_id;

  if not found then
    return;
  end if;

  for v_line in
    select * from public.recipe_lines where recipe_id = v_recipe.id
  loop
    select cost_minor_per_unit into v_cost
    from public.ingredients
    where id = v_line.ingredient_id
      and restaurant_id = p_restaurant_id
    for update;

    v_wastage := 1 + (v_line.wastage_bps::numeric / 10000);
    v_delta := -(v_line.quantity * p_quantity * v_wastage);

    update public.ingredients
    set
      stock_quantity = greatest(0, stock_quantity + v_delta),
      updated_at = now()
    where id = v_line.ingredient_id
      and restaurant_id = p_restaurant_id;

    insert into public.inventory_movements (
      restaurant_id,
      ingredient_id,
      movement_type,
      quantity_delta,
      unit_cost_minor,
      reference_type,
      reference_id,
      created_by
    ) values (
      p_restaurant_id,
      v_line.ingredient_id,
      'sale_consumption',
      v_delta,
      coalesce(v_cost, 0),
      'order_item',
      p_reference_id,
      auth.uid()
    );
  end loop;
end;
$$;

grant execute on function public.consume_product_recipe_stock(uuid, uuid, integer, uuid)
  to authenticated;
