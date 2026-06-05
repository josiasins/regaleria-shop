# Roadmap

## Estado general

- [x] Etapas 1 a 7 implementadas como V1 funcional/prototipo operativo.
- [x] Documentacion inicial, decisiones, modelo de datos y flujos actualizados.
- [ ] Etapas 8 y 9 quedan futuras: automatizacion de transferencias e integracion AFIP.
- [ ] Pendiente de decision: avanzar con automatizacion de transferencias, AFIP, offline real o pulido operativo.

## Etapa 1: Base del proyecto

- [x] App web optimizada para Chrome.
- [x] Una sola plataforma modular.
- [x] Roles base: dueño, administrador, encargado y cajero.
- [x] Estados de sincronizacion: sincronizado, pendiente, con conflicto y fallo.
- [x] Documentacion de vision, decisiones, modelo y flujos.
- [x] Modelo PostgreSQL inicial.
- [x] Configuracion como seccion central para ajustes del sistema.

## Etapa 2: Stock completo

- [x] Alta de productos con primera variante.
- [x] Busqueda por producto, SKU o codigo de barra.
- [x] Variantes, codigos de barra, proveedores y categorias.
- [x] Proveedores como agenda editable y reutilizable.
- [x] Movimientos de ingreso, ajuste, venta, devolucion y perdida/rotura.
- [x] Historial auditable de movimientos.
- [x] Edicion avanzada de variantes desde Stock.
- [x] Importacion masiva simple de productos.

## Etapa 3: Ventas y presupuestos

- [x] Caja rapida.
- [x] Venta detallada con varias lineas, cliente, descuento y medio de pago.
- [x] Consumidor final como opcion de venta.
- [x] Clientes como agenda editable y reutilizable.
- [x] Presupuestos nuevos con varias lineas.
- [x] Presupuestos convertibles a venta con descuento de stock al convertir.
- [x] Comprobantes internos PDF.
- [x] Permisos finos de descuento por rol.
- [x] Notas internas por venta y presupuesto.

## Etapa 4: Finanzas operativas

- [x] Gastos con resumen por categoria.
- [x] Compras con factura/remito, ingreso de stock y gasto automatico de reposicion.
- [x] Proveedor seleccionable o creable desde compras.
- [x] Transferencias manuales asociadas a ventas o presupuestos.
- [x] Panel con margen, caja, pedidos web y decisiones sugeridas.
- [x] Cierre de caja diario.
- [x] Turno de caja de mostrador con efectivo inicial separado de tesoreria.
- [x] Bloqueo de ventas sin turno abierto.
- [x] Cierre de turno con ventas del turno, efectivo esperado y detalle.
- [x] Cuentas por proveedor y pagos parciales.

## Etapa 5: Catalogo publicable

- [x] Fichas enriquecidas con fotos y descripcion.
- [x] Preparacion para web publica.
- [x] Control visible de productos publicables u ocultos.
- [x] Vista de catalogo en cuadricula.
- [x] Vista de catalogo en lista.
- [x] Edicion bajo demanda con boton Editar.
- [x] Categoria como desplegable precargado.
- [x] Proveedor como seleccion desde agenda.
- [x] Categoria, proveedor, estado web y stock como chips de lectura.
- [x] Filtros por categoria, proveedor y estado web.
- [x] Busqueda especifica dentro de catalogo.
- [x] Galeria de varias fotos por producto.

## Etapa 6: Offline parcial

- [x] Cola local de acciones.
- [x] Sincronizacion visible y automatica en V1 online.
- [x] Cola conservada para preparar offline futuro.
- [x] Sincronizacion de ventas simples, presupuestos, gastos, pedidos, transferencias, compras, clientes, proveedores y movimientos.
- [ ] Futuro: almacenamiento local real para ventas, presupuestos, gastos y movimientos.
- [ ] Futuro: resolucion visual de conflictos de stock.
- [ ] Futuro: indicador de conectividad real.

## Etapa 7: Ecommerce

- [x] Catalogo publico.
- [x] Carrito.
- [x] Pedido online conectado al stock.
- [x] Pedido web interno sin facturacion fiscal.
- [ ] Futuro: pagina publica separada del panel interno.
- [ ] Futuro: estados de pedido mas completos.
- [ ] Futuro: metodos de entrega o retiro.

## Etapa 8: Automatizacion de transferencias

- [ ] Integracion con Mercado Pago, banco, email o fuente disponible.
- [ ] Conciliacion con ventas y presupuestos.
- [ ] Alertas de transferencias pendientes.
- [ ] Reglas para marcar coincidencias por monto, cliente, fecha y referencia.

## Etapa 9: AFIP

- [ ] Facturacion fiscal si el negocio decide avanzar.
- [ ] Mantener comprobante interno separado de comprobante fiscal.
- [ ] Definir responsable fiscal, tipos de comprobante y punto de venta.

## Nuevas etapas propuestas

### Etapa 10: Configuracion avanzada

- [ ] Perfil del negocio: nombre, contacto, logo, moneda y leyenda de comprobantes.
- [x] Configuracion inicial editable con dominio publico, subdominio interno, moneda, contacto y leyenda.
- [x] Administracion editable de roles y permisos.
- [x] Categorias administrables desde Configuracion.
- [ ] Preferencias de catalogo, caja, stock y ecommerce.

### Etapa 11: Reportes y decisiones

- [x] Reportes por periodo.
- [x] Productos mas vendidos y productos inmovilizados.
- [x] Margen por categoria.
- [x] Compras por proveedor.
- [x] Gastos por categoria y tendencia.

### Etapa 12: Pulido operativo

- [ ] Lector de codigo de barras en caja.
- [x] Sidebar por grupos compresibles.
- [x] Stock dividido en subpantallas con control principal a pantalla completa.
- [x] Ventas dividida en Mostrador, Turno de caja y Ventas recientes.
- [x] Ventas alineada al patron visual de Stock con vistas superiores y ayuda separada.
- [x] Compras alineada al patron visual con Factura/remito como vista principal y acciones superiores.
- [x] Clientes y proveedores separados en subvistas de lista, nuevo y editar.
- [x] Presupuestos separados en Nuevo presupuesto y Presupuestos.
- [x] Transferencias separadas en Cargar transferencia y Comprobantes.
- [x] Gastos separados en Cargar, Recientes, Resumen y Cierre diario.
- [x] Configuracion separada en Roles, Operativa, Categorias, Sincronizacion y Atajos.
- [x] Buscador de producto dentro de ventas.
- [x] Optimizacion responsive para tablet y celular.
- [x] Busqueda rapida global.
- [x] Atajos de teclado para mostrador.
- [ ] Mejoras de rendimiento para catalogos grandes.
- [x] Documentar PRODUCT.md y DESIGN.md del proyecto para sostener el sistema visual.

### Etapa 13: IA asistida

- [x] Precarga de compras desde foto, PDF, texto o comprobante pegado.
- [x] Revision humana antes de registrar compra y mover stock.
- [x] Asistente visual para producto con foto base, fondo blanco y ambiente.
- [x] Preparar galeria sugerida desde el editor de catalogo.
- [x] Conexion segura a OpenAI por endpoint local del servidor.
- [x] Generacion real de imagenes con OpenAI.
- [x] Almacenamiento local de imagenes generadas como archivos publicos.
- [x] Vista dedicada para editar producto.
- [x] Galeria visual con miniaturas y carga por cuadros `+`.
- [ ] Futuro: OCR real para PDF/fotos con proveedor configurado.
- [ ] Futuro: comparacion explicita entre pedido esperado y mercaderia recibida.
- [ ] Futuro: migrar almacenamiento de imagenes a nube/S3 cuando haya backend productivo.
- [x] Base para Supabase Storage con buckets de imagenes y comprobantes.
- [ ] Futuro: historial de confianza, correcciones y aprendizaje por proveedor.

### Etapa 14: Produccion online

- [x] Definir Supabase como backend, PostgreSQL, login y Storage.
- [x] Preparar variables de entorno para Supabase, dominio publico y subdominio interno.
- [x] Preparar PWA instalable en Chrome.
- [x] Preparar script de backup PostgreSQL.
- [x] Documentar `regaleriashop.com` y `sistema.regaleriashop.com`.
- [x] Crear proyecto real de Supabase.
- [x] Ejecutar migracion PostgreSQL real.
- [x] Activar Supabase Auth base y URLs productivas.
- [x] Deploy frontend interno base en Render.
- [x] DNS interno `sistema.regaleriashop.com` cargado y verificado.
- [x] Preparar GitHub Pages para web publica en `regaleriashop.com`.
- [x] Certificado HTTPS final de `sistema.regaleriashop.com`.
- [x] Activar GitHub Pages con workflow de build.
- [x] Registrar `regaleriashop.com` como dominio custom en GitHub Pages.
- [ ] Deploy web publica final en `regaleriashop.com`.
- [ ] Conectar la app actual a datos reales en Supabase.
- [x] Configurar DNS interno en Porkbun.
- [ ] Configurar DNS publico en Porkbun para GitHub Pages.
