# Producto

## Registro

product

## Usuarios

- Dueño de regaleria: necesita ver ventas, margen, compras, gastos, caja, stock y decisiones.
- Administrador: opera casi todo el sistema y mantiene configuracion.
- Encargado: gestiona mostrador, stock, compras, clientes y catalogo sin acceso a la agenda ni datos de proveedores.
- Cajero: cobra, arma presupuestos, consulta clientes y confirma transferencias.

## Proposito

Plataforma web interna para administrar una regaleria fisica y preparar su crecimiento online. La app centraliza stock, ventas, compras, gastos, clientes, proveedores, transferencias, catalogo publicable, pedidos web, configuracion y reportes.

## Principios

- Primero operacion diaria: cobrar, buscar, cargar stock y cerrar caja debe ser rapido.
- Simplificar significa reducir decisiones visuales y pasos de navegacion, no quitar controles necesarios ni crear caminos alternativos para la misma operacion.
- La edicion aparece bajo demanda; las pantallas principales priorizan lectura y escaneo.
- Cada cambio importante deja historial o estado de sincronizacion.
- Los datos operativos ya registrados se preservan entre versiones: una mejora no puede reiniciarlos, reemplazarlos por demo ni alterar su significado. Las correcciones y cobros agregan historial auditable.
- Los cambios de interfaz se mantienen separados de la logica persistente y deben probar que ventas, turnos, pagos, stock y auditoria conservan su comportamiento.
- El sistema es online en V1, pero conserva base para offline parcial.
- Los datos repetibles, como categorias, clientes y proveedores, se administran como listas reutilizables.
- La IA queda limitada a precarga documental de compras; las imágenes de producto se gestionan manualmente.
- La tienda pública debe funcionar como ecommerce real: categorías dinámicas, búsqueda, ficha de producto, carrito, pedidos persistentes y comunicaciones.

## Anti-referencias

- No parecer una landing page ni un dashboard decorativo.
- No esconder acciones frecuentes en modales innecesarios.
- No depender de campos de texto libres cuando una lista administrable evita errores.
- No mezclar comprobantes internos con facturacion fiscal.
- No permitir que la IA modifique stock, costos o publicaciones sin aprobacion de una persona.
