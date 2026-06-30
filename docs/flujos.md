# Flujos Clave

## Venta rapida

1. Debe existir un turno de caja abierto.
2. El vendedor selecciona o escanea producto.
3. Ingresa cantidad y medio de pago.
4. El sistema valida stock disponible.
5. Se crea venta con comprobante interno, fecha, hora, cliente consumidor final y turno asociado.
6. Se descuenta stock.
7. Se genera movimiento de stock tipo venta.
8. La venta queda sincronizada o pendiente, segun conectividad futura.

## Venta detallada

1. Debe existir un turno de caja abierto.
2. Se elige Consumidor final, un cliente existente o se crea un cliente rapido.
3. Se cargan varias lineas en un carrito de venta.
4. Se aplican descuentos.
5. Se registra medio de pago.
6. El sistema valida stock disponible por cada variante.
7. Se crea comprobante interno con fecha, hora, cliente y turno asociado.
8. Se descuenta stock y se generan movimientos tipo venta.
9. Se puede emitir comprobante interno PDF.

## Presupuesto

1. Se elige un cliente existente o se crea un cliente rapido.
2. Se cargan productos.
3. No se descuenta stock.
4. El presupuesto queda abierto.
5. Al convertirlo, se valida stock disponible.
6. Si hay stock, se crea venta y recien ahi se descuenta stock.
7. Se generan movimientos tipo venta y el presupuesto queda convertido.

## Transferencia

1. Se carga comprobante manual.
2. Queda pendiente.
3. Un usuario autorizado la confirma o rechaza.
4. Se asocia a venta o presupuesto.

## Gasto

1. Se carga categoria, monto, proveedor y nota.
2. El gasto impacta en el panel.
3. En offline futuro, puede quedar pendiente hasta sincronizar.
4. Se agrupa por categoria para lectura rapida de gastos operativos.

## Compra con factura o remito

1. Se elige proveedor existente o se crea un proveedor rapido.
2. Se carga tipo de documento y numero.
3. Se agregan productos/variantes con cantidad y costo unitario.
4. Al registrar la compra, se crea comprobante interno `COM-000000`.
5. El sistema suma stock a cada variante.
6. Se actualiza el costo de reposicion de la variante.
7. Se crea un gasto de categoria Reposicion por el total.
8. Se generan movimientos de stock tipo ingreso.
9. La compra queda pendiente de sincronizacion si fue cargada localmente.

## Cliente

1. Se crea desde la seccion Clientes o rapido desde venta/presupuesto.
2. Se guarda nombre, telefono, email y nota.
3. Se puede editar desde Clientes.
4. Las ventas y presupuestos conservan el nombre historico usado al momento de operar.

## Proveedor

1. Se crea desde la seccion Proveedores o rapido desde compra.
2. Se guarda nombre, telefono, email y nota.
3. Se puede editar desde Proveedores.
4. Las compras conservan el nombre historico usado al momento de registrar el comprobante.

## Movimiento de stock

1. Se selecciona una variante.
2. Se elige tipo: ingreso, ajuste/baja, devolucion o perdida/rotura.
3. Se carga cantidad y motivo.
4. El sistema valida que el stock no quede negativo.
5. Se actualiza la cantidad disponible.
6. Queda historial auditable con estado de sincronizacion.

## Alta de producto

1. Se cargan datos del producto: nombre, categoria, proveedor y descripcion.
2. Se carga la primera variante con SKU, codigo de barra, stock, minimo, costo y precio.
3. El producto puede marcarse como publicable para ecommerce futuro.
4. Se crea un movimiento inicial de ingreso.
5. El producto y el movimiento quedan pendientes de sincronizacion si fueron creados localmente.

## Edicion de variante

1. Se elige una variante existente.
2. Se editan nombre, SKU, codigo de barra, minimo, costo y precio.
3. La variante queda actualizada sin cambiar el stock.
4. El producto queda pendiente de sincronizacion.

## Importacion masiva de productos

1. Se pegan lineas con formato `Nombre;Categoria;Proveedor;SKU;Precio;Costo;Stock`.
2. El sistema valida nombre, SKU y precio.
3. Cada linea valida crea un producto con variante unica.
4. Se crea movimiento inicial de ingreso por el stock importado.
5. Las categorias nuevas se suman a la configuracion.

## Comprobante interno

1. Cada venta recibe numero `CI-000000`.
2. Se genera PDF imprimible.
3. El documento aclara que no tiene validez fiscal.

## Catalogo publicable

1. El usuario elige vista de cuadricula o lista.
2. Cada producto se muestra en lectura con nombre, categoria, proveedor, estado web y stock.
3. Categoria y proveedor se muestran como chips para lectura rapida.
4. Al presionar Editar, se habilitan los campos de ficha.
5. Categoria se elige desde valores precargados.
6. Proveedor se elige desde la agenda de proveedores.
7. El producto puede marcarse como visible u oculto para la web publica.
8. El cambio de publicacion o ficha queda pendiente de sincronizacion si fue hecho localmente.
9. Se puede filtrar por categoria, proveedor y estado web.
10. Se puede buscar dentro del catalogo.
11. Cada producto puede tener varias fotos en galeria.

## Pedido web

1. El cliente agrega variantes publicables al carrito.
2. El sistema valida stock disponible.
3. Se cargan nombre y contacto.
4. Se crea pedido `WEB-000000`.
5. El pedido descuenta stock para evitar sobreventa.
6. El pedido queda pendiente de sincronizacion y preparacion interna.

## Sincronizacion parcial

1. Cada accion operativa creada localmente queda en cola.
2. La cola muestra entidad, descripcion y estado.
3. En V1 online, la app intenta marcar los cambios como actualizados de forma automatica.
4. La pantalla Sistema conserva la vista de cola para validar la base offline futura.
5. En una version futura, los conflictos de stock se marcaran para resolucion manual.

## Vista por rol

1. Dueño y administrador ven todos los modulos.
2. Encargado ve operacion, personas, finanzas operativas, catalogo y web.
3. Cajero ve panel, ventas, clientes, presupuestos y transferencias.
4. Si el rol cambia y la seccion actual no esta permitida, la app vuelve al Panel.

## Configuracion

1. Configuracion concentra permisos por rol, ajustes operativos y base de sincronizacion.
2. Roles y permisos permiten activar o quitar modulos y permiso de descuentos por rol.
3. Categorias permite agregar o quitar categorias reutilizables.
4. Configuracion operativa agrupa perfil del negocio, catalogo, caja/ventas y stock.
5. La cola de sincronizacion muestra cambios operativos pendientes.
6. Al sincronizar, el estado interno se guarda en Supabase en `operational_state`.
7. En etapas futuras, este snapshot puede normalizarse en tablas especificas por modulo sin cambiar los flujos de usuario.

## Cierre de caja

1. Se genera cierre del dia actual.
2. El sistema resume efectivo, transferencia, tarjeta, otros medios y gastos del dia.
3. Se guarda nota de cierre.
4. El cierre queda pendiente de sincronizacion.

## Turno de caja de mostrador

1. Ventas muestra si hay turno abierto o si falta abrirlo.
2. El cajero declara efectivo inicial y puede agregar una nota del turno.
3. El turno queda pendiente de sincronizacion como dato operativo.
4. No se puede cobrar si no hay turno abierto.
5. Cada venta queda asociada al turno abierto.
6. Ventas recientes muestra solo las ventas del turno.
7. Al cerrar turno se declara el efectivo contado.
8. El sistema muestra efectivo esperado, diferencia, medios de pago y detalle de ventas.
9. Este turno no reemplaza caja central ni cierre diario; solo controla la caja fisica de mostrador.

## Cuenta de proveedor

1. Las compras suman deuda por proveedor.
2. Los pagos a proveedor restan saldo.
3. Compras muestra total comprado, total pagado y saldo.
4. Cada pago queda pendiente de sincronizacion.

## Registro de compra persistente

1. La persona carga proveedor, tipo de comprobante, numero, productos, cantidades, costos y envio.
2. Al registrar, el sistema crea el comprobante de compra.
3. Tambien crea un gasto de reposicion asociado al proveedor.
4. Se generan movimientos de ingreso y se actualiza el stock/costo de cada variante.
5. Si el proveedor se cargo como rapido y no existia, queda guardado en Proveedores.
6. El estado operativo completo se guarda automaticamente en Supabase.
7. Al refrescar la app, Compras recientes debe reconstruirse desde `operational_state` y conservar el comprobante.

## Correccion y anulacion de compras

1. Compras recientes muestra solo compras activas.
2. Editar carga la compra en el formulario de factura/remito.
3. Al guardar, el sistema calcula la diferencia entre lineas anteriores y nuevas.
4. La diferencia ajusta stock, costo cuando corresponde, gasto de reposicion y cuenta del proveedor.
5. Anular revierte el stock ingresado por esa compra y mueve el comprobante a Eliminadas.
6. El gasto de reposicion asociado queda marcado como eliminado para no afectar reportes ni cierre.
7. Eliminadas permite restaurar la compra, sumando nuevamente el stock y reactivando el gasto.
8. Cada correccion, anulacion o restauracion queda en Historial.
9. Si la anulacion o correccion dejaria stock negativo, no se aplica.

## Correccion y baja de gastos

1. Gastos recientes muestra los registros activos.
2. Un usuario autorizado puede editar monto, categoria, proveedor o nota.
3. Cada edicion queda registrada en Historial con fecha, rol y motivo.
4. Al borrar un gasto, el registro pasa a Eliminados y deja de afectar paneles, reportes y cierre de caja.
5. Desde Eliminados se puede restaurar el gasto y la restauracion queda auditada.

## Baja y restauracion de proveedores

1. Proveedores muestra solo proveedores activos.
2. Dueño y administrador pueden borrar un proveedor.
3. El proveedor borrado pasa a Eliminados y deja de aparecer como opcion activa en compras y catalogo.
4. Desde Eliminados se puede restaurar.
5. Cada baja y restauracion queda registrada en Historial.

## Reportes

1. Se elige periodo: 7, 30 o 90 dias.
2. Se calculan ventas, margen, gastos y compras.
3. Se listan productos mas vendidos.
4. Se listan productos inmovilizados con stock y sin ventas del periodo.
5. Se calcula margen por categoria.
6. Se calcula compras por proveedor.
7. Se calcula gastos por categoria y tendencia.

## Busqueda global y atajos

1. La busqueda superior encuentra productos, clientes, proveedores y ventas.
2. Al elegir un resultado, navega al modulo correspondiente.
3. `F2` abre Ventas si el rol tiene permiso.
4. `Ctrl/Cmd + K` enfoca la busqueda global.

## Precarga de compra con IA

1. En Compras se sube foto, PDF, texto o notas del comprobante recibido.
2. El asistente intenta detectar productos existentes, SKUs, cantidades y costos.
3. El sistema muestra lineas sugeridas sin afectar stock.
4. La persona quita o corrige lineas si hace falta.
5. Al aplicar precarga, las lineas pasan al formulario de compra.
6. Recién al registrar compra se crean comprobante, gasto de reposicion, movimientos de ingreso y actualizacion de stock.

## Fotos de producto con IA

1. En Catalogo se presiona Editar.
2. El sistema abre una vista dedicada de edicion del producto.
3. La persona ve una imagen principal, miniaturas y espacios `+` para sumar fotos.
4. Al elegir una foto, se muestra visualmente y se guarda como archivo local.
5. El asistente IA puede generar variantes de fondo blanco y ambiente.
6. OpenAI genera las variantes y el servidor las guarda como archivos en `public/generated/products`.
7. La persona revisa fotos, descripcion y visibilidad web.
8. Al guardar producto se actualiza la ficha publicable con URLs internas estables.
9. En una etapa futura, el almacenamiento pasara a nube/S3 cuando exista backend productivo.
