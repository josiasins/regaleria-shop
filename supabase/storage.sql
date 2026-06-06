insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('purchase-documents', 'purchase-documents', false),
  ('transfer-receipts', 'transfer-receipts', false),
  ('expense-documents', 'expense-documents', false)
on conflict (id) do nothing;

drop policy if exists "Public product images are readable" on storage.objects;

create policy "Public product images are readable"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Authenticated users can manage business files" on storage.objects;

create policy "Authorized owner can manage business files"
on storage.objects for all
to authenticated
using (
  bucket_id in ('product-images', 'purchase-documents', 'transfer-receipts', 'expense-documents')
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'josias.insfran66@gmail.com'
)
with check (
  bucket_id in ('product-images', 'purchase-documents', 'transfer-receipts', 'expense-documents')
  and lower(coalesce(auth.jwt() ->> 'email', '')) = 'josias.insfran66@gmail.com'
);
