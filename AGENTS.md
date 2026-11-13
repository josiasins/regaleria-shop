# Regalería Shop: conservación obligatoria

- Nunca reiniciar, limpiar, sembrar datos de demostración ni restaurar un dump completo sobre producción para cambiar la interfaz o publicar.
- Antes de tocar datos reales: respaldo verificado, plan de cambios y comparación de IDs/conteos. Conservar historial y archivos originales.
- Toda operación utiliza load_operational_state_v2 / save_operational_state_v2. Una lectura fallida bloquea el guardado. Exigir versión y mantener stock y operación en la misma transacción.
- No conceder escritura directa sobre operational_state o public_catalog_products a clientes, ni reactivar funciones de guardado antiguas. Los SQL históricos de inicialización no se vuelven a ejecutar en producción.
- No elegir una copia local por su timestamp. La cola local debe conservar usuario, base común y revisión; conflictos del mismo registro requieren revisión.
- Capital solo se entrega al dueño desde el servidor. Las autorizaciones rechazan NULL y usuarios sin rol activo. No confiar en el rol enviado por el cliente.
- No eliminar físicamente registros operativos. Usar anulación/baja lógica y conservar antes/después en el historial privado.
- Verificar con npm run verify y pruebas reales de persistencia/conflictos antes de publicar. Las pruebas de base son desechables y no deben usar DATABASE_URL de producción.
- No incluir secretos, respaldos ni archivos .env en Git, capturas o mensajes.
