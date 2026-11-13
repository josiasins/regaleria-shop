# Regla De Preservacion De Datos Operativos

## Compromiso permanente

Ventas, turnos, cobros, compras, gastos, capital, movimientos de stock, clientes, proveedores, presupuestos y auditorias son registros operativos del negocio. Una mejora de interfaz, una nueva funcion o una publicacion no puede reiniciarlos, reemplazarlos por datos demo ni borrarlos de forma implicita.

## Reglas de implementacion

1. Toda nueva funcion debe leer y escribir el estado operativo persistente en Supabase; no puede depender solo de datos en memoria o ejemplos locales.
2. Las correcciones sensibles se registran como una accion de auditoria con fecha, responsable, motivo y respaldo antes/despues.
3. Para cobros, pagos, anulaciones y restauraciones se agregan eventos. No se reemplaza silenciosamente la historia anterior.
4. Los formatos nuevos mantienen compatibilidad con registros existentes. Cuando un dato historico no tenga un campo nuevo, se interpreta de manera estable y documentada, sin modificarlo al cargar.
5. Una publicacion debe incluir compilacion y pruebas; no se permite ejecutar migraciones destructivas, sembrar datos demo ni llamar a funciones de reinicio sin instruccion explicita del dueño.
6. Si un cambio exige transformar datos existentes, primero se documenta el plan de migracion, se conserva respaldo y se valida el resultado antes de ponerlo en produccion.
7. La configuracion visual del ecommerce vive en tablas separadas. Sus altas, cambios o restauraciones no pueden escribir sobre `public_catalog_products` ni `operational_state`.
8. Antes y despues de una migracion se comparan conteos de entidades criticas. El resultado se registra junto con la decision correspondiente.

## Caso particular: ventas y cobros

- Las ventas historicas que no tienen historial de cobros se interpretan como pagadas por el total y medio de pago que ya registraron.
- Una venta nueva puede quedar pagada, parcialmente cobrada o pendiente.
- Cada cobro posterior conserva importe, medio de pago, fecha/hora, turno y nota opcional.
- Los cierres de turno y de caja contabilizan los cobros ocurridos en ese periodo, no solamente las ventas creadas en ese periodo.

## Protección aplicada en noviembre de 2026

- La carga de datos es de solo lectura. Cualquier error o ausencia del estado bloquea las operaciones; no se inicializa un estado vacío.
- Las escrituras requieren una revisión confirmada y un bloqueo transaccional. El servidor rechaza versiones antiguas y la desaparición de IDs históricos. Stock y operación se confirman juntos.
- La cola del navegador se guarda inmediatamente con usuario y base común. Los cambios incompatibles se conservan para revisión; una fecha local nunca autoriza una restauración.
- El capital se filtra en el servidor. La tabla operativa completa y el historial privado no son accesibles directamente desde clientes.
- Las bajas de productos y turnos conservan sus datos. No ejecutar de nuevo los SQL históricos de inicialización sobre producción.
- Los respaldos se crean con `npm run backup -- --storage`. El archivo se considera completo solo tras validar el índice del dump y el inventario de imágenes. La carpeta `backups` y los archivos de conexión tienen permisos privados.
