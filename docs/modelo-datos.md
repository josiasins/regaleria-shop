# Modelo De Datos Principal

El esquema base esta en `prisma/schema.prisma` y apunta a PostgreSQL.

## Entidades

- User: usuario con rol.
- Customer: cliente reutilizable para ventas y presupuestos, con contacto y notas.
- Supplier: proveedor reutilizable para productos, compras y gastos.
- Product: producto base con categoria, proveedor historico para compras, marca comercial opcional, descripcion y estado publicable.
- ProductCommerce: ficha comercial opcional con propuesta de valor, destinatarios, ocasiones, contenido, materiales, cuidados, presentacion, personalizacion y hasta tres relaciones por tipo.
- ProductGiftProfile: etiquetas determinísticas para recomendar por destinatario, ocasión, interés, presupuesto, urgencia y presentación.
- StorefrontBundle: pack editable con nivel comercial, componentes, precio propio y visibilidad. El stock sigue perteneciendo a sus productos.
- StorefrontCommerceSettings: contacto, confianza, preparación, políticas, envoltorio, cuotas, CFTEA, preguntas frecuentes y configuración del buscador.
- Variant: variante vendible con SKU, codigo de barra, stock, costo, precio interno, precio web opcional, precio anterior verificado y precio sin impuestos opcional.
- Category: lista administrable de categorias para productos y reportes.
- Sale: venta con comprobante interno, total, margen, fecha/hora, cliente y turno asociado. Conserva estado de pago, total cobrado y una coleccion de cobros para no perder pagos parciales o posteriores.
- SaleLine: lineas de venta.
- SalePayment: evento de cobro de una venta; conserva importe, medio de pago, fecha/hora, turno y nota opcional.
- Quote: presupuesto sin descuento de stock hasta convertirse.
- QuoteLine: lineas de presupuesto.
- Transfer: comprobante manual de transferencia asociado a venta o presupuesto.
- Expense: gasto del negocio.
- PurchaseReceipt: factura, remito u otro comprobante de compra de mercaderia. Conserva total pagado, neto e IVA total cuando una Factura A los discrimina.
- PurchaseLine: lineas de compra que actualizan stock y costo de variantes. Puede conservar costo bruto, neto, alicuota, IVA unitario y subtotales discriminados.
- OnlineOrder: pedido creado desde la web publica.
- OnlineOrderLine: lineas del pedido web.
- OnlineOrderGiftOptions: envoltorio, dedicatoria y envío directo elegidos por el cliente.
- OnlineOrderBundle: resumen del pack y ahorro que PostgreSQL validó al crear el pedido.
- StoreOrderEvent: evento inmutable de creación, estado, cobro, entrega, cancelación o vencimiento.
- ImageAsset: URL original, hash de contenido, peso original y variantes WebP públicas.
- StockMovement: historial de movimientos de stock.
- CashClosure: cierre de caja diario con totales por medio de pago y gastos.
- CashShift: turno operativo de mostrador con efectivo inicial declarado, responsable, apertura, cierre, efectivo contado, efectivo esperado, nota y estado de sincronizacion.
- SupplierPayment: pago parcial o total a proveedor, con comprobante de compra opcional, medio de pago y nota.
- CapitalEntry: movimiento privado del dueño para capital propio, capital prestado, prestamos, pagos, retiros o ajustes.
- RolePermission: permisos editables por rol.
- BusinessProfile: configuracion inicial del negocio, dominios, moneda, contacto, leyenda de comprobantes y politica de backups.
- FileAsset: registro de archivos guardados en Storage, asociado a productos, compras, transferencias o gastos.
- BackupRun: registro de ejecuciones de backup.
- AuditLog: registro de acciones importantes.
- StorefrontSettings: configuracion unica de la vidriera publica; guarda portada, categorias visuales, colecciones y bloque lifestyle.
- StorefrontSettingsHistory: copia antes/despues de cada publicacion visual, con usuario y fecha.

## Relaciones clave

- Sale y Quote pueden asociarse a Customer, pero conservan `customerName` para mantener el dato historico del comprobante.
- Product y PurchaseReceipt pueden asociarse a Supplier, pero conservan `supplier` para mantener el texto usado en el momento de la carga.
- PurchaseReceipt genera PurchaseLine, StockMovement de ingreso y Expense de categoria Reposicion.
- OnlineOrder descuenta stock mediante lineas conectadas a Variant y queda como pedido interno, no como factura fiscal.
- `store_orders` es la fuente de verdad del circuito ecommerce. `operational_state` puede conservar una copia de compatibilidad, pero nunca prevalece sobre la tabla dedicada.
- Cancelar o vencer un pedido usa `stockRestoredAt` para impedir una devolución doble.
- ImageAsset referencia al original por URL; sus variantes son derivados reemplazables y el original permanece intacto.
- Product se edita visualmente desde Catalogo; Variant y StockMovement sostienen cantidades, costos y precios operativos.
- Product puede tener varias imagenes para galeria publicable. La marca no reemplaza al proveedor: proveedor sostiene compras y costos; marca se usa en Catalogo y puede mostrarse al cliente.
- Variant usa `webPrice` solamente cuando fue configurado en Catalogo; si no existe, la web usa `price`. El pedido web recalcula este valor en PostgreSQL antes de guardarse.
- CashClosure resume ventas y gastos del dia para control interno.
- SupplierPayment permite construir saldo por proveedor junto con PurchaseReceipt. Los pagos nuevos se vinculan al comprobante para calcular el saldo de esa factura y admitir pagos divididos.
- CapitalEntry no reemplaza ventas, gastos ni caja; permite ver estructura de capital y deuda del negocio solo para dueño.
- RolePermission permite que Configuracion cambie visibilidad de modulos y permiso de descuentos.
- BusinessProfile alimenta Configuracion > Operativa y define `regaleriashop.com` como web publica y `sistema.regaleriashop.com` como sistema interno.
- FileAsset separa imagenes publicas de producto de comprobantes privados de compras, transferencias y gastos.
- BackupRun permite auditar si los respaldos se ejecutaron correctamente.
- StorefrontSettings referencia productos y categorias por identificador, pero no es dueña de esos datos. Si cambia el catalogo, la normalizacion agrega las nuevas categorias sin borrar configuraciones existentes.
- StorefrontSettingsHistory permite auditar cambios comerciales sin mezclar esa historia con ventas, stock, compras o caja.

## Offline futuro

Las entidades operativas incluyen `localId` y `syncStatus` para permitir creacion local futura. Los estados previstos son:

- sincronizado.
- pendiente.
- con conflicto.
- fallo.
