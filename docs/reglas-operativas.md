# Reglas Operativas Del Proyecto

## Preservacion de datos

- Ningun cambio de interfaz, modulo, reporte, permiso o publicacion puede borrar, resetear o pisar datos existentes.
- Todo dato operativo nuevo debe quedar conectado al estado persistente online antes de considerarse terminado.
- Si se agrega una entidad nueva, debe incluirse en el snapshot operativo, sincronizacion, estado pendiente/sincronizado y documentacion.
- La app no debe refrescar datos desde la nube si existen cambios locales pendientes de guardar.
- Un estado `sincronizado` solo puede mostrarse despues de que Supabase confirme el guardado; nunca por un temporizador o una simulacion visual.
- Cuando dos ventanas guarden datos operativos, la aplicacion debe recuperar la version online, conservar los registros locales pendientes y reintentar. Un conflicto no puede dejar bloqueada la operacion ni ocultar cambios ya confirmados.
- Antes de guardar en Supabase, la app mantiene una copia local temporal de seguridad para evitar perdida ante errores de red, refresh o deploy.
- Solo se eliminan datos definitivos cuando el dueño lo pide expresamente; por defecto se usa anulacion, baja logica o historial.
- Antes de publicar, hay que correr build y pruebas y verificar que el paquete publicado incluya el cambio.
- Los datos demo o de ejemplo no pueden entrar en produccion ni mezclarse con operaciones reales. En produccion, si no hay datos en Supabase, la app debe arrancar vacia y esperar datos reales.
- Si una copia local o un snapshot online trae semillas viejas conocidas, el sistema debe filtrarlas antes de mostrar o guardar estado operativo.
- Una anulacion de venta debe quedar como baja logica con auditoria; no debe contarse en caja, reportes ni tesoreria, salvo que el dueño la restaure.

## Regla para futuras modificaciones

Cada nueva funcion debe responder estas preguntas antes de publicarse:

1. Donde se guarda el dato.
2. Como se recupera despues de actualizar la pagina.
3. Que pasa si falla internet o Supabase.
4. Que rol puede verlo o modificarlo.
5. Como se evita pisar informacion ya cargada.
6. Que queda registrado en historial o auditoria.
7. Como se evita que datos demo reaparezcan en produccion.

## Documentacion obligatoria

- Todo cambio importante debe quedar documentado en el mismo turno de trabajo.
- Si el cambio modifica comportamiento, datos, permisos, seguridad, ecommerce, caja, stock, compras, gastos, clientes, proveedores, deploy o backups, debe agregarse una entrada en `docs/decisiones.md`.
- Si el cambio afecta flujos de uso, debe actualizarse `docs/flujos.md` o el documento operativo correspondiente.
- Si el cambio afecta datos, debe actualizarse `docs/modelo-datos.md`, `docs/online-local-produccion.md` o `docs/auditoria-seguridad.md`, segun corresponda.
- Si el trabajo se delega a subagentes, el agente principal o el gerente de subagentes debe asegurar que la documentacion quede actualizada antes de cerrar la tarea.
- Un cambio no se considera terminado si funciona en pantalla pero no queda explicado donde corresponde.
