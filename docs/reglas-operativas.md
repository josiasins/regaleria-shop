# Reglas Operativas Del Proyecto

## Preservacion de datos

- Ningun cambio de interfaz, modulo, reporte, permiso o publicacion puede borrar, resetear o pisar datos existentes.
- Todo dato operativo nuevo debe quedar conectado al estado persistente online antes de considerarse terminado.
- Si se agrega una entidad nueva, debe incluirse en el snapshot operativo, sincronizacion, estado pendiente/sincronizado y documentacion.
- La app no debe refrescar datos desde la nube si existen cambios locales pendientes de guardar.
- Antes de guardar en Supabase, la app mantiene una copia local temporal de seguridad para evitar perdida ante errores de red, refresh o deploy.
- Solo se eliminan datos definitivos cuando el dueño lo pide expresamente; por defecto se usa anulacion, baja logica o historial.
- Antes de publicar, hay que correr build y pruebas y verificar que el paquete publicado incluya el cambio.

## Regla para futuras modificaciones

Cada nueva funcion debe responder estas preguntas antes de publicarse:

1. Donde se guarda el dato.
2. Como se recupera despues de actualizar la pagina.
3. Que pasa si falla internet o Supabase.
4. Que rol puede verlo o modificarlo.
5. Como se evita pisar informacion ya cargada.
6. Que queda registrado en historial o auditoria.
