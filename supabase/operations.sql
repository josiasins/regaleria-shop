create table if not exists public.operational_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.operational_state enable row level security;

drop policy if exists "Owner reads operational state" on public.operational_state;
create policy "Owner reads operational state"
on public.operational_state
for select
to authenticated
using (public.is_catalog_owner());

drop policy if exists "Owner inserts operational state" on public.operational_state;
create policy "Owner inserts operational state"
on public.operational_state
for insert
to authenticated
with check (public.is_catalog_owner());

drop policy if exists "Owner updates operational state" on public.operational_state;
create policy "Owner updates operational state"
on public.operational_state
for update
to authenticated
using (public.is_catalog_owner())
with check (public.is_catalog_owner());

create or replace function public.save_operational_state(state_data jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_catalog_owner() then
    raise exception 'Not authorized to update operational state';
  end if;

  insert into public.operational_state (id, data, updated_at, updated_by)
  values ('main', state_data, now(), auth.uid())
  on conflict (id) do update
  set data = excluded.data,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by;
end;
$$;

revoke all on function public.save_operational_state(jsonb) from public;
grant execute on function public.save_operational_state(jsonb) to authenticated;

grant select, insert, update on public.operational_state to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'operational_state'
  ) then
    alter publication supabase_realtime add table public.operational_state;
  end if;
end
$$;
