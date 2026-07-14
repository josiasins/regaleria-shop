# Modelo De Datos Principal

El esquema base esta en `prisma/schema.prisma` y apunta a PostgreSQL.

## Entidades

- User: usuario con rol.
- Customer: cliente reutilizable para ventas y presupuestos, con contacto y notas.
- Supplier: proveedor reutilizable para productos, compras y gastos.
- Product: producto base con categoria, proveedor historico para compras, marca comercial opcional, descripcion y estado publicable.
- Variant: variante vendible con SKU, codigo de barra, stock, costo, precio interno y precio web opcional.
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

## Relaciones clave

- Sale y Quote pueden asociarse a Customer, pero conservan `customerName` para mantener el dato historico del comprobante.
- Product y PurchaseReceipt pueden asociarse a Supplier, pero conservan `supplier` para mantener el texto usado en el momento de la carga.
- PurchaseReceipt genera PurchaseLine, StockMovement de ingreso y Expense de categoria Reposicion.
- OnlineOrder descuenta stock mediante lineas conectadas a Variant y queda como pedido interno, no como factura fiscal.
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

## Offline futuro

Las entidades operativas incluyen `localId` y `syncStatus` para permitir creacion local futura. Los estados previstos son:

- sincronizado.
- pendiente.
- con conflicto.
- fallo.
