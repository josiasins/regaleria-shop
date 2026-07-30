# Sistema Visual

## Registro

Interfaz de producto interno. El diseño sirve a tareas repetidas de mostrador y administracion.

## Tema

Uso esperado: negocio fisico, monitor de mostrador o notebook, luz diurna/interior, usuarios alternando entre venta rapida y administracion. Tema claro, sobrio, con contraste suficiente y baja decoracion.

El sistema interno tambien ofrece modo noche para uso prolongado o ambientes de baja luz. Es una preferencia local del navegador, no un dato del negocio ni una configuracion de base de datos. La tienda publica conserva su identidad visual propia.

## Color

- Neutros verdosos en OKLCH para dar continuidad sin dominar la interfaz.
- Acento principal verde para acciones y estado positivo.
- Amarillo suave para sincronizacion o advertencia.
- Rojo moderado para bajas, perdidas o negativos.
- Modo noche usa fondo bosque profundo, paneles verdosos oscuros, texto marfil suave y los mismos acentos semanticos atenuados.
- Evitar paletas saturadas o monocromaticas fuertes.
- El fondo base del ecommerce es blanco frio `#FCFDFD`; no reutilizar el verde operativo del sistema interno como fondo de la tienda publica.

## Tipografia

- Fuente de sistema: Aptos, Segoe UI, system-ui, sans-serif.
- Jerarquia compacta, sin titulares gigantes dentro de paneles.
- Texto de tabla y chips optimizado para lectura rapida.

## Componentes

- Sidebar agrupada por areas: Operacion, Personas, Finanzas, Catalogo/Web, Analisis y Configuracion.
- Cada grupo del sidebar puede comprimirse para reducir ruido visual durante tareas de mostrador.
- Paneles para herramientas o bloques de configuracion.
- Chips para categoria, proveedor, estado web, permisos y stock.
- Botones con icono para acciones concretas.
- Inputs y selects consistentes, con edicion bajo demanda cuando la pantalla principal debe escalar.
- Vista lista para escaneo, vista cuadricula para inspeccion visual.
- Modulos operativos densos, como Productos y stock, usan acciones superiores para abrir subpantallas en lugar de mostrar todos los formularios juntos.
- Ventas prioriza Punto de venta; Cobros pendientes, Turnos, Ventas del turno, Auditoria y Ayuda viven como vistas internas accesibles por botones superiores.
- Punto de venta usa dos areas coordinadas: catalogo buscable y venta actual. Cliente, lineas, descuento, estado de cobro, medio de pago y confirmacion permanecen en el contexto del comprobante.
- Clientes usa patron maestro-detalle: lista escaneable a la izquierda y cuenta seleccionada a la derecha. Alta, edicion y eliminados se abren bajo demanda.
- Compras prioriza Factura o remito; Precarga, Compras recientes, Cuenta de proveedores y Registrar pago viven como vistas internas accesibles por botones superiores.
- Personas prioriza listas de Clientes/Proveedores; alta y edicion viven como subvistas accesibles por botones superiores.
- Presupuestos, Transferencias, Gastos y Configuracion siguen el mismo patron de vistas superiores para separar carga, consulta, resumen y administracion.
- En tablet y celular, las grillas operativas se apilan cuando los formularios pierden legibilidad; las barras de vistas pueden desplazarse horizontalmente.
- El menu lateral pasa a drawer con boton hamburguesa en tablet y celular para no ocupar el primer scroll.
- Bloques de IA documental con estado visible, resultado revisable y accion de aplicar separada de guardar.
- Edicion de producto en vista dedicada cuando la tarea requiere imagenes, IA y datos publicables.
- Galerias con imagen principal, miniaturas cuadradas reordenables por arrastre y tiles `+` para sumar archivos. La primera miniatura siempre comunica la portada.
- La herramienta `Foto premium para catalogo` compara la imagen seleccionada con una propuesta 1:1 sobre fondo blanco. Generar, incorporar al borrador y guardar son tres acciones separadas.
- En escritorio, las listas extensas de Punto de venta, Productos y stock y Catalogo desplazan solo sus resultados; controles y paneles de trabajo conservan su posicion. En tablet y celular se mantienen limites de altura tactiles sin forzar una pantalla fija.
- La tienda publica usa fondo blanco frio, celeste nube, carbon y coral de marca. El celeste organiza superficies comerciales, el coral identifica la accion principal y el carbon sostiene texto y cabecera.
- La portada publica combina un hero comercial con producto real, una promocion secundaria, categorias fotograficas y filas de productos. No usa fondos decorativos abstractos.
- En celular, la tienda publica usa cabecera compacta y navegacion inferior para Inicio, Buscar y Carrito. En tablet conserva la navegacion superior y apila promociones sin perder jerarquia.
- El carrito público vive en una página propia, accesible desde el encabezado; nunca se agrega como bloque al final del catálogo.
- Pedidos online usa patrón maestro-detalle: búsqueda y estados a la izquierda, cliente, artículos, cobro, preparación, entrega e historial a la derecha. En móvil se apila en una sola columna.
- La preparación de un pedido muestra una acción siguiente principal. Los cambios manuales de estado quedan en un desplegable de menor jerarquía.
- Una promoción con producto alto separa físicamente imagen y texto. La imagen usa `contain` y el bloque de texto conserva fondo opaco; el nombre nunca se superpone al producto.
- Las imágenes públicas usan `srcset` con variantes WebP de 320, 640, 1280 y 1920 px, conservando el original sin reemplazarlo.
- La marca elegida usa logo dorado con caja, cinta y palabra `shop`; la fuente maestra es `public/brand/regaleria-shop-logo_NEW.af`, y las reglas completas viven en `docs/manual-marca.md`.
- El sistema interno usa el simbolo compacto y la web publica puede usar el lockup completo cuando el espacio lo permite.
- La paleta de marca combina oro regalo, marfil tienda, bosque operativo, salvia y coral accion; el oro se usa como firma, no como color dominante de interfaz.

## Reglas

- No mostrar formularios completos si el usuario solo esta consultando.
- Una pantalla operativa debe responder primero a una tarea. Las funciones relacionadas se agrupan como subvistas, no como paneles simultaneos con igual peso.
- Un rediseño visual no puede cambiar acciones persistentes, validaciones, permisos ni contratos del store salvo decision separada y documentada.
- Evitar tarjetas dentro de tarjetas.
- Mantener botones y campos con radio de 7 u 8 px.
- Jerarquia: titulo de pagina primero; accion activa o total financiero despues; encabezado de panel tercero; metadatos, estados y ayuda en menor contraste. No dar a todos los textos, botones o paneles el mismo peso visual.
- Modo noche: evitar sombras decorativas en todos los paneles. El contraste se obtiene por superficie, borde, tipografia y color semantico, no por cajas compitiendo entre si.
- Usar controles familiares: selects para categorias/proveedores, checkboxes para permisos, botones segmentados para vistas.
- La busqueda global debe estar disponible arriba y ser enfocable con Ctrl/Cmd + K.
- El selector Dia/Noche vive en la barra superior y debe recordar la preferencia con `localStorage`.
- Atajos de mostrador deben ser pocos y memorables.
- Las funciones de IA deben mostrar claramente cuando algo es sugerido y cuando ya fue aplicado al formulario.
- Una foto generada nunca reemplaza la original ni cambia la portada por si sola. Antes de aplicarla se deben revisar logos, etiquetas, color y forma; despues se guarda con la accion general del producto.
- La carga de imagenes debe ser visual; evitar textarea de URLs como mecanismo principal.
- El editor de la vidriera usa borrador y publicacion explicita. La vista previa representa la misma interfaz que vera el cliente.
- La vista previa de la vidriera abre en movil y usa anchos reales de 390 px, 820 px y escritorio; no simular dispositivos reduciendo visualmente una interfaz de escritorio.
- Portada, Categorias, Colecciones y Lifestyle deben leerse como herramientas de edicion, separadas de la accion de revisar la vista previa.
- Cada bloque editable de la vidriera usa un contenedor blanco frio, borde visible, encabezado propio, icono de lapiz y etiqueta `Editable`; la superficie general usa neutros frios y celeste del ecommerce, incluso cuando el sistema interno esta en modo noche.
- Las imagenes lifestyle guardan un punto de encuadre independiente para movil, tablet y escritorio. Cambiar el encuadre modifica el borrador visual, nunca el archivo original.
- El flujo Lifestyle se presenta en tres pasos: elegir productos, generar o subir una imagen y ajustar el encuadre. La IA entrega una propuesta revisable y no activa ni publica el bloque por si sola.
- Las categorias visuales y colecciones se pueden reordenar, pero las categorias reales y los productos siguen perteneciendo al catalogo.
