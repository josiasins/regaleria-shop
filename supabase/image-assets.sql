-- Variantes livianas para la tienda publica.
-- Los originales no se modifican ni se reemplazan.

create table if not exists public.image_assets (
  original_url text primary key,
  content_hash text not null,
  original_bytes bigint not null default 0,
  variants jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.image_assets enable row level security;
revoke all on public.image_assets from public, anon, authenticated;
grant select on public.image_assets to anon, authenticated;

drop policy if exists "Public reads optimized image variants" on public.image_assets;
create policy "Public reads optimized image variants"
on public.image_assets for select
to anon, authenticated
using (true);

create or replace function public.save_image_asset(
  source_url text,
  source_hash text,
  source_bytes bigint,
  generated_variants jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() not in ('dueno', 'administrador') then
    raise exception 'No autorizado para optimizar imagenes';
  end if;
  if coalesce(source_url, '') = ''
    or coalesce(source_hash, '') = ''
    or jsonb_array_length(coalesce(generated_variants, '[]'::jsonb)) = 0 then
    raise exception 'Variantes de imagen incompletas';
  end if;

  insert into public.image_assets (original_url, content_hash, original_bytes, variants, updated_at)
  values (source_url, source_hash, greatest(source_bytes, 0), generated_variants, now())
  on conflict (original_url) do update
  set content_hash = excluded.content_hash,
      original_bytes = excluded.original_bytes,
      variants = excluded.variants,
      updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_image_asset(text, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.save_image_asset(text, text, bigint, jsonb) to authenticated;
