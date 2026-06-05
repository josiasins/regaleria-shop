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

Nota: Render quedo limitado a un dominio personalizado en el plan actual, por eso la web publica se prepara con GitHub Pages en lugar de un segundo dominio custom en Render.

## DNS

Porkbun:

- `regaleriashop.com` esta en la cuenta.
- Registro interno cargado: `CNAME sistema -> regaleria-shop.onrender.com`.
- Render verifico `sistema.regaleriashop.com` y la URL responde por HTTPS.
- Existen registros MX/TXT de email y registros por defecto de Porkbun. No se borraron para evitar romper correo o configuraciones existentes.
- El dominio raiz `regaleriashop.com` todavia redirige a Porkbun Link (`regaleriashop-com.l.ink`) hasta reemplazar el registro raiz.

Estructura esperada:

| Host | Uso | Destino |
| --- | --- | --- |
| `@` | Web publica | GitHub Pages |
| `www` | Web publica | Alias futuro de GitHub Pages |
| `sistema` | Panel interno | `regaleria-shop.onrender.com` |

Supabase se configura desde variables de entorno y no necesita ser el destino directo del dominio principal salvo que se usen funciones o endpoints propios.

Registros pendientes para GitHub Pages:

- Reemplazar el ALIAS raiz actual de Porkbun por los A records oficiales de GitHub Pages.
- Agregar `www` como CNAME hacia `josiasins.github.io` cuando se quiera activar `www.regaleriashop.com`.
- GitHub Pages ya tiene guardado `regaleriashop.com` como dominio custom; falta que el DNS publico apunte a GitHub para completar el chequeo.

## Variables

Crear `.env.local` desde `.env.example`:

```bash
cp .env.example .env.local
```

Variables clave:

- `DATABASE_URL`: conexion PostgreSQL Supabase.
- `VITE_SUPABASE_URL`: URL publica del proyecto Supabase.
- `VITE_SUPABASE_ANON_KEY`: clave publica anon de Supabase.
- `VITE_PUBLIC_DOMAIN`: `regaleriashop.com`.
- `VITE_INTERNAL_DOMAIN`: `sistema.regaleriashop.com`.
- `OPENAI_API_KEY`: solo servidor/local, nunca expuesta al navegador.

## Chrome instalable

La app incluye:

- `public/manifest.webmanifest`.
- `public/sw.js`.
- `public/icon.svg`.

Esto permite instalarla desde Chrome. El service worker cachea la carcasa de la app para abrirla sin conexion. El offline operativo real sigue siendo una etapa futura: ventas simples, presupuestos, gastos y movimientos deberan guardar en cola local y sincronizar.

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

## Archivos

Buckets previstos en Supabase Storage:

- `product-images`: publico, imagenes de catalogo/ecommerce.
- `purchase-documents`: privado, facturas/remitos de compra.
- `transfer-receipts`: privado, comprobantes de transferencia.
- `expense-documents`: privado, comprobantes de gastos.

El SQL inicial esta en `supabase/storage.sql`.
