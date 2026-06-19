create table if not exists public.store_orders (
  id text primary key,
  customer_email text not null,
  status text not null default 'nuevo',
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.store_email_queue (
  id text primary key,
  order_id text not null references public.store_orders(id) on delete cascade,
  recipient text not null,
  kind text not null,
  status text not null default 'pendiente',
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.store_orders enable row level security;
alter table public.store_email_queue enable row level security;

drop policy if exists "Owner reads store orders" on public.store_orders;
create policy "Owner reads store orders" on public.store_orders
for select to authenticated using (public.is_catalog_owner());

drop policy if exists "Owner reads email queue" on public.store_email_queue;
create policy "Owner reads email queue" on public.store_email_queue
for select to authenticated using (public.is_catalog_owner());

grant select on public.store_orders, public.store_email_queue to authenticated;

create or replace function public.create_store_order(order_data jsonb, email_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  email_item jsonb;
  line_item jsonb;
  product_data jsonb;
  current_stock integer;
  affected_rows integer := 0;
begin
  if coalesce(order_data->>'id', '') = ''
    or coalesce(order_data->>'customerName', '') = ''
    or coalesce(order_data->>'customerEmail', '') = ''
    or jsonb_array_length(coalesce(order_data->'lines', '[]'::jsonb)) = 0 then
    raise exception 'Pedido incompleto';
  end if;

  insert into public.store_orders (id, customer_email, status, data, created_at)
  values (
    order_data->>'id',
    lower(order_data->>'customerEmail'),
    coalesce(order_data->>'status', 'nuevo'),
    order_data,
    coalesce((order_data->>'createdAt')::timestamptz, now())
  )
  on conflict (id) do nothing;

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    return;
  end if;

  for line_item in select value from jsonb_array_elements(order_data->'lines')
  loop
    select data
    into product_data
    from public.public_catalog_products
    where id = line_item->>'productId'
      and publishable = true
    for update;

    if product_data is null then
      raise exception 'El producto % no esta disponible', line_item->>'productId';
    end if;

    select (variant->>'stock')::integer
    into current_stock
    from jsonb_array_elements(coalesce(product_data->'variants', '[]'::jsonb)) as variant
    where variant->>'id' = line_item->>'variantId';

    if current_stock is null then
      raise exception 'La variante % no esta disponible', line_item->>'variantId';
    end if;

    if current_stock < (line_item->>'quantity')::integer then
      raise exception 'Stock insuficiente para %', line_item->>'name';
    end if;

    update public.public_catalog_products
    set data = jsonb_set(
          data,
          '{variants}',
          (
            select jsonb_agg(
              case
                when variant->>'id' = line_item->>'variantId'
                then jsonb_set(
                  variant,
                  '{stock}',
                  to_jsonb((variant->>'stock')::integer - (line_item->>'quantity')::integer)
                )
                else variant
              end
            )
            from jsonb_array_elements(data->'variants') as variant
          )
        ),
        updated_at = now()
    where id = line_item->>'productId';
  end loop;

  for email_item in select value from jsonb_array_elements(coalesce(email_data, '[]'::jsonb))
  loop
    insert into public.store_email_queue (id, order_id, recipient, kind, status, data, created_at)
    values (
      email_item->>'id',
      order_data->>'id',
      lower(email_item->>'to'),
      email_item->>'kind',
      coalesce(email_item->>'status', 'pendiente'),
      email_item,
      coalesce((email_item->>'createdAt')::timestamptz, now())
    )
    on conflict (id) do nothing;
  end loop;
end;
$$;

revoke all on function public.create_store_order(jsonb, jsonb) from public;
grant execute on function public.create_store_order(jsonb, jsonb) to anon, authenticated;
