-- Checkout publico seguro y catalogo publico sin costos ni proveedores.
-- Es aditivo: no cambia ni elimina pedidos, productos o movimientos existentes.

create or replace function public.escape_store_text(value text)
returns text
language sql
immutable
strict
as $$
  select replace(replace(replace(replace(replace(value, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;')
$$;

revoke all on function public.escape_store_text(text) from public, anon, authenticated;

create or replace function public.get_public_catalog()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select
    (product.data - 'supplier' - 'syncStatus')
    || jsonb_build_object(
      'id', product.id,
      'publishable', product.publishable,
      'variants', coalesce(
        (
          select jsonb_agg((variant - 'cost') || jsonb_build_object('cost', 0))
          from jsonb_array_elements(coalesce(product.data->'variants', '[]'::jsonb)) as variant
        ),
        '[]'::jsonb
      )
    )
  from public.public_catalog_products as product
  where product.publishable = true
  order by product.updated_at desc;
$$;

revoke all on function public.get_public_catalog() from public, anon, authenticated;
grant execute on function public.get_public_catalog() to anon, authenticated;

create or replace function public.create_store_order(order_data jsonb, email_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  line_item jsonb;
  product_data jsonb;
  updated_variants jsonb;
  variant_data jsonb;
  current_stock integer;
  requested_quantity integer;
  unit_price numeric;
  unit_cost numeric;
  calculated_total numeric := 0;
  normalized_email text;
  normalized_name text;
  normalized_contact text;
  normalized_address text;
  normalized_delivery text;
  safe_number text;
  rate_window timestamptz := date_trunc('hour', now());
  rate_count integer;
  sanitized_lines jsonb := '[]'::jsonb;
  safe_order jsonb;
  order_id text;
  now_value timestamptz := now();
  order_event_id uuid := gen_random_uuid();
  client_email_id text;
  owner_email_id text;
begin
  order_id := left(trim(coalesce(order_data->>'id', '')), 100);
  normalized_email := lower(left(trim(coalesce(order_data->>'customerEmail', '')), 254));
  normalized_name := left(trim(coalesce(order_data->>'customerName', '')), 100);
  normalized_contact := left(trim(coalesce(order_data->>'customerContact', '')), 100);
  normalized_address := left(trim(coalesce(order_data->>'deliveryAddress', '')), 300);
  normalized_delivery := case when order_data->>'deliveryMethod' = 'envio' then 'envio' else 'retiro' end;

  if order_id = ''
    or normalized_name = ''
    or normalized_contact = ''
    or normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    or jsonb_array_length(coalesce(order_data->'lines', '[]'::jsonb)) = 0
    or jsonb_array_length(coalesce(order_data->'lines', '[]'::jsonb)) > 50
    or (normalized_delivery = 'envio' and normalized_address = '') then
    raise exception 'Pedido incompleto';
  end if;

  perform pg_advisory_xact_lock(hashtext(order_id));
  if exists (select 1 from public.store_orders where id = order_id) then
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
      raise exception 'Cantidad invalida';
    end if;

    select data into product_data
    from public.public_catalog_products
    where id = line_item->>'productId' and publishable = true
    for update;

    if product_data is null then
      raise exception 'Uno de los productos ya no esta disponible';
    end if;

    select variant into variant_data
    from jsonb_array_elements(coalesce(product_data->'variants', '[]'::jsonb)) as variant
    where variant->>'id' = line_item->>'variantId';

    if variant_data is null then
      raise exception 'Una de las variantes ya no esta disponible';
    end if;

    current_stock := coalesce((variant_data->>'stock')::integer, 0);
    unit_price := coalesce((variant_data->>'webPrice')::numeric, (variant_data->>'price')::numeric, 0);
    unit_cost := coalesce((variant_data->>'cost')::numeric, 0);
    if current_stock < requested_quantity or unit_price <= 0 then
      raise exception 'Stock o precio no disponible para %', product_data->>'name';
    end if;

    select jsonb_agg(
      case
        when variant->>'id' = line_item->>'variantId'
        then jsonb_set(variant, '{stock}', to_jsonb((variant->>'stock')::integer - requested_quantity))
        else variant
      end
    ) into updated_variants
    from jsonb_array_elements(product_data->'variants') as variant;

    update public.public_catalog_products
    set data = jsonb_set(data, '{variants}', updated_variants),
        updated_at = now_value
    where id = line_item->>'productId';

    calculated_total := calculated_total + requested_quantity * unit_price;
    sanitized_lines := sanitized_lines || jsonb_build_array(jsonb_build_object(
      'productId', line_item->>'productId',
      'variantId', line_item->>'variantId',
      'name', left(coalesce(product_data->>'name', 'Producto'), 160),
      'sku', left(coalesce(variant_data->>'sku', ''), 80),
      'quantity', requested_quantity,
      'unitPrice', unit_price,
      'unitCost', unit_cost
    ));
  end loop;

  safe_number := case
    when coalesce(order_data->>'number', '') ~ '^WEB-[0-9]{6}$' then order_data->>'number'
    else 'WEB-' || upper(substr(md5(order_id), 1, 8))
  end;
  safe_order := jsonb_build_object(
    'id', order_id,
    'number', safe_number,
    'customerName', normalized_name,
    'customerContact', normalized_contact,
    'customerEmail', normalized_email,
    'deliveryMethod', normalized_delivery,
    'deliveryAddress', normalized_address,
    'lines', sanitized_lines,
    'total', calculated_total,
    'status', 'nuevo',
    'paymentStatus', 'pendiente',
    'paidAmount', 0,
    'payments', '[]'::jsonb,
    'events', jsonb_build_array(jsonb_build_object(
      'id', order_event_id::text,
      'action', 'created',
      'reason', 'Pedido creado desde la tienda publica',
      'createdAt', now_value::text
    )),
    'createdAt', now_value::text,
    'updatedAt', now_value::text,
    'reservedUntil', (now_value + interval '48 hours')::text,
    'syncStatus', 'sincronizado'
  );

  insert into public.store_orders (id, customer_email, status, data, created_at)
  values (order_id, normalized_email, 'nuevo', safe_order, now_value);

  insert into public.store_order_events (id, order_id, action, reason, data, created_at)
  values (
    order_event_id,
    order_id,
    'created',
    'Pedido creado desde la tienda publica',
    jsonb_build_object('total', calculated_total),
    now_value
  );

  client_email_id := 'email_' || md5(order_id || ':cliente');
  owner_email_id := 'email_' || md5(order_id || ':negocio');

  insert into public.store_email_queue (id, order_id, recipient, kind, status, data, created_at)
  values (
    client_email_id,
    order_id,
    normalized_email,
    'confirmacion_pedido',
    'pendiente',
    jsonb_build_object(
      'id', client_email_id,
      'kind', 'confirmacion_pedido',
      'to', normalized_email,
      'subject', 'Recibimos tu pedido ' || safe_number,
      'html', '<h1>Pedido recibido</h1><p>Hola ' || public.escape_store_text(normalized_name)
        || ', recibimos tu pedido ' || safe_number || '.</p><p>Total: $ '
        || calculated_total::text || '</p>',
      'createdAt', now_value::text,
      'status', 'pendiente'
    ),
    now_value
  ), (
    owner_email_id,
    order_id,
    'josias.insfran66@gmail.com',
    'aviso_negocio',
    'pendiente',
    jsonb_build_object(
      'id', owner_email_id,
      'kind', 'aviso_negocio',
      'to', 'josias.insfran66@gmail.com',
      'subject', 'Nuevo pedido web ' || safe_number,
      'html', '<h1>Nuevo pedido web</h1><p>' || public.escape_store_text(normalized_name)
        || ' realizó el pedido ' || safe_number || '.</p><p>Total: $ '
        || calculated_total::text || '</p>',
      'createdAt', now_value::text,
      'status', 'pendiente'
    ),
    now_value
  );
end;
$$;

revoke all on function public.create_store_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_store_order(jsonb, jsonb) to anon, authenticated;

create or replace function public.expire_store_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
  line_item jsonb;
  product_data jsonb;
  updated_variants jsonb;
  expired_count integer := 0;
  now_value timestamptz := now();
  event_id uuid;
begin
  for target in
    select id, data
    from public.store_orders
    where status in ('nuevo', 'confirmado')
      and coalesce(data->>'paymentStatus', 'pendiente') = 'pendiente'
      and coalesce((data->>'reservedUntil')::timestamptz, created_at + interval '48 hours') <= now_value
    for update skip locked
  loop
    for line_item in
      select value from jsonb_array_elements(coalesce(target.data->'lines', '[]'::jsonb))
    loop
      select data into product_data
      from public.public_catalog_products
      where id = line_item->>'productId'
      for update;

      if product_data is not null and exists (
        select 1 from jsonb_array_elements(product_data->'variants') as variant
        where variant->>'id' = line_item->>'variantId'
      ) then
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
        ) into updated_variants
        from jsonb_array_elements(product_data->'variants') as variant;

        update public.public_catalog_products
        set data = jsonb_set(data, '{variants}', updated_variants),
            updated_at = now_value
        where id = line_item->>'productId';
      end if;
    end loop;

    event_id := gen_random_uuid();
    target.data := target.data || jsonb_build_object(
      'status', 'cancelado',
      'cancelledAt', now_value::text,
      'stockRestoredAt', now_value::text,
      'updatedAt', now_value::text,
      'syncStatus', 'sincronizado'
    );
    target.data := jsonb_set(
      target.data,
      '{events}',
      coalesce(target.data->'events', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', event_id::text,
        'action', 'expired',
        'reason', 'Reserva vencida sin pago confirmado',
        'createdAt', now_value::text
      )),
      true
    );

    update public.store_orders
    set status = 'cancelado', data = target.data
    where id = target.id;

    insert into public.store_order_events (id, order_id, action, reason, data, created_at)
    values (event_id, target.id, 'expired', 'Reserva vencida sin pago confirmado', '{}'::jsonb, now_value);
    expired_count := expired_count + 1;
  end loop;
  return expired_count;
end;
$$;

revoke all on function public.expire_store_orders() from public, anon, authenticated;

create extension if not exists pg_cron;

do $$
declare
  previous_job bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for previous_job in select jobid from cron.job where jobname = 'expire-stale-store-orders'
    loop
      perform cron.unschedule(previous_job);
    end loop;
    perform cron.schedule(
      'expire-stale-store-orders',
      '*/15 * * * *',
      'select public.expire_store_orders();'
    );
  end if;
end;
$$;
