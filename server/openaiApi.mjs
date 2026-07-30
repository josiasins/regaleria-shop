import fs from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";

const textModel = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const lifestyleImageModel = process.env.OPENAI_LIFESTYLE_IMAGE_MODEL || "gpt-image-2";
const catalogImageModel = process.env.OPENAI_CATALOG_IMAGE_MODEL || "gpt-image-2";
const generatedDir = path.resolve(process.cwd(), "public/generated/products");
const publicDir = path.resolve(process.cwd(), "public");
const maxRequestBytes = 15 * 1024 * 1024;
const catalogGenerationWindowMs = 10 * 60 * 1000;
const catalogGenerationLimit = 5;
const catalogGenerationAttempts = new Map();

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

function applyInternalAppCors(req, res) {
  const origin = String(req.headers.origin || "");
  const configuredOrigins = String(
    process.env.INTERNAL_APP_ORIGINS || "https://sistema.regaleriashop.com,http://localhost:5174,http://127.0.0.1:5174"
  ).split(",").map((value) => value.trim()).filter(Boolean);
  if (origin && configuredOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

function statusError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function supabaseServerConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) throw statusError("Supabase no está configurado en el servidor.", 500);
  return { url: url.replace(/\/$/, ""), anonKey };
}

async function authorizeImageGeneration(req) {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.startsWith("Bearer ")) throw statusError("Sesión no autorizada.", 401);
  const { url, anonKey } = supabaseServerConfig();
  const headers = { apikey: anonKey, Authorization: authorization };

  const userResponse = await fetch(`${url}/auth/v1/user`, { headers });
  if (!userResponse.ok) throw statusError("Tu sesión venció. Volvé a ingresar.", 401);
  const user = await userResponse.json();
  if (!user?.id) throw statusError("Sesión no autorizada.", 401);

  const roleResponse = await fetch(`${url}/rest/v1/rpc/current_app_role`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}"
  });
  if (!roleResponse.ok) throw statusError("No se pudo verificar tu permiso.", 403);
  const role = await roleResponse.json();
  if (!["dueno", "administrador"].includes(String(role))) {
    throw statusError("Solo dueño o administrador pueden generar fotos premium.", 403);
  }

  const now = Date.now();
  const recentAttempts = (catalogGenerationAttempts.get(user.id) || []).filter(
    (timestamp) => now - timestamp < catalogGenerationWindowMs
  );
  if (recentAttempts.length >= catalogGenerationLimit) {
    throw statusError("Alcanzaste el límite temporal de generaciones. Esperá unos minutos.", 429);
  }
  catalogGenerationAttempts.set(user.id, [...recentAttempts, now]);

  return { authorization, url, anonKey, userId: user.id };
}

function validateCatalogImageUrl(imageUrl, supabaseUrl) {
  const parsed = base64FromDataUrl(imageUrl);
  if (parsed) {
    if (Buffer.byteLength(parsed.base64, "base64") > 12 * 1024 * 1024) {
      throw statusError("La imagen supera 12 MB.", 400);
    }
    return;
  }

  let source;
  try {
    source = new URL(String(imageUrl));
  } catch {
    throw statusError("La imagen seleccionada no tiene una URL válida.", 400);
  }
  const allowedHosts = new Set([new URL(supabaseUrl).hostname, "images.unsplash.com"]);
  if (source.protocol !== "https:" || !allowedHosts.has(source.hostname)) {
    throw statusError("La imagen debe estar alojada en el almacenamiento autorizado.", 400);
  }
}

async function uploadGeneratedImage({ bytes, folder, filePrefix, authorization, url, anonKey }) {
  const imagePath = `${slugify(folder)}/${slugify(filePrefix)}-${crypto.randomUUID()}.png`;
  const encodedPath = imagePath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${url}/storage/v1/object/product-images/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: authorization,
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000",
      "x-upsert": "false"
    },
    body: bytes
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw statusError(body.message || body.error || "No se pudo guardar la imagen en la nube.", response.status);
  }
  return `${url}/storage/v1/object/public/product-images/${encodedPath}`;
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

function imageContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

async function lifestyleReferenceFile(imageUrl, index) {
  const parsed = base64FromDataUrl(imageUrl);
  if (parsed) {
    const extension = parsed.mimeType.split("/")[1].replace("jpeg", "jpg");
    return toFile(Buffer.from(parsed.base64, "base64"), `producto-${index + 1}.${extension}`, { type: parsed.mimeType });
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`No se pudo leer la imagen de referencia ${index + 1}.`);
    const contentType = response.headers.get("content-type") || "image/png";
    return toFile(Buffer.from(await response.arrayBuffer()), `producto-${index + 1}.png`, { type: contentType });
  }

  const relativePath = decodeURIComponent(String(imageUrl).split("?")[0]).replace(/^\/+/, "");
  const filePath = path.resolve(publicDir, relativePath);
  if (filePath !== publicDir && !filePath.startsWith(`${publicDir}${path.sep}`)) throw new Error("Ruta de imagen no permitida.");
  return toFile(await fs.readFile(filePath), `producto-${index + 1}${path.extname(filePath) || ".png"}`, {
    type: imageContentType(filePath)
  });
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

function catalogImagePrompt(payload) {
  return [
    "Editar la fotografía de referencia como una fotografía comercial premium para catálogo y ecommerce.",
    `El único sujeto es el producto llamado ${String(payload.productName || "Producto").slice(0, 160)}.`,
    payload.brand ? `La marca declarada es ${String(payload.brand).slice(0, 100)}.` : "",
    "Representar exactamente el mismo producto de referencia. Preservar sin cambios su forma, color, materiales, proporciones, textura, logo, etiqueta, grabado, impresión y cualquier marca visible.",
    "No rediseñar, corregir, traducir, reemplazar ni inventar texto o identidad de marca. Si un detalle no es legible, conservarlo visualmente sin reconstruirlo.",
    "Quitar solamente el entorno original y presentar el producto completamente visible, centrado y con escala comercial equilibrada en formato cuadrado 1:1.",
    "Usar fondo blanco puro e infinito, recorte limpio y una sombra de contacto suave y físicamente plausible.",
    "Mejorar únicamente encuadre, separación, balance de blancos, exposición e iluminación suave de estudio. Mantener una perspectiva natural de lente normal y el producto íntegramente nítido.",
    "Conservar microtexturas, reflejos y variaciones tonales reales. Resultado fotográfico objetivo, sin apariencia de render o CGI.",
    "No agregar accesorios, decoraciones, personas, manos, texto, marcas de agua, logos, claims ni elementos que no existan en la referencia.",
    "Evitar plástico artificial, suavizado excesivo, HDR, halos, reflejos imposibles, bokeh artificial y simetría rígida."
  ].filter(Boolean).join(" ");
}

async function generateCatalogImage(payload, req) {
  const access = await authorizeImageGeneration(req);
  const client = createClient();
  if (!client) throw new Error("OPENAI_API_KEY no está configurada.");
  if (!payload.productId || !payload.productName) throw statusError("Falta identificar el producto.", 400);
  if (!payload.imageUrl) throw new Error("Seleccioná una imagen de referencia.");
  validateCatalogImageUrl(payload.imageUrl, access.url);
  const imageFile = await lifestyleReferenceFile(payload.imageUrl, 0);
  const result = await client.images.edit({
    model: catalogImageModel,
    image: imageFile,
    prompt: catalogImagePrompt(payload),
    size: "1024x1024",
    quality: "medium",
    output_format: "png"
  });
  const item = result.data?.[0];
  let bytes;
  if (item?.b64_json) {
    bytes = Buffer.from(item.b64_json, "base64");
  } else if (item?.url) {
    const imageResponse = await fetch(item.url);
    if (!imageResponse.ok) throw new Error("No se pudo descargar la imagen generada.");
    bytes = Buffer.from(await imageResponse.arrayBuffer());
  }
  if (!bytes?.length) throw new Error("OpenAI no devolvió una imagen.");
  const imageUrl = await uploadGeneratedImage({
    bytes,
    folder: payload.productId,
    filePrefix: "premium",
    ...access
  });
  return { imageUrl, model: catalogImageModel };
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

function lifestylePrompt(payload) {
  const names = payload.products.map((product) => product.name).join(", ");
  const sceneLabels = {
    hogar: "un hogar luminoso, contemporaneo y real",
    regalo: "una presentacion de regalo cuidada, con papel y cinta discretos",
    mesa: "una mesa editorial clara con composicion comercial",
    tienda: "una vidriera de tienda de regalos ordenada y natural"
  };
  return [
    `Crear una fotografia lifestyle horizontal usando exactamente estos productos de referencia: ${names}.`,
    `Integrarlos juntos en ${sceneLabels[payload.scene] || sceneLabels.hogar}.`,
    "Conservar forma, materiales, colores y detalles reconocibles de cada producto.",
    "Luz natural suave, fotografia ecommerce premium, composicion limpia, sin texto, sin logos agregados, sin personas.",
    payload.brief ? `Indicacion adicional: ${String(payload.brief).slice(0, 500)}.` : ""
  ].filter(Boolean).join(" ");
}

async function generateLifestyle(payload, req) {
  const access = await authorizeImageGeneration(req);
  const products = Array.isArray(payload.products) ? payload.products.filter((product) => product?.imageUrl && product?.name).slice(0, 3) : [];
  if (products.length < 2) throw statusError("Elegí al menos dos productos con imagen.", 400);
  const client = createClient();
  if (!client) throw new Error("OPENAI_API_KEY no esta configurada.");

  const inputImages = [];
  for (const [index, product] of products.entries()) {
    try {
      validateCatalogImageUrl(product.imageUrl, access.url);
      inputImages.push(await lifestyleReferenceFile(product.imageUrl, index));
    } catch {
      throw new Error(`No se pudo leer la imagen de ${product.name}.`);
    }
  }

  const prompt = lifestylePrompt({ ...payload, products });
  const result = await client.images.edit({
    model: lifestyleImageModel,
    image: inputImages,
    prompt,
    size: "1536x1024",
    quality: payload.quality === "medium" ? "medium" : "low",
    output_format: "png"
  });
  const item = result.data?.[0];
  let bytes;
  if (item?.b64_json) {
    bytes = Buffer.from(item.b64_json, "base64");
  } else if (item?.url) {
    const imageResponse = await fetch(item.url);
    if (!imageResponse.ok) throw new Error("No se pudo descargar la imagen generada.");
    bytes = Buffer.from(await imageResponse.arrayBuffer());
  }
  if (!bytes?.length) throw new Error("OpenAI no devolvió una imagen.");
  const imageUrl = await uploadGeneratedImage({
    bytes,
    folder: "storefront",
    filePrefix: "lifestyle",
    ...access
  });
  return { imageUrl, prompt, model: lifestyleImageModel };
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

  server.middlewares.use("/api/ai/catalog-image", handleCatalogImageRequest);

  server.middlewares.use("/api/ai/lifestyle", handleLifestyleImageRequest);
}

export async function handleCatalogImageRequest(req, res) {
  applyInternalAppCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") return sendJson(res, 405, { error: "Metodo no permitido" });
  const origin = String(req.headers.origin || "");
  if (origin && !res.getHeader("Access-Control-Allow-Origin")) {
    return sendJson(res, 403, { error: "Origen no autorizado." });
  }
  try {
    sendJson(res, 200, await generateCatalogImage(await readJson(req), req));
  } catch (error) {
    sendApiError(res, error, "Error al generar la foto premium");
  }
}

export async function handleLifestyleImageRequest(req, res) {
  applyInternalAppCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") return sendJson(res, 405, { error: "Metodo no permitido" });
  const origin = String(req.headers.origin || "");
  if (origin && !res.getHeader("Access-Control-Allow-Origin")) {
    return sendJson(res, 403, { error: "Origen no autorizado." });
  }
  try {
    sendJson(res, 200, await generateLifestyle(await readJson(req), req));
  } catch (error) {
    sendApiError(res, error, "Error al generar la composicion");
  }
}
