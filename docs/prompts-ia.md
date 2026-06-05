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
