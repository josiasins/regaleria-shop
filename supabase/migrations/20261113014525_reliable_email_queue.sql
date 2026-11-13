begin;
alter table public.store_email_queue add column if not exists attempt_count integer not null default 0;
alter table public.store_email_queue add column if not exists processing_started_at timestamptz;
alter table public.store_email_queue add column if not exists provider_message_id text;
alter table public.store_email_queue add column if not exists last_error text;
create or replace function public.claim_store_email_batch(batch_size integer default 25)
returns setof public.store_email_queue language plpgsql security definer set search_path='' as $body$
begin
  update public.store_email_queue set status='requiere_revision',data=data||'{"status":"requiere_revision"}' where status in ('pendiente','fallo') and created_at<now()-interval '24 hours';
  return query with candidates as (
    select id from public.store_email_queue
    where created_at>=now()-interval '24 hours' and attempt_count<3 and
      (status in ('pendiente','fallo') or (status='procesando' and processing_started_at<now()-interval '3 minutes'))
    order by created_at for update skip locked limit greatest(1,least(coalesce(batch_size,25),25))
  ) update public.store_email_queue q set status='procesando',data=q.data||'{"status":"procesando"}',processing_started_at=clock_timestamp(),attempt_count=q.attempt_count+1,last_error=null
    from candidates c where c.id=q.id returning q.*;
end $body$;
revoke all on function public.claim_store_email_batch(integer) from public,anon,authenticated;
grant execute on function public.claim_store_email_batch(integer) to service_role;
notify pgrst,'reload schema';
commit;
