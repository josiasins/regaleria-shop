import fs from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";

const textModel = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const generatedDir = path.resolve(process.cwd(), "public/generated/products");
const maxRequestBytes = 15 * 1024 * 1024;

const aiPrompts = {
  purchaseSystem:
    "Extrae compra de una regaleria. Usa solo productos listados. Devuelve lineas detectadas. Si duda, confidence bajo y reason breve.",
  productCopySystem:
    "Redacta descripcion ecommerce breve para regaleria. Natural, sin exagerar, maximo 45 palabras.",
  productImageBase: (productName) => `Foto ecommerce realista de ${productName}. Sin texto, sin logos, producto reconocible.`,
  productImageWhite: "Fondo blanco limpio, luz suave, producto centrado.",
  productImageAmbient: "Ambiente calido de tienda de regalos, escena natural y elegante."
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxRequestBytes) {
      const error = new Error("El archivo supera el limite de 15 MB.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function sendApiError(res, error, fallbackMessage) {
  const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 500;
  sendJson(res, status, { error: error instanceof Error ? error.message : fallbackMessage });
}

function createClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function slugify(value) {
  return String(value || "producto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "producto";
}

function base64FromDataUrl(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
    base64: match[2]
  };
}

async function saveGeneratedImage({ productName, variant, b64Json, remoteUrl }) {
  await fs.mkdir(generatedDir, { recursive: true });
  const fileName = `${slugify(productName)}-${variant}-${Date.now()}.png`;
  const filePath = path.join(generatedDir, fileName);

  if (b64Json) {
    await fs.writeFile(filePath, Buffer.from(b64Json, "base64"));
    return `/generated/products/${fileName}`;
  }

  if (remoteUrl) {
    const response = await fetch(remoteUrl);
    if (!response.ok) throw new Error("No se pudo descargar la imagen generada");
    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, bytes);
    return `/generated/products/${fileName}`;
  }

  return "";
}

async function saveUploadedProductImage(payload) {
  const parsed = base64FromDataUrl(payload.image);
  if (!parsed) throw new Error("Imagen invalida");
  await fs.mkdir(generatedDir, { recursive: true });
  const fileName = `${slugify(payload.productName)}-manual-${Date.now()}.png`;
  const filePath = path.join(generatedDir, fileName);
  await fs.writeFile(filePath, Buffer.from(parsed.base64, "base64"));
  return {
    url: `/generated/products/${fileName}`,
    notes: "Imagen guardada como archivo local."
  };
}

async function imageRequest(client, prompt, baseImage) {
  const parsedBaseImage = base64FromDataUrl(baseImage);
  if (parsedBaseImage) {
    const extension = parsedBaseImage.mimeType.split("/")[1].replace("jpeg", "jpg");
    const imageFile = await toFile(Buffer.from(parsedBaseImage.base64, "base64"), `producto-base.${extension}`, {
      type: parsedBaseImage.mimeType
    });
    return client.images.edit({
      model: imageModel,
      image: imageFile,
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
      input_fidelity: "high"
    });
  }

  return client.images.generate({
    model: imageModel,
    prompt,
    size: "1024x1024",
    quality: "medium",
    output_format: "png"
  });
}

function fallbackPurchase(products) {
  return {
    mode: "demo",
    notes: "OPENAI_API_KEY no esta configurada. Se uso la precarga demo local.",
    lines: products.slice(0, 3).flatMap((product) =>
      product.variants.slice(0, 1).map((variant) => ({
        productId: product.id,
        variantId: variant.id,
        quantity: 1,
        unitCost: variant.cost,
        confidence: 0.35,
        reason: "Sugerencia demo"
      }))
    )
  };
}

async function purchasePreload(payload) {
  const client = createClient();
  if (!client) return fallbackPurchase(payload.products ?? []);

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      notes: { type: "string" },
      lines: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            productId: { type: "string" },
            variantId: { type: "string" },
            quantity: { type: "number" },
            unitCost: { type: "number" },
            confidence: { type: "number" },
            reason: { type: "string" }
          },
          required: ["productId", "variantId", "quantity", "unitCost", "confidence", "reason"]
        }
      }
    },
    required: ["notes", "lines"]
  };

  const response = await client.responses.create({
    model: textModel,
    input: [
      {
        role: "system",
        content: aiPrompts.purchaseSystem
      },
      {
        role: "user",
        content: JSON.stringify({
          pedido: payload.expected,
          recibido: payload.received,
          archivo: payload.fileName,
          productos: payload.products
        })
      }
    ],
    max_output_tokens: 900,
    text: {
      format: {
        type: "json_schema",
        name: "purchase_preload",
        schema,
        strict: true
      }
    }
  });

  return { mode: "openai", ...JSON.parse(response.output_text) };
}

async function generateProductImages(payload) {
  const client = createClient();
  const productName = payload.productName || "Producto";
  const promptBase = aiPrompts.productImageBase(productName);
  const imagePrompts = [
    `${promptBase} ${aiPrompts.productImageWhite}`,
    `${promptBase} ${aiPrompts.productImageAmbient}`
  ];

  if (!client) {
    return {
      mode: "demo",
      description: `${productName} presentado para regalo, con ficha lista para publicar.`,
      prompts: imagePrompts,
      images: [],
      notes: "OPENAI_API_KEY no esta configurada. Se generaron prompts, no imagenes reales."
    };
  }

  const copy = await client.responses.create({
    model: textModel,
    input: [
      { role: "system", content: aiPrompts.productCopySystem },
      { role: "user", content: `Producto: ${productName}\nActual: ${payload.description || ""}` }
    ],
    max_output_tokens: 90
  });

  const images = [];
  const generated = [];
  for (const [index, prompt] of imagePrompts.entries()) {
    try {
      const image = await imageRequest(client, prompt, payload.baseImage);
      const item = image.data?.[0];
      const savedUrl = await saveGeneratedImage({
        productName,
        variant: index === 0 ? "fondo-blanco" : "ambiente",
        b64Json: item?.b64_json,
        remoteUrl: item?.url
      });
      if (savedUrl) {
        images.push(savedUrl);
        generated.push(index === 0 ? "fondo blanco" : "ambiente");
      }
    } catch (error) {
      generated.push(`fallo ${index === 0 ? "fondo blanco" : "ambiente"}`);
    }
  }

  return {
    mode: "openai",
    description: copy.output_text.trim(),
    prompts: imagePrompts,
    images: images.filter(Boolean),
    notes: images.filter(Boolean).length
      ? `Imagenes reales generadas y guardadas: ${generated.join(", ")}.`
      : "OpenAI genero texto, pero las imagenes no pudieron generarse."
  };
}

export function registerOpenAiApi(server) {
  server.middlewares.use("/api/ai/purchase-preload", async (req, res) => {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Metodo no permitido" });
    try {
      sendJson(res, 200, await purchasePreload(await readJson(req)));
    } catch (error) {
      sendApiError(res, error, "Error de IA");
    }
  });

  server.middlewares.use("/api/ai/product-images", async (req, res) => {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Metodo no permitido" });
    try {
      sendJson(res, 200, await generateProductImages(await readJson(req)));
    } catch (error) {
      sendApiError(res, error, "Error de IA");
    }
  });

  server.middlewares.use("/api/ai/store-product-image", async (req, res) => {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Metodo no permitido" });
    try {
      sendJson(res, 200, await saveUploadedProductImage(await readJson(req)));
    } catch (error) {
      sendApiError(res, error, "Error al guardar imagen");
    }
  });
}
