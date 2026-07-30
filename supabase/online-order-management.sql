-- Gestion interna aditiva para los pedidos creados por la tienda publica.
-- No migra ni elimina pedidos existentes: completa sus campos al primer cambio.

create table if not exists public.store_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.store_orders(id) on delete cascade,
  action text not null,
  reason text not null,
  actor_email text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists store_order_events_order_created_idx
  on public.store_order_events (order_id, created_at desc);

alter table public.store_order_events enable row level security;
revoke all on public.store_order_events from anon, authenticated, public;
grant select on public.store_order_events to authenticated;

drop policy if exists "Internal users read store order events" on public.store_order_events;
create policy "Internal users read store order events"
on public.store_order_events
for select to authenticated
using (public.is_internal_user());

create or replace function public.manage_store_order(
  target_order_id text,
  order_action text,
  action_data jsonb default '{}'::jsonb,
  action_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_data jsonb;
  next_data jsonb;
  current_status text;
  next_status text;
  payment_data jsonb;
  payment_amount numeric;
  current_paid numeric;
  next_paid numeric;
  payment_status text;
  line_item jsonb;
  product_data jsonb;
  updated_variants jsonb;
  variant_found boolean;
  event_id uuid := gen_random_uuid();
  now_value timestamptz := now();
  actor_email text := lower(coalesce((auth.jwt()->>'email'), ''));
begin
  if public.current_app_role() not in ('dueno', 'administrador', 'encargado') then
    raise exception 'No autorizado para gestionar pedidos web';
  end if;

  if length(trim(coalesce(action_reason, ''))) < 3 then
    raise exception 'El motivo es obligatorio';
  end if;

  select data, status
    into current_data, current_status
  from public.store_orders
  where id = target_order_id
  for update;

  if current_data is null then
    raise exception 'Pedido no encontrado';
  end if;

  next_data := current_data;
  current_status := coalesce(current_data->>'status', current_status, 'nuevo');

  if order_action = 'set_status' then
    next_status := action_data->>'status';
    if current_status = 'cancelado' then
      raise exception 'Un pedido cancelado no puede cambiar de estado';
    end if;
    if next_status not in ('nuevo', 'confirmado', 'preparando', 'listo', 'entregado') then
      raise exception 'Estado de pedido invalido';
    end if;
    next_data := jsonb_set(next_data, '{status}', to_jsonb(next_status), true);

  elsif order_action = 'add_payment' then
    if current_status = 'cancelado' then
      raise exception 'No se puede cobrar un pedido cancelado';
    end if;
    payment_data := action_data->'payment';
    payment_amount := coalesce((payment_data->>'amount')::numeric, 0);
    current_paid := coalesce((next_data->>'paidAmount')::numeric, 0);
    if payment_amount <= 0 then
      raise exception 'El importe debe ser mayor a cero';
    end if;
    if current_paid + payment_amount > coalesce((next_data->>'total')::numeric, 0) then
      raise exception 'El pago supera el saldo pendiente';
    end if;
    payment_data := payment_data
      || jsonb_build_object(
        'id', 'web_payment_' || event_id::text,
        'createdAt', now_value::text,
        'createdBy', actor_email
      );
    next_paid := current_paid + payment_amount;
    payment_status := case
      when next_paid >= coalesce((next_data->>'total')::numeric, 0) then 'pagado'
      else 'parcial'
    end;
    next_data := jsonb_set(
      next_data,
      '{payments}',
      coalesce(next_data->'payments', '[]'::jsonb) || jsonb_build_array(payment_data),
      true
    );
    next_data := jsonb_set(next_data, '{paidAmount}', to_jsonb(next_paid), true);
    next_data := jsonb_set(next_data, '{paymentStatus}', to_jsonb(payment_status), true);
    if current_status = 'nuevo' then
      next_data := jsonb_set(next_data, '{status}', '"confirmado"'::jsonb, true);
      next_status := 'confirmado';
    end if;

  elsif order_action = 'update_delivery' then
    if current_status = 'cancelado' then
      raise exception 'No se puede editar un pedido cancelado';
    end if;
    if action_data->'delivery'->>'deliveryMethod' not in ('retiro', 'envio') then
      raise exception 'Modalidad de entrega invalida';
    end if;
    next_data := next_data || jsonb_build_object(
      'deliveryMethod', action_data->'delivery'->>'deliveryMethod',
      'deliveryAddress', coalesce(action_data->'delivery'->>'deliveryAddress', ''),
      'trackingCode', coalesce(action_data->'delivery'->>'trackingCode', ''),
      'internalNote', coalesce(action_data->'delivery'->>'internalNote', '')
    );

  elsif order_action = 'cancel' then
    if current_status = 'cancelado' then
      return current_data;
    end if;

    for line_item in
      select value from jsonb_array_elements(coalesce(current_data->'lines', '[]'::jsonb))
    loop
      select data
        into product_data
      from public.public_catalog_products
      where id = line_item->>'productId'
      for update;

      if product_data is null then
        raise exception 'No se pudo devolver stock del producto %', line_item->>'productId';
      end if;

      select jsonb_agg(
        case
          when variant->>'id' = line_item->>'variantId'
          then jsonb_set(
            variant,
            '{stock}',
            to_jsonb((variant->>'stock')::integer + (line_item->>'quantity')::integer)
          )
          else variant
        end
      )
      into updated_variants
      from jsonb_array_elements(product_data->'variants') as variant;

      select exists (
        select 1
        from jsonb_array_elements(product_data->'variants') as variant
        where variant->>'id' = line_item->>'variantId'
      ) into variant_found;

      if updated_variants is null or not variant_found then
        raise exception 'No se pudo devolver stock de la variante %', line_item->>'variantId';
      end if;

      update public.public_catalog_products
      set data = jsonb_set(data, '{variants}', updated_variants),
          updated_at = now_value
      where id = line_item->>'productId';
    end loop;

    next_status := 'cancelado';
    next_data := next_data || jsonb_build_object(
      'status', 'cancelado',
      'cancelledAt', now_value::text,
      'stockRestoredAt', now_value::text,
      'paymentStatus', case
        when coalesce((next_data->>'paidAmount')::numeric, 0) > 0 then 'reembolso_pendiente'
        else coalesce(next_data->>'paymentStatus', 'pendiente')
      end
    );
  else
    raise exception 'Accion de pedido invalida';
  end if;

  next_data := next_data || jsonb_build_object(
    'updatedAt', now_value::text,
    'syncStatus', 'sincronizado'
  );
  next_data := jsonb_set(
    next_data,
    '{events}',
    coalesce(next_data->'events', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'id', event_id::text,
        'action', order_action,
        'reason', trim(action_reason),
        'createdAt', now_value::text,
        'createdBy', actor_email,
        'data', action_data
      )
    ),
    true
  );

  update public.store_orders
  set status = coalesce(next_data->>'status', current_status),
      data = next_data
  where id = target_order_id;

  insert into public.store_order_events (id, order_id, action, reason, actor_email, data, created_at)
  values (event_id, target_order_id, order_action, trim(action_reason), actor_email, action_data, now_value);

  return next_data;
end;
$$;

revoke all on function public.manage_store_order(text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.manage_store_order(text, text, jsonb, text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'store_orders'
  ) then
    alter publication supabase_realtime add table public.store_orders;
  end if;
end;
$$;
