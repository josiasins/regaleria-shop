# Registro De Decisiones

Cada cambio importante debe agregarse con fecha, decision, motivo y alternativas descartadas.

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

### Sincronizacion demo visible
- Decision: mostrar cola local y accion de sincronizacion demo.
- Motivo: hace visible la base del futuro offline parcial sin implementar aun almacenamiento local completo.
- Alternativas descartadas: ocultar la sincronizacion hasta V2, porque dificultaria validar el modelo de estados pendientes.

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
- Decision: bloquear `sistema.regaleriashop.com` y despliegues `onrender.com` con Supabase Auth por email y contraseña.
- Motivo: el panel interno contiene ventas, stock, compras, gastos y reportes del negocio; no debe quedar publico aunque la web ecommerce si lo sea.
- Estado: el dominio publico `regaleriashop.com` muestra solo la tienda; el dominio interno muestra pantalla de ingreso antes del panel.
- Alternativas descartadas: usar una contraseña fija embebida en el frontend, porque seria visible en el codigo publicado.
