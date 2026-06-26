# Marca Regaleria Shop

Guia completa: `docs/manual-marca.md`.

## Direccion elegida

La marca principal queda basada en el logo dorado con caja de regalo, cinta superior y palabra `shop`.

La fuente maestra editable es `public/brand/regaleria-shop-logo_NEW.af`. Ese archivo manda sobre cualquier exportacion. Los SVG se usan para la app y la web, pero deben regenerarse desde el maestro cuando se cambie la marca.

Archivos de marca:

- `public/brand/regaleria-shop-logo_NEW.af`: fuente maestra editable.
- `public/brand/regaleria-shop-logo.svg`: logo completo exportado para web, comprobantes, presentaciones y piezas grandes.
- `public/brand/regaleria-shop-symbol.svg`: recorte compacto exportado para favicon, app instalada, sidebar y espacios chicos.
- `public/icon.svg`: icono principal de la aplicacion, alineado al simbolo elegido.
- `public/brand/logo-concepts.png`: exploracion anterior de cinco caminos visuales, conservada como historial.

## Paleta

| Token | Hex | Uso |
| --- | --- | --- |
| Oro regalo | `#b88a1e` | Logo, detalles premium, acentos de marca. |
| Oro profundo | `#8a6416` | Hover, textos cortos sobre fondos claros, bordes activos. |
| Marfil tienda | `#fbf7ee` | Fondo calido del ecommerce, piezas de marca y comprobantes. |
| Bosque operativo | `#243f36` | Encabezados, sistema interno, barras principales y contraste serio. |
| Verde salvia | `#dfe8dd` | Fondos suaves, estados tranquilos, separadores visuales. |
| Coral accion | `#d6644a` | Comprar, confirmar, llamadas principales y avisos de accion. |
| Tinta calida | `#2e2a22` | Texto principal cuando el fondo es marfil o blanco. |
| Blanco limpio | `#ffffff` | Formularios, tarjetas y contenido de lectura. |

Regla de uso: el oro no debe ocupar toda la interfaz. Funciona mejor como firma de marca, icono, borde, detalle o titulo breve. El sistema interno sigue usando bosque operativo para mantener lectura y foco de trabajo.

## Personalidad

- Calida, cercana y confiable.
- Cuidada, con un punto premium, pero no inaccesible.
- Practica para mostrador y suficientemente linda para ecommerce.
- Asociada a regalos, deco, bazar y objetos seleccionados.

## Tipografia

- Logo: no reemplazar la palabra `shop` por una fuente del sistema; usar el SVG trazado desde la referencia.
- Sistema y ecommerce: Aptos, Segoe UI, system-ui, sans-serif.
- Evitar titulares excesivamente decorativos dentro del sistema interno; el logo ya aporta personalidad.

## Uso recomendado

- Header publico: simbolo + texto `Regaleria Shop`.
- Sistema interno: simbolo compacto + texto funcional `Sistema interno`.
- Comprobantes: logo completo arriba, datos del negocio debajo.
- Redes y WhatsApp: simbolo cuadrado como avatar.
- Packaging o bolsas: logo completo en oro sobre marfil o blanco.

## Evitar

- Cambiar el oro por colores saturados sin motivo.
- Usar el logo sobre fondos con poco contraste.
- Convertir todo el sistema en dorado; eso baja legibilidad.
- Estirar el SVG o recortarlo sin mantener proporcion.
- Usar muchas tipografias decorativas alrededor del logo.
