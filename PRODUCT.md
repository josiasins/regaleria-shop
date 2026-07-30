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
- La IA puede asistir la precarga documental y crear composiciones lifestyle a partir de dos o tres fotos reales. Nunca registra stock ni publica una imagen sin confirmacion humana.
- La tienda pública debe funcionar como ecommerce real: categorías dinámicas, búsqueda, ficha de producto, carrito, pedidos persistentes y comunicaciones.
- Un pedido web reserva stock en la misma fuente que usa el sistema interno, pero conserva su propio circuito de preparación, cobro, entrega, cancelación e historial.
- La gestión online debe permitir buscar pedidos, registrar pagos parciales, avanzar estados y devolver stock de forma idempotente al cancelar.
- La tienda pública consume imágenes derivadas livianas; los originales se conservan para edición y archivo.
- La presentacion de la tienda publica se administra aparte de los datos operativos. Cambiar una portada, una categoria visual o una coleccion no modifica productos, precios, stock ni pedidos.
- La venta asistida debe aportar valor sin presión artificial: como máximo tres relaciones relevantes, packs con ahorro real y alternativas por presupuesto.
- El buscador de regalos recomienda mediante datos configurados y stock real. La IA puede proponer texto comercial, pero no decide precio, existencia ni publicación.
- Precio anterior, cuotas, CFTEA, precio sin impuestos y etiquetas comerciales se muestran solamente cuando fueron verificados o configurados.

## Anti-referencias

- No parecer una landing page ni un dashboard decorativo.
- No esconder acciones frecuentes en modales innecesarios.
- No depender de campos de texto libres cuando una lista administrable evita errores.
- No mezclar comprobantes internos con facturacion fiscal.
- No permitir que la IA modifique stock, costos o publicaciones sin aprobacion de una persona.
