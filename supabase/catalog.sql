create table if not exists public.public_catalog_products (
  id text primary key,
  publishable boolean not null default false,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.public_catalog_products enable row level security;

create or replace function public.is_catalog_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and lower(email) in ('josias.insfran66@gmail.com', 'iris.traghetti66@gmail.com')
  );
$$;

revoke all on function public.is_catalog_owner() from public;
grant execute on function public.is_catalog_owner() to authenticated;

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
  if not public.is_catalog_owner() then
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

revoke all on function public.save_catalog_product(text, boolean, jsonb) from public;
grant execute on function public.save_catalog_product(text, boolean, jsonb) to authenticated;

create or replace function public.delete_catalog_product(product_id text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_catalog_owner() then
    raise exception 'Not authorized to delete catalog products';
  end if;

  delete from public.public_catalog_products
  where id = product_id;
end;
$$;

revoke all on function public.delete_catalog_product(text) from public;
grant execute on function public.delete_catalog_product(text) to authenticated;

drop policy if exists "Public can read published catalog" on public.public_catalog_products;
create policy "Public can read published catalog"
on public.public_catalog_products for select
to anon
using (publishable = true);

drop policy if exists "Authorized owner can read catalog" on public.public_catalog_products;
create policy "Authorized owner can read catalog"
on public.public_catalog_products for select
to authenticated
using (public.is_catalog_owner());

drop policy if exists "Authorized owner can insert catalog" on public.public_catalog_products;
create policy "Authorized owner can insert catalog"
on public.public_catalog_products for insert
to authenticated
with check (public.is_catalog_owner());

drop policy if exists "Authorized owner can update catalog" on public.public_catalog_products;
create policy "Authorized owner can update catalog"
on public.public_catalog_products for update
to authenticated
using (public.is_catalog_owner())
with check (public.is_catalog_owner());

drop policy if exists "Authorized owner can delete catalog" on public.public_catalog_products;
create policy "Authorized owner can delete catalog"
on public.public_catalog_products for delete
to authenticated
using (public.is_catalog_owner());

grant usage on schema public to anon, authenticated;
grant select on public.public_catalog_products to anon;
grant select, insert, update, delete on public.public_catalog_products to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'public_catalog_products'
  ) then
    alter publication supabase_realtime add table public.public_catalog_products;
  end if;
end
$$;
