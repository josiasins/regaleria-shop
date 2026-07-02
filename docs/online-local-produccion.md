# Produccion, Chrome Y Supabase

## Decision

La app sera online como camino principal. Chrome sera el cliente oficial del negocio y se usara como app instalable mediante PWA. No se prepara instalador de escritorio tradicional.

## Arquitectura elegida

- Frontend: React/Vite, instalable en Chrome.
- Backend principal: Supabase.
- Base de datos: PostgreSQL en Supabase.
- Login: Supabase Auth.
- Archivos: Supabase Storage.
- Backups: `pg_dump` contra PostgreSQL y revision de Storage.
- Dominio publico: `regaleriashop.com`.
- Subdominio interno: `sistema.regaleriashop.com`.

## Supabase creado

- Organizacion creada: `Regaleria Shop`.
- Ref de organizacion: `cznokmshsldvjarjjfmb`.
- URL: `https://supabase.com/dashboard/org/cznokmshsldvjarjjfmb`.

Estado del proyecto PostgreSQL:

- Proyecto creado: `regaleria-shop`.
- Ref de proyecto: `nxfdxhixvgogxjenrfhr`.
- URL de API: `https://nxfdxhixvgogxjenrfhr.supabase.co`.
- Estado: Healthy.
- Base PostgreSQL sincronizada con `prisma/schema.prisma`.
- Buckets/politicas de Storage ejecutados desde `supabase/storage.sql`.
- Catalogo/pedidos ejecutados desde `supabase/catalog.sql` y `supabase/commerce.sql`.
- Estado operativo interno ejecutado desde `supabase/operations.sql`.
- Auth configurado con Site URL `https://sistema.regaleriashop.com`.
- Redirect URLs productivas configuradas: `https://sistema.regaleriashop.com/**` y `https://regaleriashop.com/**`.

## Hosting gratis configurado para iniciar

Supabase cubre backend, base, login y archivos. La app React se sirve desde hosting frontend gratuito.

Configuracion actual:

- Sistema interno: Render Static Site `regaleria-shop`.
- URL temporal interna: `https://regaleria-shop.onrender.com`.
- Dominio interno: `https://sistema.regaleriashop.com`.
- Web publica: GitHub Pages desde `josiasins/regaleria-shop`.
- Dominio publico: `https://regaleriashop.com`.
- Acceso interno: Supabase Auth con Google como metodo principal y email/contraseña como respaldo.

Nota: Render quedo limitado a un dominio personalizado en el plan actual, por eso la web publica se prepara con GitHub Pages en lugar de un segundo dominio custom en Render.

## DNS

Porkbun:

- `regaleriashop.com` esta en la cuenta.
- Registro interno cargado: `CNAME sistema -> regaleria-shop.onrender.com`.
- Render verifico `sistema.regaleriashop.com` y la URL responde por HTTPS.
- Existen registros MX/TXT de email y registros por defecto de Porkbun. No se borraron para evitar romper correo o configuraciones existentes.
- El dominio raiz `regaleriashop.com` apunta a GitHub Pages.
- `www.regaleriashop.com` apunta a GitHub Pages.

Estructura esperada:

| Host | Uso | Destino |
| --- | --- | --- |
| `@` | Web publica | GitHub Pages |
| `www` | Web publica | Alias futuro de GitHub Pages |
| `sistema` | Panel interno | `regaleria-shop.onrender.com` |

Supabase se configura desde variables de entorno y no necesita ser el destino directo del dominio principal salvo que se usen funciones o endpoints propios.

Registros actuales para GitHub Pages:

- `ALIAS regaleriashop.com -> josiasins.github.io`.
- `CNAME www.regaleriashop.com -> josiasins.github.io`.
- GitHub Pages ya tiene guardado `regaleriashop.com` como dominio custom.
- El sitio publico responde por HTTP. HTTPS esta pendiente de emision de certificado en GitHub Pages.

## Variables

Crear `.env.local` desde `.env.example`:

```bash
cp .env.example .env.local
```

Variables clave:

- `DATABASE_URL`: conexion PostgreSQL Supabase.
- `VITE_SUPABASE_URL`: URL publica del proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: clave publica anon de Supabase.

## Persistencia operativa

El sistema interno carga y guarda el estado del negocio en Supabase:

- `public_catalog_products`: productos, variantes, stock visible y datos publicables para la web.
- `store_orders`: pedidos hechos desde la web publica.
- `store_email_queue`: correos pendientes de ecommerce.
- `operational_state`: snapshot interno con ventas, turnos, compras, gastos, clientes, proveedores, presupuestos, transferencias, categorias, permisos y auditorias.

La operacion real debe usarse desde `sistema.regaleriashop.com` con Google/Auth. El rol efectivo se carga desde `public.app_users`; el selector de rol queda bloqueado en produccion.
- `VITE_PUBLIC_DOMAIN`: `regaleriashop.com`.
- `VITE_INTERNAL_DOMAIN`: `sistema.regaleriashop.com`.
- `OPENAI_API_KEY`: solo servidor/local, nunca expuesta al navegador.

## Acceso al sistema interno

`sistema.regaleriashop.com` y los dominios `onrender.com` quedan protegidos por Supabase Auth.

La web publica `regaleriashop.com` no muestra el menu interno ni requiere login; solo muestra la tienda inicial/ecommerce.

Correos internos autorizados como dueño en `public.app_users`:

- `josias.insfran66@gmail.com`.
- `iris.traghetti66@gmail.com`.

Metodo recomendado:

- Google OAuth desde Supabase Auth.
- Redirect productivo: `https://sistema.regaleriashop.com`.
- En Supabase debe estar habilitado el proveedor Google con Client ID y Client Secret de Google Cloud.

Para dejar el acceso realmente cerrado:

- Crear usuarios autorizados en Supabase Auth.
- Desactivar registro publico de usuarios si no se quiere permitir altas espontaneas.
- Mantener contrasenas fuera del codigo y fuera de variables `VITE_*`.

Estado actual:

- Usuario inicial creado en Supabase Auth.
- Registro publico de usuarios desactivado.
- Google OAuth habilitado con cliente web exclusivo `Regaleria Shop`.
- `josias.insfran66@gmail.com` agregado como usuario de prueba y acceso Google verificado de punta a punta contra `sistema.regaleriashop.com`.
- `iris.traghetti66@gmail.com` habilitado como segundo correo dueño en la app y en politicas de catalogo/archivos.
- Roles reales en `public.app_users` para impedir acceso interno a sesiones no autorizadas.
- Politicas de Storage preparadas para aceptar archivos privados solo de usuarios internos autorizados.
- Cargas hacia los endpoints locales de IA limitadas a 15 MB.
- Cabeceras de seguridad aplicadas en Render: CSP, bloqueo de iframes, HSTS, `nosniff`, permisos restringidos y politica de referencia.
- Clave publica de Supabase Auth corregida en local, GitHub Pages y Render.
- Pendiente: rotar la contraseña de PostgreSQL y actualizar las conexiones locales.

## Chrome instalable

La app incluye:

- `public/manifest.webmanifest`.
- `public/sw.js`.
- `public/icon.svg`.

Esto permite instalarla desde Chrome. El service worker prioriza red antes que cache para evitar versiones viejas despues de publicar. El offline operativo real sigue siendo una etapa futura: ventas simples, presupuestos, gastos y movimientos deberan guardar en cola local y sincronizar.

## Backups

Backup manual:

```bash
DATABASE_URL="postgresql://..." npm run backup
```

Por defecto guarda archivos en `./backups`. Se puede cambiar:

```bash
BACKUP_DIR="/ruta/backups" DATABASE_URL="postgresql://..." npm run backup
```

En produccion se recomienda:

- backup diario de PostgreSQL.
- revision semanal de restauracion.
- copia/versionado de archivos de Storage.
- registrar cada corrida en `BackupRun`.

## Roles reales

Los usuarios internos se administran en Supabase:

```sql
select * from public.app_users order by email;
```

Roles soportados:

- `dueno`
- `administrador`
- `encargado`
- `cajero`

Solo `dueno` puede ejecutar auditorias sensibles de ventas/turnos y ver Capital/Tesoreria. Para agregar usuarios, hacerlo desde SQL o desde una futura pantalla de usuarios conectada a `app_users`.

## Seguridad operativa aplicada

- `operational_state` usa control de version con `expected_updated_at`.
- Las auditorias sensibles pasan por `public.audit_operational_state`.
- `create_store_order` recalcula total desde el catalogo.
- `send-store-emails` requiere `EMAIL_CRON_SECRET`.

## Archivos

Buckets previstos en Supabase Storage:

- `product-images`: publico, imagenes de catalogo/ecommerce.
- `purchase-documents`: privado, facturas/remitos de compra.
- `transfer-receipts`: privado, comprobantes de transferencia.
- `expense-documents`: privado, comprobantes de gastos.

El SQL inicial esta en `supabase/storage.sql`.

# Sincronizacion Entre Sistema Y Web

El sistema interno y la web publica usan `public.public_catalog_products` en Supabase como fuente comun del catalogo.

- El usuario interno autenticado puede crear y actualizar productos.
- La web publica solo puede leer filas con `publishable = true`.
- Los cambios de nombre, fotos, descripcion, precio, stock y visibilidad se guardan al realizar la operacion interna correspondiente.
- Ambas aplicaciones cargan el catalogo al abrir y vuelven a consultarlo cada diez segundos.
- La sincronizacion interna comienza despues de validar el ingreso con Google.
- Un producto ocultado deja de aparecer en la siguiente actualizacion de la web publica.
