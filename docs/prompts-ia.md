# Prompts IA

## Objetivo

Mantener visibles los prompts usados por OpenAI para poder corregirlos y controlar costo/tokens.

## Compra por factura, remito o texto

### System

```text
Extrae compra de una regaleria. Usa solo productos listados. Devuelve lineas detectadas. Si duda, confidence bajo y reason breve.
```

### User

Se envia JSON compacto:

```json
{
  "pedido": "texto del pedido esperado",
  "recibido": "texto detectado o pegado del comprobante",
  "archivo": "nombre del archivo",
  "productos": [
    {
      "id": "producto",
      "n": "nombre",
      "cat": "categoria",
      "sup": "proveedor",
      "v": [
        { "id": "variante", "n": "nombre", "sku": "sku", "bar": "codigo", "cost": 0 }
      ]
    }
  ]
}
```

### Optimizacion aplicada

- Solo se envian hasta 12 productos candidatos.
- Se priorizan productos que coinciden con palabras del pedido, comprobante o archivo.
- Se usan claves cortas en JSON: `n`, `cat`, `sup`, `v`, `bar`.
- La respuesta queda limitada con `max_output_tokens`.

## Fotos de producto

### Descripcion

```text
Redacta descripcion ecommerce breve para regaleria. Natural, sin exagerar, maximo 45 palabras.
```

User:

```text
Producto: {nombre}
Actual: {descripcion actual}
```

### Imagen base

```text
Foto ecommerce realista de {producto}. Sin texto, sin logos, producto reconocible.
```

### Variante fondo blanco

```text
Foto ecommerce realista de {producto}. Sin texto, sin logos, producto reconocible. Fondo blanco limpio, luz suave, producto centrado.
```

### Variante ambiente

```text
Foto ecommerce realista de {producto}. Sin texto, sin logos, producto reconocible. Ambiente calido de tienda de regalos, escena natural y elegante.
```

### Optimizacion aplicada

- Prompts de imagen cortos y separados por variante.
- La descripcion queda limitada con `max_output_tokens`.
- Las imagenes se guardan como archivos locales, no como base64 en la ficha.

## Composicion lifestyle de productos

La persona selecciona dos o tres productos con foto, una escena y un detalle opcional. El sistema usa las imagenes originales como referencias de alta fidelidad.

```text
Crear una fotografia lifestyle horizontal usando exactamente estos productos de referencia: {nombres}.
Integrarlos juntos en {escena}.
Conservar forma, materiales, colores y detalles reconocibles de cada producto.
Luz natural suave, fotografia ecommerce premium, composicion limpia, sin texto, sin logos agregados, sin personas.
Indicacion adicional: {detalle opcional}.
```

### Optimizacion aplicada

- Se admiten solo dos o tres referencias por generacion.
- El modo inicial usa calidad `low`; `medium` queda para la imagen final.
- La salida es horizontal `1536x1024`.
- La imagen se guarda en Storage y la interfaz conserva solo su URL.
- La generacion nunca publica sola: primero se revisa y despues se elige `Usar en portada` o `Usar como bloque lifestyle`.
