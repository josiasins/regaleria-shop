-- Disposable local database only. The runner binds a private Unix socket.
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create table auth.users(id uuid primary key,email text);
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
grant usage on schema auth to public;
grant execute on all functions in schema auth to public;
create schema storage;
create table storage.objects(id uuid primary key,bucket_id text);
create publication supabase_realtime;
\ir ../../supabase/catalog.sql
\ir ../../supabase/commerce.sql
\ir ../../supabase/operations.sql
\ir ../../supabase/security-hardening.sql
\ir ../../supabase/storefront.sql
\ir ../../supabase/image-assets.sql
\ir ../../supabase/online-order-management.sql
\ir ../../supabase/storefront-commerce-v2.sql
\ir ../../supabase/storefront-commerce-v3.sql
\ir ../../supabase/migrations/20261113012024_protect_operational_data.sql
\ir ../../supabase/migrations/20261113014525_reliable_email_queue.sql
