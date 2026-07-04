# Manual De Marca Regaleria Shop

Este manual es la referencia para cualquier pieza visual, pantalla, email, comprobante, publicacion o material de Regaleria Shop. Antes de hacer cambios de marca o diseño publico, leer este documento junto con `PRODUCT.md` y `DESIGN.md`.

## Fuente Maestra

La fuente editable principal del logo es:

- `public/brand/regaleria-shop-logo_NEW.af`

Ese archivo es un documento de Affinity y manda sobre cualquier exportacion. No redibujar el logo a mano, no reemplazar la palabra `shop` con una fuente del sistema y no reconstruir la caja/cinta con formas aproximadas.

Exportaciones operativas:

- `public/brand/regaleria-shop-logo.svg`: logo completo para la app, web, comprobantes y piezas grandes.
- `public/brand/regaleria-shop-symbol.svg`: recorte compacto para sidebar, favicon, app instalada y espacios chicos.
- `public/brand/icon.png`: icono usado por navegador, PWA y manifest.
- `public/brand/logo-concepts.png`: exploracion historica, no usar como marca final.

Cuando el archivo maestro cambie, el flujo correcto es: abrir `regaleria-shop-logo_NEW.af`, exportar SVG nuevo, reemplazar las exportaciones operativas y revisar visualmente en la app.

## Idea De Marca

Regaleria Shop es una tienda de regalos, deco, bazar y accesorios seleccionados. La marca debe sentirse calida, cuidada, cercana y confiable. Tiene un punto premium por el dorado, pero no debe sentirse fria, lujosa en exceso ni inaccesible.

Palabras guia:

- Calida.
- Cuidada.
- Practica.
- Cercana.
- De regalo.

Evitar:

- Apariencia generica de marketplace sin identidad.
- Exceso de dorado en toda la interfaz.
- Estilo demasiado tech o dashboard decorativo.
- Diseños infantiles, saturados o de cotillon.

## Logo

El logo aprobado combina caja de regalo, cinta superior, palabra `shop` grande y bajada `Regaleria`. La caja y la cinta son parte de la identidad, no un adorno opcional.

Usos:

- Logo completo: portada web, comprobantes, email de bienvenida, packaging, perfil de marca, documentacion comercial.
- Simbolo compacto: favicon, sidebar, avatar de app, icono pequeño, botones o encabezados donde el logo completo no entra.
- Texto al lado del simbolo: usar `Regaleria Shop` o `Regaleria` + descriptor funcional, por ejemplo `Sistema interno`.

Zona de seguridad:

- Mantener alrededor del logo al menos el alto visual de la letra `R` de la palabra `Regaleria`.
- No pegar el logo a bordes, botones, cards o fotos.
- En espacios chicos, preferir el simbolo compacto antes que achicar demasiado el logo completo.

Tamanos minimos:

- Logo completo digital: ideal desde 180 px de ancho. No usar por debajo de 140 px.
- Simbolo compacto digital: ideal desde 32 px. En sidebar actual se usa 42 px.
- Comprobantes PDF: logo completo entre 42 y 60 mm de ancho.

No hacer:

- Estirar horizontal o verticalmente.
- Cambiar proporciones de caja, cinta o palabra `shop`.
- Usar sombras fuertes, biseles, contornos extra o efectos 3D.
- Ponerlo sobre fondos con poco contraste.
- Usar la imagen PNG de referencia como reemplazo permanente cuando haya SVG exportado.

## Paleta

| Token | Hex | Uso Principal |
| --- | --- | --- |
| Oro regalo | `#b88a1e` | Logo, firma visual, detalles premium, acentos medidos. |
| Oro profundo | `#8a6416` | Hover, estados activos sobre fondo claro, texto corto de marca. |
| Marfil tienda | `#fbf7ee` | Fondo de marca, piezas comerciales, comprobantes y bloques calidos. |
| Bosque operativo | `#243f36` | Sistema interno, headers, navegacion, contraste serio. |
| Verde salvia | `#dfe8dd` | Superficies suaves, fondos secundarios, separadores tranquilos. |
| Coral accion | `#d6644a` | Acciones comerciales: comprar, confirmar, destacar oferta. |
| Tinta calida | `#2e2a22` | Texto principal sobre fondos claros. |
| Blanco limpio | `#ffffff` | Formularios, areas de lectura y fondos neutros. |

Reglas de color:

- El oro es firma, no pintura para toda la app.
- El sistema interno usa bosque operativo como base para claridad y foco.
- La web publica puede usar mas marfil y oro, con coral para acciones de compra.
- No usar negros o blancos puros como primera opcion en nuevas piezas; preferir tinta calida y marfil/blancos tintados.

## Tipografia

Logo:

- Usar siempre el archivo exportado desde el maestro.
- No componer `shop` con una fuente local.

Sistema y ecommerce:

- Fuente base: Aptos, Segoe UI, system-ui, sans-serif.
- Interfaz interna: jerarquia compacta, lectura rapida, nada de titulares gigantes dentro de paneles.
- Web publica: puede ser mas editorial en titulos, pero sin competir con el logo.

Texto de marca:

- Titulos claros y humanos.
- Frases cortas, concretas y comerciales.
- Evitar tono demasiado tecnico en la web publica.

## Voz Y Copy

La marca habla como una tienda cercana que sabe seleccionar productos. Debe orientar, no abrumar.

Ejemplos de tono:

- `Regalos listos para sorprender.`
- `Elegidos para casa, mesa y momentos especiales.`
- `Retiro en local y opciones de envio.`
- `Te avisamos cuando tu pedido esta listo.`

Evitar:

- `Soluciones integrales para experiencias de consumo.`
- `El marketplace definitivo de regalos.`
- Textos largos que repiten lo que ya dice el titulo.

## Fotografia Y Producto

Para ecommerce, las fotos deben ayudar a comprar.

Reglas:

- Primera foto: producto claro, fondo limpio, buena luz.
- Fotos secundarias: detalle, escala, textura, packaging o uso en ambiente.
- No publicar fotos oscuras, borrosas, recortadas mal o con fondos que distraen.
- Mantener proporciones cuadradas cuando sea posible para grillas.
- Si hay varias variantes, mostrar al menos una imagen representativa por variante importante.

Estilo:

- Luz natural o suave.
- Fondos claros, marfil, madera clara o superficies neutras.
- Ambientes reales solo cuando ayuden a entender uso o escala.

## Aplicacion En Sistema Interno

El sistema interno es una herramienta de trabajo. La marca debe estar presente pero no molestar.

Usar:

- Simbolo compacto en sidebar, login y app instalada.
- Bosque operativo para navegacion.
- Oro como detalle de identidad, borde activo o icono pequeño.
- Estados y acciones siguiendo la logica operativa ya definida en `DESIGN.md`.

Evitar:

- Fondos dorados grandes en pantallas de gestion.
- Logos enormes dentro de modulos operativos.
- Elementos decorativos que ralenticen caja, stock o compras.

## Aplicacion En Ecommerce

La web publica debe sentirse como una tienda real, no como panel interno.

Prioridades:

- Busqueda visible.
- Categorias claras.
- Producto, precio, stock, variantes y fotos.
- Carrito en pagina propia.
- Confianza: retiro, envio, contacto y confirmacion de pedido.

Uso de marca:

- Header con simbolo compacto y texto `Regaleria Shop`.
- Logo completo en footer, emails o piezas de confianza cuando haya espacio.
- Marfil y oro para calidez; coral para comprar o confirmar.

## Emails Y Comprobantes

Emails:

- Encabezado con logo completo o simbolo + `Regaleria Shop`.
- Mensaje corto y claro.
- Boton principal coral o bosque, no dorado excesivo.
- Pie con datos de contacto.

Comprobantes:

- Logo completo arriba.
- Datos del negocio debajo.
- Mantener buena legibilidad, no decorar de mas.
- Recordar que los comprobantes internos no son factura fiscal mientras no haya AFIP.

## Redes, Packaging Y Material Impreso

Redes:

- Avatar: simbolo compacto.
- Posts: usar marfil, producto real y acento dorado.
- Historias/ofertas: coral para accion, oro para marca.

Packaging:

- Preferir logo completo en oro sobre marfil, blanco calido o kraft claro.
- No mezclar muchas familias tipograficas.
- Dejar aire alrededor del logo.

## Checklist Antes De Publicar Una Pieza

- ¿Use `regaleria-shop-logo_NEW.af` como fuente de verdad o una exportacion derivada?
- ¿El logo conserva proporciones y espacio?
- ¿El oro aparece como firma y no domina toda la pieza?
- ¿La pieza se entiende rapido?
- ¿El texto suena cercano y concreto?
- ¿En ecommerce, la foto ayuda a comprar?
- ¿En sistema interno, la marca no molesta la operacion?

## Pendientes De Marca

- Exportar desde Affinity versiones oficiales en SVG, PNG transparente y PNG con fondo marfil.
- Crear variantes horizontal, vertical y simbolo con nombres estables.
- Definir una plantilla para posts de Instagram y estados de WhatsApp.
- Definir version monocromatica para sello, bolsa o impresion simple.
