begin;
create or replace function app_private.prevent_hard_delete()
returns trigger language plpgsql set search_path='' as $body$
begin raise exception 'Permanent deletion is disabled for business records; archive or restore by ID' using errcode='42501'; end $body$;
revoke all on function app_private.prevent_hard_delete() from public,anon,authenticated;
do $protect$
declare target text;
begin
  foreach target in array array['public.operational_state','public.public_catalog_products','public.store_orders','public.store_email_queue','public.store_order_events','public.storefront_settings','public.storefront_settings_history','app_private.business_history','app_private.business_backups'] loop
    execute format('create trigger prevent_accidental_hard_delete before delete or truncate on %s for each statement execute function app_private.prevent_hard_delete()',target);
  end loop;
end $protect$;
commit;
