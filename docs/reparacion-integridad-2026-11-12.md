# Reparación de integridad y seguridad

Solicitud del dueño: corregir los riesgos de sobrescritura y seguridad detectados el 12/11/2026 y recuperar la información histórica.

## Plan y preservación

1. Respaldo completo previo conservado en la carpeta privada `backups`; su huella y el plan de recuperación no se publican en el repositorio. Índice de restauración validado; esquema público y datos operativos restaurados en PostgreSQL local aislado para la prueba.
2. Migración aditiva `supabase/migrations/20261113012024_protect_operational_data.sql`. Revoca las escrituras antiguas, conserva historial privado, exige versión y bloqueo de fila, protege IDs históricos y realiza los cambios de stock junto con la operación en una única transacción. Una versión antigua de la aplicación debe actualizarse para guardar.
3. Recuperación: `scripts/recover-operational-history.mjs` produce un plan sin escribir la base. Solo incorpora IDs faltantes del respaldo del 30/07/2026. Mantiene los registros actuales, configuración, catálogo y stock actuales. Excluye los IDs de demostración identificados. El modo de aplicación exige la huella exacta del estado revisado y vuelve a comprobarla dentro de un bloqueo de fila.
4. Resolver los tres SKU duplicados asignando un código distinto a una de las dos variantes de cada grupo y conservando su código anterior en `previousSku`. No modificar precios ni cantidades.
5. Probar persistencia, conflictos concurrentes, privacidad de capital y permisos en una base desechable. Publicar solo tras superar pruebas, compilación y análisis de dependencias.
6. Mantener respaldo diario en la base y copia completa local con inventario y verificación de imágenes. La copia local requiere que este Mac esté encendido; no equivale a una copia independiente fuera de este equipo.

## Límites explícitos

- No se puede atribuir la pérdida anterior a un usuario o cambio específico: faltaba historial suficiente.
- Los correos antiguos se conservan para revisión y no se reenvían automáticamente. Activar envíos requiere verificar Resend y el remitente; nunca se solicita ni se almacena una clave en el frontend.
- No se eliminan las tablas heredadas de Prisma ni el esquema de referencia. Se retiran únicamente las dependencias sin uso en la aplicación, que trabaja con Supabase.
- No se restaura el respaldo completo encima de producción. Los archivos originales y las conexiones se preservan.

## Resultado aplicado

- Protección principal aplicada a producción sin modificar la huella ni los conteos del estado existente.
- Recuperados por ID los registros históricos faltantes de ventas (incluidas sus bajas), compras, gastos, movimientos, contactos, turnos, pagos, capital y auditorías. El detalle cuantitativo queda en el plan privado de recuperación. Se conserva el pedido web en su tabla autoritativa; el catálogo y su stock no se restauraron hacia atrás.
- Tres SKU duplicados resueltos; cada variante renombrada conserva `previousSku`. Comprobación transaccional: ninguna cantidad, costo o precio de variantes cambió.
- Los tres correos antiguos pasan a `requiere_revision`; no se envió ninguno. Se aplicaron reserva transaccional de cola, reintentos limitados y exclusión de mensajes antiguos. El worker actualizado está preparado en código; no puede desplegarse ni activarse sin acceso de administración al proyecto y la configuración del proveedor/remitente.
- Copia diaria dentro de Supabase: trabajo `regaleria-daily-business-snapshot`, 05:00 UTC (02:00 Argentina). Historial antes/después en `app_private.business_history`.
- Copia local diaria: LaunchAgent `com.regaleriashop.verified-backup`, a las 02:00 locales. No contiene credenciales: el proceso consulta los archivos de conexión existentes. No ejecuta ventas, cambios de stock ni envía correos.
- Respaldo posterior e inventario de imágenes verificados con SHA256. Los archivos y resultados detallados están en `backups/latest-status.json` y los manifiestos privados; no se incluyen respaldos ni importes del negocio en el repositorio.
- Scripts de administración y respaldo verifican certificado y nombre del servidor PostgreSQL con la CA pública de Supabase. Se preservaron los valores de las conexiones. Archivos `.env` y respaldos con permisos privados.
- Protección adicional aplicada: `20261113020013_prevent_accidental_hard_deletes.sql` bloquea borrados físicos y vaciados de tablas críticas e historial. Se probaron los rechazos en la base desechable y se conservó la huella del estado de producción.
