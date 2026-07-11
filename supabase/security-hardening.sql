create table if not exists public.app_users (
  email text primary key,
  role text not null check (role in ('dueno', 'administrador', 'encargado', 'cajero')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

insert into public.app_users (email, role, active)
values
  ('josias.insfran66@gmail.com', 'dueno', true),
  ('iris.traghetti66@gmail.com', 'dueno', true)
on conflict (email) do update
set role = excluded.role,
    active = true,
    updated_at = now();

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select role
  from public.app_users
  where email = lower(coalesce((select email from auth.users where id = auth.uid()), ''))
    and active = true
  limit 1;
$$;

create or replace function public.is_catalog_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_app_role() = 'dueno';
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_app_role() is not null;
$$;

drop policy if exists "Owner reads app users" on public.app_users;
create policy "Owner reads app users"
on public.app_users
for select
to authenticated
using (public.is_catalog_owner());

drop policy if exists "Owner writes app users" on public.app_users;
create policy "Owner writes app users"
on public.app_users
for all
to authenticated
using (public.is_catalog_owner())
with check (public.is_catalog_owner());

revoke all on public.app_users from anon, authenticated, public;
grant select, insert, update, delete on public.app_users to authenticated;

revoke all on function public.current_app_role() from public, anon, authenticated;
revoke all on function public.is_catalog_owner() from public, anon, authenticated;
revoke all on function public.is_internal_user() from public, anon, authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_catalog_owner() to authenticated;
grant execute on function public.is_internal_user() to authenticated;

revoke all on public.operational_state from anon, authenticated, public;
revoke all on public.public_catalog_products from anon, authenticated, public;
revoke all on public.store_orders from anon, authenticated, public;
revoke all on public.store_email_queue from anon, authenticated, public;

grant select on public.public_catalog_products to anon;
grant select, insert, update, delete on public.public_catalog_products to authenticated;
grant select, insert, update on public.operational_state to authenticated;
grant select on public.store_orders, public.store_email_queue to authenticated;

drop policy if exists "Owner reads operational state" on public.operational_state;
drop policy if exists "Owner inserts operational state" on public.operational_state;
drop policy if exists "Owner updates operational state" on public.operational_state;
drop policy if exists "Internal users read operational state" on public.operational_state;
drop policy if exists "Internal users insert operational state" on public.operational_state;
drop policy if exists "Internal users update operational state" on public.operational_state;

create policy "Internal users read operational state"
on public.operational_state
for select
to authenticated
using (public.is_internal_user());

create policy "Internal users insert operational state"
on public.operational_state
for insert
to authenticated
with check (public.is_internal_user());

create policy "Internal users update operational state"
on public.operational_state
for update
to authenticated
using (public.is_internal_user())
with check (public.is_internal_user());

drop policy if exists "Authorized owner can read catalog" on public.public_catalog_products;
drop policy if exists "Authorized owner can insert catalog" on public.public_catalog_products;
drop policy if exists "Authorized owner can update catalog" on public.public_catalog_products;
drop policy if exists "Authorized owner can delete catalog" on public.public_catalog_products;
drop policy if exists "Internal users read catalog" on public.public_catalog_products;
drop policy if exists "Internal users insert catalog" on public.public_catalog_products;
drop policy if exists "Internal users update catalog" on public.public_catalog_products;
drop policy if exists "Owners and admins delete catalog" on public.public_catalog_products;

create policy "Internal users read catalog"
on public.public_catalog_products for select
to authenticated
using (public.is_internal_user());

create policy "Internal users insert catalog"
on public.public_catalog_products for insert
to authenticated
with check (public.is_internal_user());

create policy "Internal users update catalog"
on public.public_catalog_products for update
to authenticated
using (public.is_internal_user())
with check (public.is_internal_user());

create policy "Owners and admins delete catalog"
on public.public_catalog_products for delete
to authenticated
using (public.current_app_role() in ('dueno', 'administrador'));

create or replace function public.save_catalog_product(
  product_id text,
  product_publishable boolean,
  product_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_internal_user() then
    raise exception 'Not authorized to update the catalog';
  end if;

  insert into public.public_catalog_products (id, publishable, data, updated_at)
  values (product_id, product_publishable, product_data, now())
  on conflict (id) do update
  set publishable = excluded.publishable,
      data = excluded.data,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.delete_catalog_product(product_id text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_app_role() not in ('dueno', 'administrador') then
    raise exception 'Not authorized to delete catalog products';
  end if;

  delete from public.public_catalog_products
  where id = product_id;
end;
$$;

create or replace function public.save_operational_state(
  state_data jsonb,
  expected_updated_at text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_updated_at timestamptz;
  next_updated_at timestamptz := now();
begin
  if not public.is_internal_user() then
    raise exception 'Not authorized to update operational state';
  end if;

  select updated_at
  into current_updated_at
  from public.operational_state
  where id = 'main';

  if current_updated_at is not null
    and expected_updated_at is not null
    and current_updated_at <> expected_updated_at::timestamptz then
    raise exception 'Operational state changed remotely';
  end if;

  insert into public.operational_state (id, data, updated_at, updated_by)
  values ('main', jsonb_set(state_data, '{updatedAt}', to_jsonb(next_updated_at::text), true), next_updated_at, auth.uid())
  on conflict (id) do update
  set data = excluded.data,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by;

  return next_updated_at;
end;
$$;

create or replace function public.audit_operational_state(
  state_data jsonb,
  expected_updated_at text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_app_role() <> 'dueno' then
    raise exception 'Only owners can audit operational state';
  end if;

  if coalesce(state_data->>'auditReason', '') = ''
    or length(trim(state_data->>'auditReason')) < 5 then
    raise exception 'Audit reason is required';
  end if;

  return public.save_operational_state(state_data - 'auditReason', expected_updated_at);
end;
$$;

revoke all on function public.save_catalog_product(text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.delete_catalog_product(text) from public, anon, authenticated;
revoke all on function public.save_operational_state(jsonb) from public, anon, authenticated;
revoke all on function public.save_operational_state(jsonb, text) from public, anon, authenticated;
revoke all on function public.audit_operational_state(jsonb, text) from public, anon, authenticated;

grant execute on function public.save_catalog_product(text, boolean, jsonb) to authenticated;
grant execute on function public.delete_catalog_product(text) to authenticated;
grant execute on function public.save_operational_state(jsonb, text) to authenticated;
grant execute on function public.audit_operational_state(jsonb, text) to authenticated;

create table if not exists public.store_order_rate_limits (
  customer_email text not null,
  window_start timestamptz not null,
  order_count integer not null default 0,
  primary key (customer_email, window_start)
);

revoke all on public.store_order_rate_limits from anon, authenticated, public;

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
  updated_variants jsonb;
  variant_data jsonb;
  current_stock integer;
  requested_quantity integer;
  unit_price numeric;
  unit_cost numeric;
  calculated_total numeric := 0;
  affected_rows integer := 0;
  normalized_email text;
  rate_window timestamptz := date_trunc('hour', now());
  rate_count integer;
  sanitized_lines jsonb := '[]'::jsonb;
begin
  normalized_email := lower(coalesce(order_data->>'customerEmail', ''));
  if coalesce(order_data->>'id', '') = ''
    or coalesce(order_data->>'customerName', '') = ''
    or normalized_email = ''
    or jsonb_array_length(coalesce(order_data->'lines', '[]'::jsonb)) = 0 then
    raise exception 'Pedido incompleto';
  end if;

  if exists (select 1 from public.store_orders where id = order_data->>'id') then
    return;
  end if;

  insert into public.store_order_rate_limits (customer_email, window_start, order_count)
  values (normalized_email, rate_window, 1)
  on conflict (customer_email, window_start) do update
  set order_count = public.store_order_rate_limits.order_count + 1
  returning order_count into rate_count;

  if rate_count > 10 then
    raise exception 'Demasiados pedidos para este email. Intenta mas tarde.';
  end if;

  for line_item in select value from jsonb_array_elements(order_data->'lines')
  loop
    requested_quantity := coalesce((line_item->>'quantity')::integer, 0);
    if requested_quantity <= 0 or requested_quantity > 20 then
      raise exception 'Cantidad invalida para %', line_item->>'name';
    end if;

    select data
    into product_data
    from public.public_catalog_products
    where id = line_item->>'productId'
      and publishable = true
    for update;

    if product_data is null then
      raise exception 'El producto % no esta disponible', line_item->>'productId';
    end if;

    select variant
    into variant_data
    from jsonb_array_elements(coalesce(product_data->'variants', '[]'::jsonb)) as variant
    where variant->>'id' = line_item->>'variantId';

    if variant_data is null then
      raise exception 'La variante % no esta disponible', line_item->>'variantId';
    end if;

    current_stock := (variant_data->>'stock')::integer;
    unit_price := coalesce((variant_data->>'webPrice')::numeric, (variant_data->>'price')::numeric);
    unit_cost := (variant_data->>'cost')::numeric;

    if current_stock < requested_quantity then
      raise exception 'Stock insuficiente para %', line_item->>'name';
    end if;

    calculated_total := calculated_total + requested_quantity * unit_price;

    select jsonb_agg(
      case
        when variant->>'id' = line_item->>'variantId'
        then jsonb_set(variant, '{stock}', to_jsonb((variant->>'stock')::integer - requested_quantity))
        else variant
      end
    )
    into updated_variants
    from jsonb_array_elements(product_data->'variants') as variant;

    update public.public_catalog_products
    set data = jsonb_set(data, '{variants}', updated_variants),
        updated_at = now()
    where id = line_item->>'productId';

    line_item := jsonb_set(line_item, '{unitPrice}', to_jsonb(unit_price), true);
    line_item := jsonb_set(line_item, '{unitCost}', to_jsonb(unit_cost), true);
    line_item := jsonb_set(line_item, '{quantity}', to_jsonb(requested_quantity), true);
    sanitized_lines := sanitized_lines || jsonb_build_array(line_item);
  end loop;

  order_data := jsonb_set(order_data, '{lines}', sanitized_lines, true);
  order_data := jsonb_set(order_data, '{total}', to_jsonb(calculated_total), true);

  insert into public.store_orders (id, customer_email, status, data, created_at)
  values (
    order_data->>'id',
    normalized_email,
    coalesce(order_data->>'status', 'nuevo'),
    order_data,
    coalesce((order_data->>'createdAt')::timestamptz, now())
  )
  on conflict (id) do nothing;

  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    return;
  end if;

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

revoke all on function public.create_store_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_store_order(jsonb, jsonb) to anon, authenticated;

drop policy if exists "Owner reads store orders" on public.store_orders;
drop policy if exists "Owner reads email queue" on public.store_email_queue;
drop policy if exists "Internal users read store orders" on public.store_orders;
drop policy if exists "Internal users read email queue" on public.store_email_queue;

create policy "Internal users read store orders"
on public.store_orders
for select to authenticated
using (public.is_internal_user());

create policy "Internal users read email queue"
on public.store_email_queue
for select to authenticated
using (public.is_internal_user());

drop policy if exists "Authorized owner can manage business files" on storage.objects;
drop policy if exists "Internal users manage business files" on storage.objects;
create policy "Internal users manage business files"
on storage.objects for all
to authenticated
using (
  bucket_id in ('product-images', 'purchase-documents', 'transfer-receipts', 'expense-documents')
  and public.is_internal_user()
)
with check (
  bucket_id in ('product-images', 'purchase-documents', 'transfer-receipts', 'expense-documents')
  and public.is_internal_user()
);
