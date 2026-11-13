-- Data-preserving migration. Run only after a verified external dump.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists app_private.business_history (
  id bigint generated always as identity primary key,
  entity text not null, entity_id text not null,
  before_data jsonb, after_data jsonb,
  actor_id uuid, reason text not null, created_at timestamptz not null default clock_timestamp()
);
create table if not exists app_private.business_backups (
  id bigint generated always as identity primary key,
  data jsonb not null, created_at timestamptz not null default clock_timestamp()
);
alter table app_private.business_history enable row level security;
alter table app_private.business_backups enable row level security;
revoke all on all tables in schema app_private from public, anon, authenticated;
revoke all on all sequences in schema app_private from public, anon, authenticated;

-- NULL means unauthorized, including expired/deactivated/non-business sessions.
do $block$
declare fn record; definition text;
begin
  for fn in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('delete_catalog_product','save_storefront_settings','save_image_asset','manage_store_order','audit_operational_state')
  loop
    definition := pg_get_functiondef(fn.oid);
    definition := replace(definition, 'if public.current_app_role() not in', 'if coalesce(public.current_app_role(), '''') not in');
    definition := replace(definition, 'if public.current_app_role() <>', 'if coalesce(public.current_app_role(), '''') <>');
    execute definition;
  end loop;
end $block$;

create or replace function app_private.validate_operations(previous jsonb, incoming jsonb)
returns void language plpgsql set search_path = '' as $body$
declare field text; old_record jsonb; new_record jsonb;
begin
  if jsonb_typeof(incoming) is distinct from 'object' or pg_column_size(incoming)>15000000 then
    raise exception 'Invalid operational snapshot' using errcode='22023';
  end if;
  for field in select jsonb_object_keys(coalesce(previous,'{}')) loop
    if not incoming ? field then raise exception 'Preservation guard: missing field %',field using errcode='22023'; end if;
  end loop;
  foreach field in array array['products','sales','quotes','transfers','expenses','movements','onlineOrders','purchaseReceipts','customers','suppliers','cashClosures','cashShifts','supplierPayments','capitalEntries','emailMessages','salesAuditEntries','operationAuditEntries'] loop
    if jsonb_typeof(incoming->field) is distinct from 'array' then raise exception 'Invalid array %',field using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(incoming->field) r where jsonb_typeof(r)<>'object' or coalesce(r->>'id','')='')
      or (select count(*) from jsonb_array_elements(incoming->field))<>(select count(distinct r->>'id') from jsonb_array_elements(incoming->field) r) then
      raise exception 'Invalid or duplicated IDs in %',field using errcode='22023';
    end if;
    for old_record in select value from jsonb_array_elements(coalesce(previous->field,'[]')) loop
      select value into new_record from jsonb_array_elements(incoming->field) where value->>'id'=old_record->>'id';
      if new_record is null and not (field='products' and exists(select 1 from public.public_catalog_products p where p.id=old_record->>'id' and p.data ? 'deletedAt')) then
        raise exception 'Preservation guard: record missing in %',field using errcode='22023';
      end if;
      if field='sales' and old_record ? 'payments' and exists(
        select 1 from jsonb_array_elements(old_record->'payments') pay
        where not exists(select 1 from jsonb_array_elements(coalesce(new_record->'payments','[]')) np where np->>'id'=pay->>'id')
      ) then raise exception 'Preservation guard: payment removed' using errcode='22023'; end if;
    end loop;
  end loop;
  if jsonb_typeof(incoming->'businessProfile') is distinct from 'object' or jsonb_typeof(incoming->'rolePermissions') is distinct from 'object' or jsonb_typeof(incoming->'categories') is distinct from 'array' then
    raise exception 'Invalid business configuration' using errcode='22023';
  end if;
end $body$;

create or replace function app_private.capture_business_history()
returns trigger language plpgsql security definer set search_path = '' as $body$
begin
  if tg_table_name='operational_state' then
    if tg_op='DELETE' then raise exception 'Operational records cannot be deleted'; end if;
    perform app_private.validate_operations(old.data,new.data);
  end if;
  insert into app_private.business_history(entity,entity_id,before_data,after_data,actor_id,reason)
  values(tg_table_name,old.id,old.data,case when tg_op='DELETE' then null else new.data end,auth.uid(),
    coalesce(nullif(current_setting('app.change_reason',true),''),tg_op));
  if tg_op='DELETE' then return old; end if;
  return new;
end $body$;
drop trigger if exists preserve_operational_history on public.operational_state;
create trigger preserve_operational_history before update or delete on public.operational_state for each row execute function app_private.capture_business_history();
drop trigger if exists preserve_catalog_history on public.public_catalog_products;
create trigger preserve_catalog_history before update or delete on public.public_catalog_products for each row execute function app_private.capture_business_history();

create or replace function app_private.snapshot_business()
returns void language sql security definer set search_path = '' as $body$
  insert into app_private.business_backups(data) select jsonb_build_object(
    'operations',(select jsonb_agg(to_jsonb(x)) from public.operational_state x),
    'catalog',(select jsonb_agg(to_jsonb(x)) from public.public_catalog_products x),
    'orders',(select jsonb_agg(to_jsonb(x)) from public.store_orders x),
    'orderEvents',(select jsonb_agg(to_jsonb(x)) from public.store_order_events x),
    'emails',(select jsonb_agg(to_jsonb(x)) from public.store_email_queue x),
    'storefront',(select jsonb_agg(to_jsonb(x)) from public.storefront_settings x),
    'storefrontHistory',(select jsonb_agg(to_jsonb(x)) from public.storefront_settings_history x),
    'users',(select jsonb_agg(to_jsonb(x)) from public.app_users x)
  );
$body$;
select app_private.snapshot_business();

-- Old clients cannot bypass version checking or write whole JSON directly.
revoke insert,update,delete on public.operational_state from anon,authenticated,public;
revoke select on public.operational_state from anon,authenticated,public;
drop policy if exists "Internal users read operational state" on public.operational_state;
drop policy if exists "Internal users insert operational state" on public.operational_state;
drop policy if exists "Internal users update operational state" on public.operational_state;
revoke all on function public.save_operational_state(jsonb) from public,anon,authenticated;
revoke all on function public.save_operational_state(jsonb,text) from public,anon,authenticated;
revoke all on function public.audit_operational_state(jsonb,text) from public,anon,authenticated;
revoke insert,update,delete on public.public_catalog_products from public,anon,authenticated;
revoke all on function public.save_catalog_product(text,boolean,jsonb) from public,anon,authenticated;

create or replace function public.load_operational_state_v2()
returns jsonb language plpgsql security definer set search_path = '' as $body$
declare result jsonb; state_data jsonb;
begin
  if auth.uid() is null or not coalesce(public.is_internal_user(),false) then raise exception 'Not authorized' using errcode='42501'; end if;
  select jsonb_build_object('data',s.data,'updated_at',s.updated_at) into result from public.operational_state s where id='main';
  if result is null then raise exception 'Operational state is missing; restore required'; end if;
  state_data := result->'data';
  select jsonb_set(state_data,'{products}',coalesce(jsonb_agg(p.data || jsonb_build_object('cloudUpdatedAt',p.updated_at,'syncStatus','sincronizado')),'[]')) into state_data
    from public.public_catalog_products p where not p.data ? 'deletedAt';
  if public.current_app_role()<>'dueno' then state_data:=jsonb_set(state_data,'{capitalEntries}','[]'); end if;
  return jsonb_set(result,'{data}',state_data);
end $body$;

create or replace function app_private.commit_product(product_data jsonb)
returns void language plpgsql set search_path = '' as $body$
declare current_product public.public_catalog_products; variant jsonb; actor text := coalesce(public.current_app_role(),'');
begin
  if actor not in ('dueno','administrador','encargado','cajero') then raise exception 'Not authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext('regaleria-catalog-integrity'));
  select * into current_product from public.public_catalog_products where id=product_data->>'id' for update;
  if found and (product_data->>'cloudUpdatedAt' is null or (product_data->>'cloudUpdatedAt')::timestamptz<>current_product.updated_at) then
    raise exception 'Catalog changed remotely' using errcode='40001';
  end if;
  if current_product.data ? 'deletedAt' then raise exception 'Product was archived'; end if;
  if jsonb_typeof(product_data->'variants') is distinct from 'array' or coalesce(product_data->>'name','')='' then raise exception 'Invalid product'; end if;
  if actor in ('encargado','cajero') and (
    current_product.id is null or (product_data-'variants'-'syncStatus'-'cloudUpdatedAt') is distinct from (current_product.data-'variants'-'syncStatus'-'cloudUpdatedAt')
    or (select jsonb_agg(v-'stock') from jsonb_array_elements(product_data->'variants')v) is distinct from (select jsonb_agg(v-'stock') from jsonb_array_elements(current_product.data->'variants')v)
  ) then raise exception 'Only owners and administrators may edit product definitions' using errcode='42501'; end if;
  if (select count(*) from jsonb_array_elements(product_data->'variants'))<>(select count(distinct v->>'id') from jsonb_array_elements(product_data->'variants')v) then raise exception 'Duplicated variants'; end if;
  for variant in select value from jsonb_array_elements(product_data->'variants') loop
    if coalesce(variant->>'id','')='' or coalesce(trim(variant->>'sku'),'')='' or (variant->>'stock')::numeric<0 or (variant->>'price')::numeric<0 or (variant->>'cost')::numeric<0 then raise exception 'Invalid variant'; end if;
    if exists(select 1 from public.public_catalog_products p cross join lateral jsonb_array_elements(p.data->'variants')v
      where not p.data ? 'deletedAt' and p.id<>product_data->>'id' and
      (lower(trim(v->>'sku'))=lower(trim(variant->>'sku')) or (coalesce(trim(variant->>'barcode'),'')<>'' and trim(v->>'barcode')=trim(variant->>'barcode'))))
      or (select count(*) from jsonb_array_elements(product_data->'variants')v where lower(trim(v->>'sku'))=lower(trim(variant->>'sku')))>1
      or (coalesce(trim(variant->>'barcode'),'')<>'' and (select count(*) from jsonb_array_elements(product_data->'variants')v where trim(v->>'barcode')=trim(variant->>'barcode'))>1)
    then raise exception 'SKU or barcode already exists' using errcode='23505'; end if;
  end loop;
  insert into public.public_catalog_products(id,publishable,data,updated_at) values(product_data->>'id',(product_data->>'publishable')::boolean,
    (product_data-'cloudUpdatedAt') || '{"syncStatus":"sincronizado"}',clock_timestamp())
  on conflict(id) do update set publishable=excluded.publishable,data=excluded.data,updated_at=excluded.updated_at;
end $body$;

create or replace function public.save_operational_state_v2(state_data jsonb,expected_updated_at text,changed_product_ids text[] default '{}',audit_reason text default '')
returns jsonb language plpgsql security definer set search_path = '' as $body$
declare current_row public.operational_state; actor text:=coalesce(public.current_app_role(),''); product_id text; product_data jsonb; field text; next_time timestamptz; old_sale jsonb; new_sale jsonb;
begin
  if auth.uid() is null or actor not in ('dueno','administrador','encargado','cajero') then raise exception 'Not authorized' using errcode='42501'; end if;
  if expected_updated_at is null or expected_updated_at='' then raise exception 'A confirmed version is required' using errcode='40001'; end if;
  select * into current_row from public.operational_state where id='main' for update;
  if not found then raise exception 'State missing: restore required'; end if;
  if current_row.updated_at<>expected_updated_at::timestamptz then raise exception 'Operational state changed remotely' using errcode='40001'; end if;
  if actor<>'dueno' then
    if coalesce(state_data->'capitalEntries','[]')<>'[]' then raise exception 'Capital is owner-only' using errcode='42501'; end if;
    state_data:=jsonb_set(state_data,'{capitalEntries}',current_row.data->'capitalEntries');
  end if;
  if actor not in ('dueno','administrador') and (state_data->'rolePermissions' is distinct from current_row.data->'rolePermissions' or state_data->'businessProfile' is distinct from current_row.data->'businessProfile') then raise exception 'Not authorized to change settings' using errcode='42501'; end if;
  if coalesce(audit_reason,'')<>'' and (actor<>'dueno' or length(trim(audit_reason))<5) then raise exception 'Owner and audit reason required' using errcode='42501'; end if;
  -- Ordinary saves may add collections/payments, but sensitive sale corrections
  -- must use the owner audit path. Direct table writes are revoked.
  for old_sale in select value from jsonb_array_elements(current_row.data->'sales') loop
    select value into new_sale from jsonb_array_elements(state_data->'sales') where value->>'id'=old_sale->>'id';
    if new_sale is not null and coalesce(audit_reason,'')='' and (old_sale-'payments'-'paidAmount'-'paymentStatus'-'syncStatus') is distinct from (new_sale-'payments'-'paidAmount'-'paymentStatus'-'syncStatus') then raise exception 'Sale correction requires owner audit' using errcode='42501'; end if;
  end loop;
  if coalesce(audit_reason,'')='' then
    for new_sale in select value from jsonb_array_elements(state_data->'sales') loop
      select value into old_sale from jsonb_array_elements(current_row.data->'sales') where value->>'id'=new_sale->>'id';
      if exists(select 1 from jsonb_array_elements(coalesce(old_sale->'payments','[]')) p where not exists(select 1 from jsonb_array_elements(coalesce(new_sale->'payments','[]')) n where n=p)) then raise exception 'Existing collections require owner audit' using errcode='42501'; end if;
      if new_sale ? 'payments' and ((select coalesce(sum((p->>'amount')::numeric),0) from jsonb_array_elements(new_sale->'payments')p) > (new_sale->>'total')::numeric or exists(select 1 from jsonb_array_elements(new_sale->'payments')p where (p->>'amount')::numeric<=0)) then raise exception 'Invalid sale collections' using errcode='22023'; end if;
    end loop;
  end if;
  perform app_private.validate_operations(current_row.data,state_data);
  perform set_config('app.change_reason',coalesce(nullif(trim(audit_reason),''),'Operational save'),true);
  for product_id in select distinct unnest(changed_product_ids) order by 1 loop
    select value into product_data from jsonb_array_elements(state_data->'products') where value->>'id'=product_id;
    if product_data is null then raise exception 'Changed product missing'; end if;
    perform app_private.commit_product(product_data);
  end loop;
  select jsonb_set(state_data,'{products}',coalesce(jsonb_agg(p.data || jsonb_build_object('cloudUpdatedAt',p.updated_at,'syncStatus','sincronizado')),'[]')) into state_data
    from public.public_catalog_products p where not p.data ? 'deletedAt';
  foreach field in array array['sales','quotes','transfers','expenses','movements','onlineOrders','purchaseReceipts','customers','suppliers','cashClosures','cashShifts','supplierPayments','capitalEntries'] loop
    state_data:=jsonb_set(state_data,array[field],coalesce((select jsonb_agg(x || '{"syncStatus":"sincronizado"}') from jsonb_array_elements(state_data->field)x),'[]'));
  end loop;
  next_time:=clock_timestamp(); state_data:=jsonb_set(state_data,'{updatedAt}',to_jsonb(next_time::text));
  update public.operational_state set data=state_data,updated_at=next_time,updated_by=auth.uid() where id='main';
  return public.load_operational_state_v2();
end $body$;

-- Archive a product; retain its definitions, stock and history for recovery.
create or replace function public.delete_catalog_product(product_id text)
returns void language plpgsql security definer set search_path = '' as $body$
begin
  if auth.uid() is null or coalesce(public.current_app_role(),'') not in ('dueno','administrador') then raise exception 'Not authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext('regaleria-catalog-integrity'));
  perform set_config('app.change_reason','Product archived by authorized user',true);
  update public.public_catalog_products set publishable=false,data=data || jsonb_build_object('deletedAt',clock_timestamp(),'publishable',false),updated_at=clock_timestamp() where id=product_id and not data ? 'deletedAt';
end $body$;

-- Public checkout responses never include costs, payments, customer records or
-- internal events for an existing ID supplied by an untrusted caller.
create or replace function app_private.public_order_result(value jsonb)
returns jsonb language sql immutable set search_path = '' as $body$
  select jsonb_build_object('id',value->'id','number',value->'number','status',value->'status','total',value->'total',
    'lines',(select jsonb_agg(v-'unitCost') from jsonb_array_elements(value->'lines')v),'giftOptions',value->'giftOptions','syncStatus','sincronizado');
$body$;
do $block$
declare definition text;
begin
  select pg_get_functiondef('public.create_store_order_v3(jsonb)'::regprocedure) into definition;
  definition:=replace(definition,'return existing_order;','return app_private.public_order_result(existing_order);');
  definition:=replace(definition,'return stored_order;','return app_private.public_order_result(stored_order);');
  execute definition;
end $block$;

revoke all on all functions in schema app_private from public,anon,authenticated;
revoke all on function public.load_operational_state_v2() from public,anon,authenticated;
revoke all on function public.save_operational_state_v2(jsonb,text,text[],text) from public,anon,authenticated;
grant execute on function public.load_operational_state_v2(),public.save_operational_state_v2(jsonb,text,text[],text) to authenticated;
grant execute on function public.delete_catalog_product(text) to authenticated;
-- No automatic replay of months-old notification emails.
update public.store_email_queue set status='requiere_revision',data=data || '{"status":"requiere_revision"}' where status='pendiente' and created_at<now()-interval '24 hours';
do $schedule$
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('regaleria-daily-business-snapshot','0 5 * * *','select app_private.snapshot_business();');
  end if;
end $schedule$;
notify pgrst,'reload schema';
commit;
