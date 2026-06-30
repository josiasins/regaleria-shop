# Registro De Decisiones

Cada cambio importante debe agregarse con fecha, decision, motivo y alternativas descartadas.

## 2026-06-26

### Clientes con eliminacion recuperable
- Decision: permitir que solo el dueño borre clientes de la lista operativa y los vea en una pestaña de Eliminados para poder restaurarlos.
- Motivo: limpiar clientes duplicados o mal cargados no debe destruir historial ni afectar ventas/presupuestos existentes.
- Alternativas descartadas: borrado definitivo, porque elimina trazabilidad; permitirlo a todos los roles, porque clientes se reutilizan en ventas y presupuestos.

### Categoria rapida desde alta de producto
- Decision: permitir crear una categoria nueva desde Alta de producto y guardarla en la lista administrable de categorias.
- Motivo: durante la carga de mercaderia aparecen rubros nuevos y no conviene cortar el flujo para ir a Configuracion.
- Alternativas descartadas: obligar a configurar categorias previamente, porque hace lenta la carga; mantener texto libre, porque genera duplicados y reportes sucios.

### Auditoria protegida de ventas y turnos
- Decision: agregar en Ventas una subvista de Auditoria visible solo para dueño, con contraseña operativa, motivo obligatorio e historial de correcciones, anulaciones y restauraciones.
- Motivo: las ventas y turnos pueden requerir correcciones reales, pero no deben modificarse sin trazabilidad ni permiso fuerte; cada accion conserva antes/despues, fecha y responsable.
- Alternativas descartadas: permitir edicion libre desde ventas recientes, porque borra contexto de caja; borrar registros de forma definitiva, porque impide reconstruir errores; permitirlo a administradores, porque la anulacion/restauracion afecta stock y control de caja.

## 2026-06-24

### Marca dorada con caja y cinta
- Decision: adoptar como marca principal el logo dorado con caja de regalo, cinta superior y palabra `shop`; tomar `public/brand/regaleria-shop-logo_NEW.af` como fuente maestra editable y mantener SVG operativos para app/web.
- Motivo: comunica regaleria y ecommerce de forma inmediata, se siente mas calido que la propuesta tecnica anterior y funciona para web, comprobantes, packaging y app instalada.
- Alternativas descartadas: mantener la `R` provisoria, porque era correcta para sistema pero menos expresiva para una tienda de regalos; redibujar el logo a mano con texto de sistema, porque no respetaba la silueta aprobada; usar solo la imagen PNG, porque no escala ni se edita tan bien como SVG.

### Manual de marca
- Decision: crear `docs/manual-marca.md` como guia operativa de marca.
- Motivo: cada nueva pantalla, pieza web, email, comprobante o material comercial necesita una referencia clara para sostener coherencia visual y no improvisar decisiones.
- Alternativas descartadas: dejar solo una nota corta en `docs/marca.md`, porque no alcanza para guiar usos, tono, colores, fotografia, emails y ecommerce.

## 2026-06-03

### Una sola plataforma modular
- Decision: crear una app web modular en lugar de varias apps separadas.
- Motivo: stock, ventas, gastos, transferencias y ecommerce comparten datos.
- Alternativas descartadas: apps separadas por modulo, porque duplicarian datos y permisos.

### V1 online
- Decision: la primera version funciona online.
- Motivo: reduce complejidad y evita el dolor tecnico de sincronizacion completa desde el inicio.
- Alternativas descartadas: local-first completo, porque agregaria resolucion de conflictos, cola offline y soporte tecnico mayor.

### Base PostgreSQL
- Decision: documentar y modelar la base para PostgreSQL.
- Motivo: es estable, relacional y adecuada para reportes de ventas, stock y gastos.
- Alternativas descartadas: bases simples tipo archivo o planilla, porque escalan mal para auditoria y stock.

### Offline parcial futuro
- Decision: no implementar offline real en V1, pero incluir `localId` y estados de sincronizacion.
- Motivo: permite sumar ventas, presupuestos, gastos y movimientos offline sin rehacer el modelo.
- Alternativas descartadas: ignorar offline hasta V2, porque obligaria a rediseñar APIs y entidades.

### Comprobante interno sin AFIP
- Decision: emitir PDF numerado interno.
- Motivo: sirve para control del negocio sin prometer validez fiscal.
- Alternativas descartadas: AFIP en V1, porque requiere integracion fiscal y definiciones contables.

### Catalogo publicable antes de ecommerce
- Decision: productos incluyen fotos, descripcion y bandera publicable.
- Motivo: permite preparar ecommerce gradualmente.
- Alternativas descartadas: ecommerce completo en V1, porque dispersaria el esfuerzo inicial.

### Stock por movimientos auditables
- Decision: los cambios de stock se registran como movimientos de ingreso, ajuste, devolucion, perdida/rotura o venta.
- Motivo: permite reconstruir por que cambio una cantidad y prepara la resolucion de conflictos offline.
- Alternativas descartadas: editar solo el numero de stock, porque no deja historial ni explica diferencias de inventario.

### Presupuesto no reserva stock
- Decision: el presupuesto no descuenta stock; recien al convertirlo en venta se descuenta y se generan movimientos.
- Motivo: un presupuesto puede no cerrarse y no debe bloquear inventario real del mostrador.
- Alternativas descartadas: reservar stock al presupuestar, porque complica ventas fisicas y requiere vencimientos/reservas formales.

### Transferencias con confirmacion manual
- Decision: las transferencias se cargan manualmente y quedan pendientes hasta confirmacion.
- Motivo: evita marcar como cobrado un comprobante no revisado.
- Alternativas descartadas: confirmacion automatica en V1, porque depende de banco, Mercado Pago, email o permisos externos.

### Ecommerce como pedido interno
- Decision: la web publica crea pedidos web conectados al stock, no facturas ni ventas fiscales.
- Motivo: permite probar catalogo y carrito sin mezclar facturacion, AFIP o pagos online.
- Alternativas descartadas: ecommerce con pago online inmediato, porque requiere pasarela, conciliacion y reglas de entrega.

### Sincronizacion operativa visible
- Decision: mostrar cola de cambios pendientes y accion de sincronizacion real contra Supabase.
- Motivo: ventas, turnos, compras, gastos, clientes, proveedores, stock, configuracion y auditorias no deben depender de memoria local al publicar una nueva version.
- Alternativas descartadas: mantener sincronizacion demo, porque hacia que las operaciones pudieran cambiar o perderse al recargar/desplegar.

### Compras separadas de gastos
- Decision: crear un modulo de Compras para facturas/remitos de proveedor.
- Motivo: una compra de mercaderia no es solo un gasto; tambien actualiza stock, costo de reposicion y movimientos auditables.
- Alternativas descartadas: cargar estas compras solo en Gastos, porque obligaria a duplicar la carga de stock manualmente.

## 2026-06-04

### Clientes y proveedores como entidades propias
- Decision: crear secciones separadas de Clientes y Proveedores, reutilizables desde ventas, presupuestos y compras.
- Motivo: evita escribir nombres repetidos, permite corregir datos de contacto y prepara reportes por cliente/proveedor.
- Alternativas descartadas: mantenerlos solo como texto en ventas/compras, porque no permite historial ordenado ni gestion posterior.

### Texto historico en comprobantes
- Decision: ventas, presupuestos y compras conservan el nombre escrito del cliente/proveedor aunque tambien puedan asociarse a una ficha.
- Motivo: si luego se edita la ficha del cliente/proveedor, el comprobante historico sigue mostrando el dato usado al momento de la operacion.
- Alternativas descartadas: depender solo de la relacion a la ficha, porque podria modificar visualmente comprobantes anteriores.

### Sincronizacion automatica visible
- Decision: cambiar el indicador superior de "cambio pendiente" por "Sincronizando" y "Todo actualizado", con actualizacion automatica en la V1.
- Motivo: en uso online no debe parecer que el usuario tiene que apretar un boton para guardar; la cola sigue existiendo como base del offline futuro.
- Alternativas descartadas: dejar el boton/manual como comportamiento principal, porque generaba duda operativa.

### Vistas por rol
- Decision: aplicar permisos visibles por rol: dueño y administrador ven todo; encargado ve operacion y gestion; cajero ve caja, clientes, presupuestos y transferencias.
- Motivo: cada rol necesita una pantalla mas enfocada y con menor riesgo de tocar compras, gastos o configuracion por error.
- Alternativas descartadas: mostrar todo a todos, porque hace mas lenta la operacion diaria y aumenta errores.

### Catalogo como editor publicable
- Decision: ubicar la edicion de nombre, foto, descripcion, proveedor, categoria y visibilidad web en Catalogo.
- Motivo: Stock queda enfocado en cantidades y movimientos; Catalogo queda enfocado en como se ve y publica el producto.
- Alternativas descartadas: duplicar edicion completa en Stock y Catalogo, porque aumenta inconsistencias.

### Catalogo con edicion bajo demanda
- Decision: mostrar el catalogo como lectura por defecto y abrir la edicion solo al presionar Editar.
- Motivo: la vista anterior no escalaba porque cada producto mostraba todos sus campos editables todo el tiempo.
- Alternativas descartadas: mantener inputs siempre visibles, porque vuelve pesada la pantalla cuando haya muchos productos.

### Vista lista y cuadricula en catalogo
- Decision: agregar dos formas de ver productos: cuadricula para inspeccion visual y lista para escaneo rapido.
- Motivo: la regaleria necesita revisar fotos y tambien operar con muchos productos sin perder velocidad.
- Alternativas descartadas: una sola vista fija, porque obliga a usar el mismo layout para tareas distintas.

### Categorias precargadas
- Decision: convertir categoria en desplegable durante la edicion de catalogo.
- Motivo: reduce errores de escritura y permite reportes mas limpios por categoria.
- Alternativas descartadas: texto libre para categoria, porque generaria duplicados como Deco, decoracion o deco.

### Sistema renombrado a Configuracion
- Decision: cambiar Sistema por Configuracion y sumar bloques de roles, perfil del negocio, catalogo, caja y stock.
- Motivo: esa seccion debe concentrar ajustes de la aplicacion, no solo informacion tecnica.
- Alternativas descartadas: dejar sincronizacion como unico contenido, porque no cubre la administracion real del negocio.

### Roadmap por checks
- Decision: mantener el roadmap con checks de hecho, futuro y pendientes de decision.
- Motivo: permite retomar el proyecto sin perder que etapas ya se completaron y que falta priorizar.
- Alternativas descartadas: roadmap narrativo sin estado, porque no sirve como linea de trabajo.

### Reportes operativos en V1
- Decision: agregar reportes por periodo con ventas, margen, gastos, compras, productos mas vendidos, inmovilizados, margen por categoria, compras por proveedor y gastos por categoria.
- Motivo: el dueño necesita decidir reposicion, promociones y compras con datos del sistema.
- Alternativas descartadas: dejar reportes para despues, porque ya hay datos suficientes para una primera lectura.

### Configuracion editable
- Decision: hacer editables roles/permisos y categorias desde Configuracion.
- Motivo: categorias y permisos cambian con el negocio y no deben quedar fijos en codigo.
- Alternativas descartadas: mantener permisos y categorias estaticos, porque bloquea ajustes cotidianos.

### Stock avanzado incremental
- Decision: sumar edicion de variantes e importacion masiva simple por texto separado por punto y coma.
- Motivo: permite corregir SKU, costos, precios y cargar muchos productos sin esperar una importacion compleja con archivos.
- Alternativas descartadas: importar solo por planilla formal en esta etapa, porque agregaria mas dependencia tecnica.

### Atajos y busqueda global
- Decision: agregar busqueda global y atajos F2 y Ctrl/Cmd + K.
- Motivo: mostrador necesita velocidad; buscar y saltar a ventas debe ser inmediato.
- Alternativas descartadas: navegar solo desde sidebar, porque es mas lento durante atencion al cliente.

### Documentacion de producto y diseño
- Decision: crear PRODUCT.md y DESIGN.md.
- Motivo: sostiene decisiones visuales y de producto para futuras iteraciones.
- Alternativas descartadas: dejar solo documentacion funcional, porque no alcanza para mantener consistencia de interfaz.

### IA asistida con revision humana
- Decision: sumar funciones de IA como precarga revisable, no como accion automatica final.
- Motivo: compras, stock, costos e imagenes publicables impactan datos sensibles del negocio; la IA debe acelerar la carga pero una persona confirma antes de guardar.
- Alternativas descartadas: aplicar directamente cambios detectados por IA, porque un error de lectura podria alterar stock, costos o publicaciones.

### Precarga de compras por comprobante
- Decision: agregar en Compras un asistente para subir foto, PDF o texto y generar lineas sugeridas.
- Motivo: reduce carga manual cuando llega mercaderia y permite comparar lo pedido/recibido antes de registrar la compra.
- Alternativas descartadas: crear una app separada de OCR, porque el flujo natural es revisar y registrar dentro de Compras.

### IA visual para catalogo
- Decision: agregar en el editor de catalogo un asistente que prepara variantes de imagen: foto base, fondo blanco y ambiente.
- Motivo: las fotos publicables mejoran la web y evitan tener que editar cada producto fuera del sistema.
- Alternativas descartadas: guardar una sola foto cruda del producto, porque no alcanza para una presentacion ecommerce consistente.

### OpenAI del lado servidor
- Decision: conectar los asistentes IA mediante endpoints locales `/api/ai/*` y guardar `OPENAI_API_KEY` solo del lado servidor/local.
- Motivo: una clave de API en el navegador quedaria expuesta; el frontend solo debe enviar datos de la operacion y recibir sugerencias revisables.
- Alternativas descartadas: llamar a OpenAI directo desde React, porque compromete la seguridad de la clave y dificulta controlar costos.

### Almacenamiento local de imagenes IA
- Decision: guardar las imagenes generadas por OpenAI en `public/generated/products` y devolver URLs internas como `/generated/products/...`.
- Motivo: las URLs temporales o los base64 no sirven como galeria persistente; el catalogo necesita archivos estables para mostrar y reutilizar.
- Alternativas descartadas: guardar la imagen como base64 dentro del producto, porque hace pesada la ficha y complica futuras migraciones a almacenamiento en la nube.

### Edicion dedicada de producto
- Decision: mover la edicion completa de producto a una vista dedicada dentro de Catalogo.
- Motivo: la edicion embebida dentro de cada tarjeta no escalaba para fotos, IA, descripcion, proveedor, categoria y estado web.
- Alternativas descartadas: mantener formularios desplegados dentro de las tarjetas, porque hace confuso revisar imagenes y guardar cambios.

### Galeria visual con carga por tiles
- Decision: mostrar una imagen principal, miniaturas cuadradas y espacios con `+` para agregar fotos.
- Motivo: cargar imagenes debe ser visual y directo; escribir URLs o usar un textarea no es natural para usuarios de mostrador.
- Alternativas descartadas: mantener una lista textual de URLs, porque no permite confirmar rapidamente que imagen se cargo.

### Prompts IA visibles y compactos
- Decision: documentar prompts en `docs/prompts-ia.md` y reducir el contexto enviado a OpenAI.
- Motivo: permite corregir prompts sin leer codigo y baja costo/latencia al enviar menos tokens.
- Alternativas descartadas: prompts largos embebidos y envio del catalogo completo, porque escalan mal con muchos productos.

## 2026-06-04

### Sidebar por grupos compresibles
- Decision: permitir comprimir y expandir grupos del menu lateral como Operacion, Personas, Finanzas, Catalogo/Web, Analisis y Configuracion.
- Motivo: el negocio puede enfocarse en el area activa sin tener todas las secciones visibles al mismo tiempo.
- Alternativas descartadas: mantener todas las opciones siempre abiertas, porque no escala cuando crecen compras, clientes, reportes y configuracion.

### Stock con subpantallas
- Decision: convertir Stock en una pantalla principal de control con accesos superiores a Alta de producto, Movimiento, Variante, Importacion e Historial.
- Motivo: Control de stock necesita ocupar todo el espacio disponible y las tareas de carga deben abrirse bajo demanda.
- Alternativas descartadas: mantener control, alta, movimientos, variantes, importacion e historial visibles a la vez, porque la pantalla quedaba densa y poco escalable.

### Ventas con turno operativo
- Decision: agregar apertura de turno de caja en Ventas con efectivo inicial declarado, separado del cierre de caja diario y de tesoreria.
- Motivo: mostrador necesita saber con cuanto efectivo empieza a operar sin mezclarlo con caja central ni resumen administrativo.
- Alternativas descartadas: usar solo cierre de caja diario, porque llega tarde para controlar el efectivo durante el turno.

### Ventas por vistas internas
- Decision: organizar Ventas en Mostrador, Turno de caja y Ventas recientes, con buscador de producto antes del selector.
- Motivo: la pantalla principal debe priorizar cobrar rapido; comprobantes recientes y apertura de turno no deben ocupar espacio permanente.
- Alternativas descartadas: mantener ventas recientes siempre al costado y productos solo en desplegable, porque se vuelve lento cuando crece el catalogo.

### Venta obligatoriamente asociada a turno
- Decision: impedir ventas sin turno abierto y guardar cada venta con referencia al turno donde ocurrio.
- Motivo: el cierre de mostrador necesita saber exactamente que ventas pertenecen al turno, con fecha, hora, cliente, medio de pago e importe.
- Alternativas descartadas: filtrar ventas solo por fecha/hora, porque puede mezclar operaciones entre turnos o cierres.

### Ventas alineada al patron de Stock
- Decision: ordenar Ventas con vistas superiores: Mostrador, Turnos, Ventas del turno y Ayuda.
- Motivo: todos los modulos operativos deben tener una estructura predecible para no mezclar acciones principales, control e informacion auxiliar.
- Alternativas descartadas: mantener atajos y ventas recientes como paneles fijos al costado, porque ensucia la pantalla de cobro.

### Responsive para tablet y celular
- Decision: ajustar breakpoints para que tablet y celular usen grillas apiladas, barras de vistas desplazables y menu lateral en drawer con boton hamburguesa.
- Motivo: los formularios de mostrador, stock y catalogo necesitan legibilidad y botones tactiles antes que conservar la composicion de escritorio.
- Alternativas descartadas: escalar todo proporcionalmente, porque genera texto chico, tablas apretadas y scroll horizontal global.

## 2026-06-06

### Catalogo compartido entre sistema y web
- Decision: usar una tabla publica controlada en PostgreSQL/Supabase como fuente comun para el catalogo del sistema interno y la tienda publica.
- Motivo: publicar, ocultar, editar fotos, precios, descripciones o stock desde el sistema debe reflejarse en la web sin volver a desplegarla.
- Alternativas descartadas: mantener una copia estatica dentro del frontend publico, porque se desactualiza y obliga a publicar el sitio por cada cambio.

### Lectura publica y escritura autenticada
- Decision: permitir lectura anonima solo de productos marcados como publicables y reservar altas o cambios al usuario interno autorizado.
- Motivo: la tienda necesita consultar productos sin login, pero ningun visitante debe poder modificar el catalogo.
- Alternativas descartadas: exponer toda la tabla al publico o depender solo de controles visuales del frontend, porque no protegen los datos en la base.

### Actualizacion automatica del catalogo
- Decision: refrescar el catalogo compartido al abrir cada aplicacion y luego cada diez segundos mientras permanece abierta.
- Motivo: mantiene ambos lados actualizados con una implementacion simple y predecible; tambien refleja cambios de stock generados por ventas y compras.
- Alternativas descartadas: exigir un boton manual de sincronizacion, porque genera dudas y permite que la web quede desactualizada.

### Sincronizacion interna posterior al login
- Decision: iniciar la lectura compartida del panel interno despues de validar la sesion de Google.
- Motivo: un visitante anonimo solo puede leer productos publicados; cargar esa vista limitada dentro del panel ocultaria temporalmente productos internos.
- Alternativas descartadas: consultar antes de autenticar, porque mezcla los permisos de la tienda publica con los del administrador.

### Validacion de escritura contra Auth
- Decision: autorizar cambios de catalogo comparando `auth.uid()` con el correo guardado en `auth.users`.
- Motivo: es mas robusto que depender de que cada proveedor OAuth incluya el correo en la misma posicion del token.
- Alternativas descartadas: validar exclusivamente `auth.jwt()->>'email'`, porque la estructura del token puede variar y provocar que la interfaz cambie localmente sin persistir.

### Escritura de catalogo mediante operacion segura
- Decision: guardar productos mediante la funcion autenticada `save_catalog_product`.
- Motivo: centraliza la validacion del dueño y la escritura atomica, evitando diferencias entre permisos de insercion y actualizacion del `upsert` directo.
- Alternativas descartadas: mantener el `upsert` desde el navegador, porque un rechazo de RLS dejaba el cambio solo en memoria.

## 2026-06-18

### Baja de productos restringida
- Decision: permitir eliminar productos únicamente a los roles Dueño y Administrador, desde la vista dedicada de edición y con confirmación.
- Motivo: es una acción destructiva que también quita el producto de la web pública; debe estar fuera del flujo cotidiano de encargados y cajeros.
- Alternativas descartadas: mostrar el botón en cada tarjeta o habilitarlo a todos los roles, porque aumenta el riesgo de bajas accidentales.

### Historial conservado al eliminar
- Decision: eliminar la ficha activa del catálogo y la web, conservando ventas, compras y movimientos históricos que ya guardaron sus datos operativos.
- Motivo: los comprobantes anteriores deben seguir siendo auditables aunque el producto deje de venderse.
- Alternativas descartadas: borrar en cascada el historial, porque destruiría trazabilidad contable y de stock.

### Imágenes de producto en Supabase Storage
- Decision: subir las fotos de producto directamente al bucket público `product-images` desde el sistema autenticado.
- Motivo: el despliegue de Render es estático y no ejecuta el endpoint local que anteriormente recibía las imágenes.
- Alternativas descartadas: guardar imágenes base64 dentro del producto, porque aumenta mucho el tamaño del catálogo y puede fallar al sincronizar.

### Límites de imágenes publicables
- Decision: aceptar JPG, PNG y WebP de hasta 8 MB, con error visible antes de guardar.
- Motivo: evita formatos que Chrome y la web pública no muestran consistentemente, además de cargas excesivamente pesadas.
- Alternativas descartadas: aceptar cualquier archivo con `image/*`, porque fotos HEIC u originales muy grandes pueden subir pero luego no renderizar correctamente.

### Ecommerce como superficie propia
- Decision: reemplazar la vista pública básica por inicio, buscador, categorías dinámicas, fichas de producto, variantes, carrito, retiro/envío y checkout.
- Motivo: la web debe vender y permitir explorar, no funcionar únicamente como una demostración del catálogo interno.
- Alternativas descartadas: conservar una grilla administrativa con botones por variante, porque no cumple expectativas normales de ecommerce.

### Pedidos y correos persistentes
- Decision: guardar pedidos web y correos generados en tablas propias de Supabase.
- Motivo: un pedido no puede depender de la memoria del navegador del cliente y debe quedar visible para el negocio.
- Alternativas descartadas: mantener `OnlineOrder` sólo en Zustand, porque se pierde al cerrar o recargar la página.

### Proveedores restringidos
- Decision: ocultar la sección y los datos de proveedor a Encargado y Cajero; Dueño y Administrador mantienen acceso.
- Motivo: costos, fuentes de compra y agenda de proveedores son información administrativa sensible.
- Alternativas descartadas: mostrar proveedores a todo rol con acceso a stock, porque excede lo necesario para operar productos.

### Imágenes manuales sin generación IA
- Decision: eliminar el generador IA del editor y permitir selección múltiple de fotos reales.
- Motivo: la carga manual es más predecible, económica y fiel al producto que efectivamente se vende.
- Alternativas descartadas: mantener dos caminos paralelos de imágenes, porque aumentaba confusión y fallas de persistencia.

### Menu responsive tipo drawer
- Decision: ocultar el menu lateral en tablet/celular y abrirlo desde un boton hamburguesa.
- Motivo: la navegacion principal debe estar disponible sin ocupar espacio permanente en pantallas chicas.
- Alternativas descartadas: menu horizontal por grupos, porque aunque evita alto vertical, compite con la tarea principal y se siente menos natural en mobile.

### Compras por vistas superiores
- Decision: dejar Factura o remito de compra como vista inicial y mover Precarga, Compras recientes, Cuenta de proveedores y Registrar pago a botones superiores.
- Motivo: la carga de comprobantes es la tarea principal de Compras; IA, historial y pagos son tareas relacionadas pero no deben competir en la misma pantalla.
- Alternativas descartadas: mostrar precarga, comprobante, historial, cuentas y pago todos juntos, porque genera una pantalla larga y desordenada.

### Clientes y proveedores por subvistas
- Decision: separar Clientes y Proveedores en Lista, Nuevo y Editar con botones superiores.
- Motivo: la consulta de contactos debe ser la vista principal, y la carga/edicion debe abrirse bajo demanda para mantener consistencia con Stock, Ventas y Compras.
- Alternativas descartadas: mantener formulario y listado visibles a la vez, porque consume espacio y vuelve menos clara la tarea principal.

## 2026-06-05

### Presupuestos, transferencias, gastos y configuracion por subvistas
- Decision: ordenar Presupuestos, Transferencias, Gastos y Configuracion con botones superiores y una subvista visible por vez.
- Motivo: el patron ya funciona en Stock, Ventas, Compras, Clientes y Proveedores; repetirlo reduce desorden y hace mas predecible cada modulo.
- Alternativas descartadas: mantener todos los paneles visibles simultaneamente, porque escala mal en tablet/celular y mezcla carga, consulta, resumen y administracion.

### Produccion online con Supabase y Chrome
- Decision: usar Supabase como backend principal para PostgreSQL, login y archivos, y Chrome como cliente instalable mediante PWA.
- Motivo: minimiza infraestructura propia, permite empezar con plan gratuito y mantiene la app accesible desde cualquier computadora con Chrome.
- Alternativas descartadas: instalador de escritorio tradicional y modo red local, porque agregan mantenimiento y soporte tecnico que no aporta para la primera operacion real.

### Dominios del negocio
- Decision: reservar `regaleriashop.com` para la web publica y `sistema.regaleriashop.com` para el sistema interno.
- Motivo: separa experiencia de clientes y operacion interna sin duplicar la base de datos ni mezclar permisos.
- Alternativas descartadas: usar el mismo dominio/ruta para todo, porque puede confundir administracion interna con ecommerce publico.

### Backups y archivos desde la base
- Decision: preparar backups con `pg_dump` y buckets de Supabase Storage para imagenes, remitos, comprobantes de transferencia y gastos.
- Motivo: una operacion real necesita recuperar datos y conservar comprobantes sin depender del navegador.
- Alternativas descartadas: guardar archivos solo en `public/generated`, porque sirve para demo local pero no para produccion ni multiples usuarios.

### Organizacion Supabase creada
- Decision: crear una organizacion Supabase separada llamada `Regaleria Shop`.
- Motivo: aislar el sistema de regaleria de organizaciones y proyectos existentes, manteniendo facturacion, equipo y recursos separados.
- Estado: organizacion creada con ref `cznokmshsldvjarjjfmb`.
- Alternativas para continuar: usar el proyecto Free creado o pasar a Pro si el uso crece.

### Proyecto Supabase creado y migrado
- Decision: crear el proyecto `regaleria-shop` dentro de la organizacion `Regaleria Shop` y sincronizar PostgreSQL con Prisma.
- Motivo: pasar de prototipo en memoria a una base real preparada para datos persistentes, login y archivos.
- Estado: proyecto ref `nxfdxhixvgogxjenrfhr`, base sincronizada, Storage inicial ejecutado y Auth apuntando a `sistema.regaleriashop.com`.
- Alternativas descartadas: dejar Supabase solo preparado en documentacion, porque ya habia acceso y se podia avanzar con infraestructura real.

### DNS pendiente de hosting frontend
- Decision: no cargar registros DNS en Porkbun hasta tener el destino del hosting frontend.
- Motivo: Supabase es backend/API y no sirve directamente la app React; apuntar `regaleriashop.com` o `sistema.regaleriashop.com` sin hosting produciria errores o una pagina equivocada.
- Alternativas descartadas: crear CNAMEs provisorios sin destino confirmado, porque complica la propagacion y puede confundir pruebas.

### Hosting interno en Render
- Decision: desplegar el sistema interno como Static Site en Render con el servicio `regaleria-shop`.
- Motivo: permite publicar rapido desde GitHub, mantener plan gratuito inicial y usar Supabase como backend real.
- Estado: sitio temporal `https://regaleria-shop.onrender.com`, dominio `https://sistema.regaleriashop.com` verificado en Render y respondiendo por HTTPS.
- Alternativas descartadas: usar Supabase como hosting frontend, porque Supabase cubre backend, Auth y Storage, pero no sirve directamente la app React.

### Dominio interno en Porkbun
- Decision: crear en Porkbun un CNAME `sistema.regaleriashop.com` hacia `regaleria-shop.onrender.com`.
- Motivo: Render pidio ese registro para verificar el dominio interno.
- Estado: registro DNS cargado y verificado por Render.
- Alternativas descartadas: borrar todos los registros existentes del dominio, porque habia registros de email y hosting por defecto que no debian tocarse sin una razon directa.

### Web publica con GitHub Pages
- Decision: preparar GitHub Pages para publicar `regaleriashop.com` desde el repositorio `josiasins/regaleria-shop`.
- Motivo: Render bloqueo dominios personalizados adicionales en el plan actual; GitHub Pages permite publicar una web estatica con dominio propio sin costo inicial.
- Estado: workflow `.github/workflows/pages.yml` y `public/CNAME` agregados, GitHub Pages activado con Actions y `regaleriashop.com` guardado como dominio custom. Falta reemplazar DNS publico en Porkbun; hoy el dominio raiz aun redirige a Porkbun Link.
- Alternativas descartadas: crear otro dominio custom en Render, porque el boton aparece deshabilitado por limite del plan/cuenta.

### Acceso protegido al sistema interno
- Decision: bloquear `sistema.regaleriashop.com` y despliegues `onrender.com` con Supabase Auth, priorizando ingreso con Google y dejando email/contraseña como respaldo.
- Motivo: el panel interno contiene ventas, stock, compras, gastos y reportes del negocio; no debe quedar publico aunque la web ecommerce si lo sea.
- Estado: el dominio publico `regaleriashop.com` muestra solo la tienda; el dominio interno muestra pantalla de ingreso antes del panel.
- Alternativas descartadas: usar una contraseña fija embebida en el frontend, porque seria visible en el codigo publicado.

### Allowlist de correo para sistema interno
- Fecha: 2026-06-05.
- Decision: limitar el ingreso interno a sesiones autenticadas cuyo email este en `VITE_INTERNAL_ALLOWED_EMAILS`; el correo inicial autorizado es `josias.insfran66@gmail.com`.
- Motivo: Supabase Auth confirma identidad, pero la app tambien necesita decidir quien pertenece al negocio. Sin esta regla, cualquier usuario autenticado que lograra una sesion valida podria ver el panel.
- Alternativas descartadas: confiar solo en que el registro publico esta desactivado, porque OAuth y usuarios creados por error pueden ampliar el acceso si no existe una allowlist.

### Segundo correo dueño
- Fecha: 2026-06-30.
- Decision: habilitar `iris.traghetti66@gmail.com` como correo dueño base del sistema interno y de las politicas de catalogo/archivos.
- Motivo: debe poder ingresar con Google y operar con los mismos permisos de dueño aunque Render conserve una allowlist anterior en variables de entorno.
- Alternativas descartadas: depender solo de actualizar `VITE_INTERNAL_ALLOWED_EMAILS`, porque una variable vieja en hosting podria bloquear el acceso.

### Endurecimiento inicial de seguridad
- Fecha: 2026-06-06.
- Decision: restringir escritura y lectura privada de Storage al correo autorizado, limitar cargas de IA a 15 MB y agregar cabeceras contra MIME sniffing, iframes y permisos innecesarios.
- Motivo: la autenticacion visual no alcanza si los archivos privados aceptan a cualquier usuario autenticado o si una carga excesiva puede agotar memoria.
- Alternativas descartadas: dejar politicas generales para `authenticated`, porque permitirian acceso a futuros usuarios creados por error.

### Google OAuth productivo
- Fecha: 2026-06-06.
- Decision: crear un cliente OAuth web exclusivo llamado `Regaleria Shop` y conectarlo con Supabase Auth.
- Motivo: permite ingresar con `josias.insfran66@gmail.com` sin depender de una contraseña propia de la aplicacion.
- Seguridad: el callback queda limitado al endpoint oficial del proyecto Supabase y la app mantiene su allowlist de correo.
- Verificacion: el correo autorizado fue agregado como usuario de prueba y el flujo completo abrio correctamente el panel interno en `sistema.regaleriashop.com`.

### Correccion de credenciales de Supabase
- Fecha: 2026-06-06.
- Decision: reemplazar la clave publishable rechazada por Auth con la clave publica anon compatible en local, GitHub Pages y Render.
- Motivo: la clave anterior devolvia `Invalid API key` y hacia que un usuario valido pareciera tener email o contraseña incorrectos.
- Pendiente de seguridad: rotar la contraseña de PostgreSQL porque se habia cargado por error como secreto OAuth antes de esta correccion.

### Cabeceras HTTP del sistema interno
- Fecha: 2026-06-06.
- Decision: configurar directamente en Render CSP, `X-Frame-Options`, HSTS, `X-Content-Type-Options`, `Permissions-Policy` y `Referrer-Policy`.
- Motivo: Render no aplico todas las reglas declaradas en `_headers`; la configuracion del hosting permite verificar que las cabeceras lleguen realmente al navegador.

### Baja logica e historial para gastos y proveedores
- Fecha: 2026-06-30.
- Decision: permitir editar gastos recientes, borrar/restaurar gastos y borrar/restaurar proveedores con historial operativo.
- Motivo: en la operacion real puede haber errores de carga o proveedores que dejan de usarse, pero esos cambios no deben desaparecer sin trazabilidad.
- Alcance: gastos y proveedores no se eliminan fisicamente; quedan marcados como eliminados, pendientes de sincronizacion y visibles en una vista de eliminados/historial.
- Permisos: gastos pueden ser gestionados por roles operativos autorizados; baja/restauracion de proveedores queda limitada a dueño y administrador.
- Alternativas descartadas: borrado definitivo desde la lista principal, porque impediria auditar correcciones y restaurar datos cargados por error.

### Modo noche local del sistema interno
- Fecha: 2026-06-30.
- Decision: agregar modo Dia/Noche como preferencia local del navegador en la interfaz interna.
- Motivo: el sistema se usa muchas horas en mostrador y administracion; una variante oscura reduce fatiga visual en ambientes de baja luz.
- Alcance: solo cambia la interfaz del sistema interno; no toca base de datos, Supabase, productos, ventas ni configuraciones del negocio.
- Alternativas descartadas: guardar el tema en PostgreSQL o Supabase, porque seria una preferencia del dispositivo y no un dato operativo.

### Estado operativo persistente en Supabase
- Fecha: 2026-06-30.
- Decision: guardar el estado interno completo en `operational_state` como snapshot JSONB protegido por la misma regla de dueños autorizados.
- Motivo: habia modulos operativos que seguian naciendo desde datos locales/demo; publicar o recargar podia volver a una version distinta del estado.
- Alcance: ventas, turnos, presupuestos, transferencias, gastos, compras, clientes, proveedores, movimientos, permisos, categorias, cierres y auditorias.
- Relacion con catalogo: productos/stock siguen sincronizados tambien con `public_catalog_products`, porque la web publica necesita leerlos y los pedidos web descuentan stock desde ahi.
- Alternativas descartadas: normalizar todas las tablas en este paso, porque llevaria mas tiempo y bloquearia la proteccion inmediata de datos; queda como mejora posterior.
# 2026-06-19 - Carrito como pagina propia

- **Decision:** el carrito reemplaza temporalmente la vista del catalogo y concentra productos, cantidades, entrega y confirmacion en una pagina dedicada.
- **Motivo:** mostrarlo al final del catalogo lo hacia dificil de encontrar, especialmente en celular, y mezclaba exploracion con cierre de compra.
- **Alternativas descartadas:** panel fijo lateral o modal, porque reducen espacio, complican el uso movil y esconden parte del proceso de checkout.

# 2026-06-18 - Actualizacion del entorno de pruebas por seguridad

- **Decision:** actualizar Vitest y sus dependencias transitivas a versiones sin alertas conocidas.
- **Motivo:** la auditoria de dependencias detecto vulnerabilidades en herramientas de desarrollo, incluida una critica en una version anterior del servidor de pruebas.
- **Resultado:** `npm audit` informa cero vulnerabilidades y la suite completa conserva sus 22 pruebas aprobadas.

# 2026-06-18 - Pedido web y descuento de stock en una sola operacion

- **Decision:** registrar el pedido web y descontar sus variantes dentro de una unica funcion transaccional de PostgreSQL.
- **Motivo:** el comprador anonimo no debe tener permisos generales para editar productos, pero la tienda necesita impedir sobreventas y confirmar pedido y stock como una sola operacion.
- **Alternativas descartadas:** descontar stock desde el navegador despues de crear el pedido, porque puede fallar por permisos o conectividad y dejar datos inconsistentes.
