-- Checkout v3: promociones y opciones de regalo validadas en PostgreSQL.
-- Migracion aditiva. No actualiza ni elimina pedidos o productos existentes.

drop policy if exists "Public can read published catalog" on public.public_catalog_products;
revoke select on public.public_catalog_products from anon;

create or replace function public.create_store_order_v3(order_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_order jsonb;
  stored_order jsonb;
  enriched_lines jsonb;
  storefront_data jsonb;
  commerce_data jsonb;
  gift_data jsonb;
  bundle_group record;
  bundle_data jsonb;
  expected_ids text;
  actual_ids text;
  regular_total numeric;
  pack_price numeric;
  bundle_discount numeric := 0;
  gift_wrap_price numeric := 0;
  safe_dedication text;
  bundle_summaries jsonb := '[]'::jsonb;
  final_total numeric;
begin
  if left(trim(coalesce(order_data->>'id', '')), 100) = '' then
    raise exception 'Pedido incompleto';
  end if;

  perform pg_advisory_xact_lock(hashtext(left(trim(order_data->>'id'), 100)));

  select data into existing_order
  from public.store_orders
  where id = left(trim(order_data->>'id'), 100);

  if existing_order is not null then
    return existing_order;
  end if;

  -- La funcion anterior conserva toda la validacion de identidad, precio,
  -- disponibilidad, reserva, emails y limite de frecuencia.
  perform public.create_store_order(order_data, '[]'::jsonb);

  select data into stored_order
  from public.store_orders
  where id = left(trim(order_data->>'id'), 100)
  for update;

  if stored_order is null then
    raise exception 'No se pudo confirmar el pedido';
  end if;

  select data into storefront_data
  from public.storefront_settings
  where id = 'main';

  commerce_data := coalesce(storefront_data->'commerce', '{}'::jsonb);
  gift_data := coalesce(order_data->'giftOptions', '{}'::jsonb);
  safe_dedication := left(trim(coalesce(gift_data->>'dedication', '')), 240);

  if coalesce((gift_data->>'giftWrap')::boolean, false) then
    gift_wrap_price := greatest(0, coalesce((commerce_data->>'giftWrapPrice')::numeric, 0));
  end if;

  for bundle_group in
    select
      line->>'bundleId' as bundle_id,
      line->>'bundleInstanceId' as instance_id
    from jsonb_array_elements(coalesce(order_data->'lines', '[]'::jsonb)) as line
    where coalesce(line->>'bundleId', '') <> ''
       or coalesce(line->>'bundleInstanceId', '') <> ''
    group by line->>'bundleId', line->>'bundleInstanceId'
  loop
    if coalesce(bundle_group.bundle_id, '') = '' or coalesce(bundle_group.instance_id, '') = '' then
      raise exception 'Pack incompleto';
    end if;

    select value into bundle_data
    from jsonb_array_elements(coalesce(commerce_data->'bundles', '[]'::jsonb))
    where value->>'id' = bundle_group.bundle_id
      and coalesce((value->>'visible')::boolean, false)
    limit 1;

    if bundle_data is null then
      raise exception 'Uno de los packs ya no esta disponible';
    end if;

    select string_agg(value #>> '{}', '|' order by value #>> '{}')
    into expected_ids
    from jsonb_array_elements(coalesce(bundle_data->'productIds', '[]'::jsonb));

    select string_agg(line->>'productId', '|' order by line->>'productId')
    into actual_ids
    from jsonb_array_elements(order_data->'lines') as line
    where line->>'bundleId' = bundle_group.bundle_id
      and line->>'bundleInstanceId' = bundle_group.instance_id
      and coalesce((line->>'quantity')::integer, 0) = 1;

    if expected_ids is null or expected_ids <> actual_ids then
      raise exception 'Los productos del pack no coinciden';
    end if;

    select coalesce(sum((saved->>'unitPrice')::numeric), 0)
    into regular_total
    from jsonb_array_elements(stored_order->'lines') as saved
    where exists (
      select 1
      from jsonb_array_elements(order_data->'lines') as original
      where original->>'bundleId' = bundle_group.bundle_id
        and original->>'bundleInstanceId' = bundle_group.instance_id
        and original->>'productId' = saved->>'productId'
        and original->>'variantId' = saved->>'variantId'
    );

    pack_price := greatest(0, coalesce((bundle_data->>'packPrice')::numeric, 0));
    if pack_price <= 0 or pack_price >= regular_total then
      raise exception 'El pack no tiene un ahorro valido';
    end if;

    bundle_discount := bundle_discount + (regular_total - pack_price);
    bundle_summaries := bundle_summaries || jsonb_build_array(jsonb_build_object(
      'id', bundle_group.bundle_id,
      'title', left(coalesce(bundle_data->>'title', 'Pack'), 120),
      'instanceId', bundle_group.instance_id,
      'saving', regular_total - pack_price
    ));
  end loop;

  select jsonb_agg(
    saved || coalesce((
      select jsonb_build_object(
        'bundleId', original->>'bundleId',
        'bundleInstanceId', original->>'bundleInstanceId'
      )
      from jsonb_array_elements(order_data->'lines') as original
      where original->>'productId' = saved->>'productId'
        and original->>'variantId' = saved->>'variantId'
        and coalesce(original->>'bundleId', '') <> ''
      limit 1
    ), '{}'::jsonb)
  )
  into enriched_lines
  from jsonb_array_elements(stored_order->'lines') as saved;

  final_total := greatest(0, (stored_order->>'total')::numeric - bundle_discount + gift_wrap_price);
  stored_order := stored_order
    || jsonb_build_object(
      'lines', coalesce(enriched_lines, stored_order->'lines'),
      'discount', bundle_discount,
      'bundles', bundle_summaries,
      'giftOptions', jsonb_build_object(
        'giftWrap', coalesce((gift_data->>'giftWrap')::boolean, false),
        'dedication', safe_dedication,
        'directToRecipient', coalesce((gift_data->>'directToRecipient')::boolean, false)
      ),
      'total', final_total
    );

  update public.store_orders
  set data = stored_order,
      status = coalesce(stored_order->>'status', status)
  where id = stored_order->>'id';

  update public.store_email_queue
  set data = jsonb_set(
    data,
    '{html}',
    to_jsonb(
      regexp_replace(
        coalesce(data->>'html', ''),
        'Total: \$ [0-9.]+',
        'Total: $ ' || final_total::text
      )
    )
  )
  where order_id = stored_order->>'id';

  return stored_order;
end;
$$;

revoke all on function public.create_store_order_v3(jsonb) from public, anon, authenticated;
grant execute on function public.create_store_order_v3(jsonb) to anon, authenticated;
