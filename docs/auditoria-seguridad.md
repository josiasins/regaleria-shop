# Auditoria De Seguridad Y Confiabilidad

Fecha: 2026-07-02.

## Estado aplicado

- Los productos del catalogo se preservaron: 45 productos, 45 publicados.
- La operacion demo fue limpiada: 0 ventas, 0 gastos y 0 movimientos demo.
- El movimiento de capital real existente se preservo.
- Los dueños activos viven en Supabase en `public.app_users`.
- El rol efectivo de la cuenta se consulta con `public.current_app_role()`.
- El selector de rol queda bloqueado en produccion; ya no sirve para escalar permisos desde la interfaz.
- Las acciones de auditoria sensibles se validan en Supabase con `public.audit_operational_state`.
- La contraseña local de auditoria fue eliminada del frontend.
- El guardado operativo usa control de version con `expected_updated_at`.
- El service worker ahora prioriza red antes que cache para evitar versiones viejas despues de publicar.
- La funcion de emails requiere `EMAIL_CRON_SECRET`.
- La funcion de pedido web recalcula el total desde catalogo y aplica limite por email/hora.

## Riesgos controlados

- Datos demo: bloqueados por limpieza en Supabase y filtro en frontend.
- Acceso interno: requiere Supabase Auth y rol activo en `app_users`.
- Auditoria de ventas/turnos: solo dueño real en Supabase.
- Pisar cambios entre equipos: mitigado con version de snapshot.
- Version vieja por PWA: mitigado con network-first.

## Pendientes externos

- Configurar `EMAIL_CRON_SECRET` en Supabase Functions y en el cron que invoque la funcion.
- Programar backup diario fuera de la app, usando `npm run backup` o backup administrado de Supabase.
- Hacer una prueba mensual de restauracion.
- Migrar la web publica a hosting con headers configurables si se necesita CSP/HSTS igual al sistema interno.

## Comandos de verificacion

```bash
npm test -- --run
npm run build
npm audit
```

Consulta rapida de estado:

```sql
select *
from public.app_users
order by email;

select jsonb_build_object(
  'catalog_products', (select count(*) from public.public_catalog_products),
  'published_products', (select count(*) from public.public_catalog_products where publishable),
  'operational_rows', (select count(*) from public.operational_state),
  'sales', coalesce((select jsonb_array_length(data->'sales') from public.operational_state where id='main'), 0),
  'expenses', coalesce((select jsonb_array_length(data->'expenses') from public.operational_state where id='main'), 0),
  'capital', coalesce((select jsonb_array_length(data->'capitalEntries') from public.operational_state where id='main'), 0)
) as state;
```
