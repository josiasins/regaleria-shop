# Plataforma Online Para Regaleria

Sistema web para administrar una regaleria fisica: stock, ventas, presupuestos, comprobantes internos, gastos, transferencias manuales, panel de control y catalogo preparado para ecommerce.

## Estado actual

La V1 implementada es un prototipo funcional online con datos iniciales y estructura preparada para conectar backend/PostgreSQL. Incluye:

- Panel de control.
- Caja rapida.
- Ventas recientes con comprobante interno PDF.
- Control de stock con variantes y codigos de barra.
- Presupuestos convertibles a venta.
- Transferencias manuales.
- Carga de gastos.
- Catalogo publicable.
- Asistentes IA conectables a OpenAI para compras y fotos de producto.
- Estados de sincronizacion para preparar offline parcial.
- PWA instalable en Chrome.
- Base conectada a Supabase: PostgreSQL, Auth, roles reales, Storage, backups y dominios.
- Documentacion de decisiones, roadmap, modelo de datos y flujos.

## Ejecutar

```bash
npm install
npm run dev
```

## OpenAI

La clave de OpenAI se configura del lado servidor/local, nunca en el navegador.

Crear un archivo `.env.local` o exportar la variable antes de iniciar:

```bash
OPENAI_API_KEY=tu_clave
OPENAI_TEXT_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1
npm run dev
```

Si `OPENAI_API_KEY` no existe, la app mantiene el modo demo para que compras y catalogo sigan funcionando sin romper el flujo.

Las imagenes generadas se guardan como archivos publicos en:

```text
public/generated/products
```

## Supabase Y Dominios

Crear `.env.local` desde `.env.example` y completar:

```bash
cp .env.example .env.local
```

Dominios definidos:

- Web publica: `regaleriashop.com`.
- Sistema interno: `sistema.regaleriashop.com`.

Supabase queda como backend/base/login/storage. Para servir el frontend online se recomienda iniciar con hosting gratuito tipo Vercel, Netlify o Cloudflare Pages y conectar los dominios alli.

Mas detalle en `docs/online-local-produccion.md`.

## Chrome

La app incluye manifest y service worker para instalarse desde Chrome como app. El service worker prioriza red antes que cache para evitar versiones viejas. El offline operativo real todavia requiere conectar cola local + Supabase.

## Backups

Con `DATABASE_URL` configurada:

```bash
npm run backup
```

## Verificar

```bash
npm run build
npm test
```

## Documentacion

La carpeta `docs/` contiene:

- `vision.md`: objetivo del producto.
- `decisiones.md`: linea de tiempo de decisiones.
- `roadmap.md`: etapas futuras.
- `modelo-datos.md`: entidades principales.
- `flujos.md`: flujos operativos clave.
- `prompts-ia.md`: prompts actuales y criterios de optimizacion.
- `auditoria-seguridad.md`: estado de seguridad, roles, RLS, auditoria y verificaciones.
