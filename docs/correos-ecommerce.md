# Correos Ecommerce

## Mensajes generados

- Primera compra: bienvenida a Regaleria Shop.
- Cada compra: confirmación con número, total y modalidad de entrega.
- Cada compra: aviso interno al negocio.

Los mensajes se guardan en `store_email_queue`. La función `supabase/functions/send-store-emails` procesa pendientes mediante Resend.

## Activación pendiente

1. Verificar `regaleriashop.com` en Resend.
2. Crear `pedidos@regaleriashop.com`.
3. Configurar `RESEND_API_KEY`.
4. Configurar `STORE_EMAIL_FROM`.
5. Desplegar y programar `send-store-emails`.

La clave de Resend nunca debe incluirse en React ni en variables `VITE_*`.
