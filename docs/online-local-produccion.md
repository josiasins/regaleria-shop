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
- `public/brand/icon.png`.

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

## Configuracion visual de la tienda

- `supabase/storefront.sql` crea la configuracion publica y su historial auditable.
- La tienda anonima tiene lectura de `storefront_settings`.
- Solo dueño y administrador ejecutan `save_storefront_settings`.
- La web abierta escucha cambios de `storefront_settings` mediante Supabase Realtime. El catálogo público se vuelve a consultar cada diez segundos mediante `get_public_catalog`, porque el rol anónimo no puede leer el JSON comercial completo.
- Lifestyle y la foto premium de catalogo se ejecutan en la API interna de Render y guardan una propuesta PNG en `product-images`.
- El servicio requiere `OPENAI_API_KEY` y admite `OPENAI_LIFESTYLE_IMAGE_MODEL` y `OPENAI_CATALOG_IMAGE_MODEL`; el valor recomendado para ambos es `gpt-image-2`.
- La API valida la sesion de Supabase y el rol de dueño/administrador. Generar un archivo no actualiza el producto ni la vidriera: la incorporacion y el guardado siguen siendo acciones explicitas en el editor.

Despues de aplicar `supabase/storefront.sql` por una conexion SQL directa, refrescar la cache de la API:

```sql
notify pgrst, 'reload schema';
```

En desarrollo local, `/api/ai/lifestyle` reutiliza `OPENAI_API_KEY` desde el entorno del servidor de Vite. En produccion, el navegador llama al mismo endpoint en la API interna usando la sesion vigente. La clave no se entrega al navegador.

Las rutas `/api/ai/catalog-image`, `/api/ai/lifestyle` y `/api/ai/product-enrichment` usan la misma validacion de sesion en local y produccion. Las dos primeras guardan propuestas en `product-images`; la tercera devuelve texto estructurado y no persiste nada. El editor nunca publica ni guarda una propuesta por sí solo.

## API interna de imagenes

- Servicio: `regaleria-shop-api` en Render (`srv-d9laccm7bikc738mke90`).
- URL: `https://regaleria-shop-api.onrender.com`.
- Inicio: `npm run start:api`.
- Salud: `/health`.
- Rutas protegidas: `/api/ai/catalog-image`, `/api/ai/lifestyle` y `/api/ai/product-enrichment`.
- Optimización protegida: `/api/images/optimize`.
- Origen admitido: `https://sistema.regaleriashop.com`.
- Variables requeridas: `OPENAI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `INTERNAL_APP_ORIGINS`.
- El sitio interno recibe `VITE_INTERNAL_API_URL` durante su compilacion.
- La clave de OpenAI nunca se incluye en el bundle ni se envia al navegador.
- La cabecera `Content-Security-Policy` del sitio interno debe incluir `https://regaleria-shop-api.onrender.com` en `connect-src`. No usar `*`.

## Pedidos ecommerce

- La web anónima ejecuta `create_store_order_v3`; PostgreSQL recalcula precio, stock, packs, ahorro y envoltorio y construye los correos. Durante una actualización compatible, el cliente puede usar `create_store_order` si V3 todavía no existe.
- El sistema autenticado lee `store_orders` y actualiza mediante `manage_store_order`.
- `store_order_events` conserva la auditoría separada del JSON legible del pedido.
- `expire_store_orders` libera reservas pendientes después de 48 horas. Si `pg_cron` está activo se ejecuta cada 15 minutos.
- La cancelación es idempotente: una segunda solicitud no vuelve a sumar stock.
- Antes y después de cualquier migración o despliegue se verifica la cantidad de productos y se ejecuta backup.

## Rendimiento de imágenes públicas

- `image_assets` guarda el manifiesto de derivados; anon puede leerlo, pero no escribir.
- `/api/images/optimize` exige sesión de dueño o administrador.
- Los derivados viven en `product-images/optimized/<hash>/<ancho>.webp` con caché anual.
- La tienda usa URLs directas de Supabase y no un proxy dinámico de Render.
- En `Web pública > Vidriera pública`, dueño y administrador pueden ejecutar `Optimizar imágenes` para preparar la biblioteca histórica y ver el avance.
- La carga de una foto nueva dispara la misma preparación en segundo plano.
- Un fallo de optimización conserva el original como fallback.

### Validación productiva del 30/07/2026

- API publicada en Render con Node 22 y commit `087d318`.
- 53 imágenes originales preparadas; cada una tiene derivados WebP de 320, 640, 1280 y 1920 px.
- Los originales se conservan sin reemplazo: 21,06 MB.
- El conjunto completo de derivados ocupa 8,76 MB.
- En viewport móvil de 390 px, el navegador eligió 320 px para tarjetas y 640 px para el hero.
- Control de integridad posterior: 45 productos y 1 pedido online, sin cambios.

La vista previa del editor comparte por `sessionStorage` unicamente el borrador visual y una copia de solo lectura del catalogo. No comparte ventas, turnos, compras, pagos ni otros datos operativos, y no permite confirmar pedidos reales desde el marco de previsualizacion.

Para que esa vista previa funcione en Render sin permitir que sitios externos incrusten el sistema, las cabeceras del sitio interno deben conservar:

```text
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: ...; frame-ancestors 'self'
```

No volver a `DENY` o `frame-ancestors 'none'`, porque bloquearia tambien la vista previa del mismo dominio. No usar valores abiertos como `*`.

# Sincronizacion Entre Sistema Y Web

El sistema interno y la web publica usan `public.public_catalog_products` en Supabase como fuente comun del catalogo.

- El usuario interno autenticado puede crear y actualizar productos.
- La web publica solo puede leer filas con `publishable = true`.
- Los cambios de nombre, fotos, descripcion, precio, stock y visibilidad se guardan al realizar la operacion interna correspondiente.
- Ambas aplicaciones cargan el catalogo al abrir y vuelven a consultarlo cada diez segundos.
- La sincronizacion interna comienza despues de validar el ingreso con Google.
- Un producto ocultado deja de aparecer en la siguiente actualizacion de la web publica.
