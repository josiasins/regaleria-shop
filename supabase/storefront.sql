create table if not exists public.storefront_settings (
  id text primary key check (id = 'main'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.storefront_settings_history (
  id bigint generated always as identity primary key,
  settings_id text not null default 'main',
  before_data jsonb,
  after_data jsonb not null,
  changed_by text not null,
  created_at timestamptz not null default now()
);

alter table public.storefront_settings enable row level security;
alter table public.storefront_settings_history enable row level security;

drop policy if exists "Public reads storefront settings" on public.storefront_settings;
create policy "Public reads storefront settings"
on public.storefront_settings for select
to anon, authenticated
using (id = 'main');

drop policy if exists "Owners and admins read storefront history" on public.storefront_settings_history;
create policy "Owners and admins read storefront history"
on public.storefront_settings_history for select
to authenticated
using (public.current_app_role() in ('dueno', 'administrador'));

create or replace function public.save_storefront_settings(settings_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  previous_data jsonb;
  changed_at timestamptz := now();
  actor_email text;
begin
  if public.current_app_role() not in ('dueno', 'administrador') then
    raise exception 'Not authorized to update storefront settings';
  end if;

  if jsonb_typeof(settings_data) <> 'object' or coalesce((settings_data ->> 'version')::int, 0) <> 1 then
    raise exception 'Invalid storefront settings payload';
  end if;

  select data into previous_data
  from public.storefront_settings
  where id = 'main';

  select lower(coalesce(email, 'unknown'))
  into actor_email
  from auth.users
  where id = auth.uid();

  insert into public.storefront_settings (id, data, updated_at)
  values ('main', settings_data, changed_at)
  on conflict (id) do update
  set data = excluded.data,
      updated_at = excluded.updated_at;

  insert into public.storefront_settings_history (settings_id, before_data, after_data, changed_by, created_at)
  values ('main', previous_data, settings_data, coalesce(actor_email, 'unknown'), changed_at);

  return changed_at;
end;
$$;

revoke all on public.storefront_settings from public, anon, authenticated;
revoke all on public.storefront_settings_history from public, anon, authenticated;
revoke all on function public.save_storefront_settings(jsonb) from public, anon, authenticated;

grant select on public.storefront_settings to anon, authenticated;
grant select on public.storefront_settings_history to authenticated;
grant execute on function public.save_storefront_settings(jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'storefront_settings'
  ) then
    alter publication supabase_realtime add table public.storefront_settings;
  end if;
end
$$;
