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

## Consulta de historial de stock

1. Se abre Stock > Historial.
2. Se consulta el historial completo de movimientos, ordenado desde el mas reciente.
3. Se puede filtrar por producto o motivo, tipo de movimiento y periodo.
4. El sistema muestra los primeros 20 resultados para conservar rapidez y permite cargar mas o mostrar todos.
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

## Conteo y movimiento agrupado de stock

1. En Stock > Movimiento, la persona agrega uno o varios productos a una misma operacion.
2. Por cada linea el sistema muestra SKU o codigo de barra, descripcion y stock actual.
3. La persona carga el stock real contado, no una diferencia manual.
4. El sistema calcula si cada linea suma, resta o no cambia stock antes de permitir registrar.
5. Al confirmar, todas las lineas reciben el mismo comprobante `MOV-...`, fecha, motivo y marca de sincronizacion; se guardan como una sola operacion para consulta y auditoria.
6. Historial agrupa las lineas por comprobante y permite abrir el detalle de cada producto afectado.
7. Solo el dueño puede corregir o anular una operacion agrupada. Corregir crea una nueva operacion vinculada; no modifica el registro original.
8. Anular revierte el impacto de las lineas, mantiene el comprobante marcado como anulado y crea una entrada de auditoria con motivo, rol, antes y despues.
9. La anulacion se rechaza si dejaría una variante con stock negativo.

## Fecha de compra

1. Factura o remito de compra propone la fecha local actual por defecto.
2. La persona puede elegir la fecha real que figura en el comprobante antes de registrar o editar.
3. Esa fecha se usa para la compra, el gasto de reposicion asociado y los movimientos de ingreso de stock.
4. El momento de la auditoria se conserva por separado, para distinguir cuándo se registró de cuándo ocurrió la compra.

## Busqueda de productos por codigo y descripcion

1. Los buscadores de productos reconocen nombre, descripcion, SKU y codigo de barras.
2. Esto aplica a busqueda global, control de stock, ventas, compras, presupuestos, catalogo y tienda publica.
3. En Compras y Presupuestos, primero se escribe el termino y luego se selecciona la variante filtrada, conservando codigo y stock visibles.

## Carga continua de lineas de compra

1. La persona busca y selecciona un producto, indica cantidad y costo por producto, y presiona Agregar.
2. La linea queda incorporada a la lista de la compra actual.
3. El selector vuelve a `Seleccionar producto`; se limpian busqueda, costo y cantidad para evitar cargar por error el mismo articulo dos veces.
4. Costo de envio y detalle aparecen separados de la lista para distinguir costos de productos y logistica.

## Categorias y edicion desde stock

1. Al abrir Alta de producto, el selector combina las categorias configuradas con las categorias que ya utilizan los productos del catalogo.
2. Una categoria asignada, por ejemplo `Marroquineria`, permanece disponible aunque otra ventana tenga una configuracion anterior.
3. El valor `Sin categoria` se ofrece una sola vez y una nueva categoria se registra tambien en Configuracion.
4. En Control de stock, el icono de lapiz abre la ficha completa de ese producto en Catalogo.
5. Guardar desde esa ficha actualiza la misma ficha publicada y conserva su historial operativo; no cambia el stock salvo que se realice una operacion de inventario separada.

## Continuidad de una compra en preparacion

1. Al escribir datos de una factura, remito o precarga, Compras guarda un borrador local automaticamente sin afectar stock, gastos ni cuentas de proveedor.
2. Si se actualiza la aplicacion o se vuelve desde otra pagina, el sistema abre la ultima seccion usada y recupera el borrador de compra.
3. La pantalla muestra que el borrador esta protegido, Chrome advierte antes de salir o recargar y permite descartarlo solamente con una accion explicita.
4. Al registrar la compra se elimina el borrador porque el comprobante ya quedo guardado en la base de datos.
5. Al regresar a la pestaña, la aplicacion avisa que se pueden revisar actualizaciones; no recarga datos de forma invasiva ni redirige a Panel.

## Compra con Factura A e IVA discriminado

1. En Tipo de comprobante se selecciona `Factura A · IVA discriminado`.
2. Se indica si el costo ingresado viene con IVA o sin IVA y la alicuota aplicable.
3. Antes de agregar la linea, el sistema muestra neto unitario, IVA de la linea y total con IVA.
4. El resumen final discrimina neto de productos, IVA total y total pagado; el envio se suma al total pagado.
5. Se guarda el costo bruto para stock y reposicion, mas los valores netos e IVA para reportes futuros. No genera comprobantes fiscales ni integra AFIP.

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

## Capital y prestamos

1. Solo el rol dueño ve el modulo Capital.
2. El dueño registra capital propio, capital prestado, prestamo recibido, pago de prestamo, retiro o ajuste.
3. Cada movimiento requiere monto y origen/persona; puede incluir vencimiento y nota.
4. El panel separa dinero propio de deuda pendiente.
5. Capital total registrado muestra capital propio mas deuda que todavia esta dentro del negocio.
6. Balance neto muestra capital propio menos deuda pendiente.
7. Proximo vencimiento ayuda a recordar prestamos con fecha cargada.
8. Los movimientos anulados dejan de afectar el panel, pero permanecen en el estado operativo sincronizado.

## Tesoreria consolidada

1. Solo el rol dueño ve Tesoreria.
2. La vista calcula entradas con ventas registradas y capital ingresado.
3. La vista calcula salidas con gastos, pagos de prestamos y retiros del dueño.
4. Plata estimada muestra entradas menos salidas.
5. Vista conservadora descuenta deuda con proveedores y deuda de prestamos.
6. La tabla explica de donde sale cada numero para que sea entendible sin conocimientos contables.
7. La lectura rapida avisa si el saldo estimado o el saldo conservador estan ajustados.

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
