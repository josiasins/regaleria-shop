# Supabase database certificate

Public CA certificate, not a credential. Downloaded over HTTPS from
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
and used only with `sslmode=verify-full`, including hostname verification.
Expires 2021 CA on 2031-04-26; review rotation before that date.
Official instructions: https://supabase.com/docs/guides/platform/ssl-enforcement
