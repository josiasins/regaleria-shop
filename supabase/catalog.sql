create table if not exists public.public_catalog_products (
  id text primary key,
  publishable boolean not null default false,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.public_catalog_products enable row level security;

drop policy if exists "Public can read published catalog" on public.public_catalog_products;
create policy "Public can read published catalog"
on public.public_catalog_products for select
to anon
using (publishable = true);

drop policy if exists "Authorized owner can read catalog" on public.public_catalog_products;
create policy "Authorized owner can read catalog"
on public.public_catalog_products for select
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'josias.insfran66@gmail.com');

drop policy if exists "Authorized owner can insert catalog" on public.public_catalog_products;
create policy "Authorized owner can insert catalog"
on public.public_catalog_products for insert
to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'josias.insfran66@gmail.com');

drop policy if exists "Authorized owner can update catalog" on public.public_catalog_products;
create policy "Authorized owner can update catalog"
on public.public_catalog_products for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'josias.insfran66@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'josias.insfran66@gmail.com');

drop policy if exists "Authorized owner can delete catalog" on public.public_catalog_products;
create policy "Authorized owner can delete catalog"
on public.public_catalog_products for delete
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'josias.insfran66@gmail.com');

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
