# Propuestas De Mejora

## Prioridad Alta

- Persistir ventas, compras, clientes, proveedores y caja en Supabase; hoy el catálogo y los pedidos web son las áreas online reales.
- Agregar estados de pedido: confirmado, preparando, listo, enviado, entregado y cancelado.
- Incorporar pago online y conciliación antes de prometer checkout completamente automático.
- Crear reglas de envío por localidad, importe mínimo y retiro.

## Prioridad Media

- Separar costos y proveedores en permisos explícitos, no sólo por visibilidad de sección.
- Agregar edición masiva de precios y stock.
- Incorporar historial de cambios por producto.
- Crear cupones, promociones y productos destacados.
- Generar sitemap dinámico por producto cuando existan rutas públicas permanentes.

## Simplificaciones Recomendadas

- Mantener la IA sólo en precarga de compras hasta que el OCR tenga precisión comprobada.
- Evitar duplicar edición de producto entre Stock y Catálogo: Stock para cantidades/variantes, Catálogo para contenido web.
- Mantener una sola agenda de clientes y proveedores, reutilizada en todos los módulos.
