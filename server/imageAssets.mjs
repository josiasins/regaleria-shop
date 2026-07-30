import crypto from "node:crypto";
import sharp from "sharp";

const widths = [320, 640, 1280, 1920];
const maxSourceBytes = 15 * 1024 * 1024;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}
function applyCors(req, res) {
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
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 64 * 1024) throw Object.assign(new Error("Solicitud demasiado grande."), { statusCode: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function config() {
  const url = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) throw Object.assign(new Error("Supabase no está configurado."), { statusCode: 500 });
  return { url, anonKey };
}

async function authorize(req) {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.startsWith("Bearer ")) throw Object.assign(new Error("Sesión no autorizada."), { statusCode: 401 });
  const { url, anonKey } = config();
  const headers = { apikey: anonKey, Authorization: authorization };
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers });
  if (!userResponse.ok) throw Object.assign(new Error("Tu sesión venció. Volvé a ingresar."), { statusCode: 401 });
  const roleResponse = await fetch(`${url}/rest/v1/rpc/current_app_role`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: "{}"
  });
  const role = roleResponse.ok ? await roleResponse.json() : "";
  if (!["dueno", "administrador"].includes(String(role))) {
    throw Object.assign(new Error("Solo dueño o administrador pueden optimizar imágenes."), { statusCode: 403 });
  }
  return { url, anonKey, authorization };
}

function validateSource(sourceUrl, supabaseUrl) {
  let source;
  try {
    source = new URL(String(sourceUrl));
  } catch {
    throw Object.assign(new Error("La imagen no tiene una URL válida."), { statusCode: 400 });
  }
  const allowedHosts = new Set([new URL(supabaseUrl).hostname, "images.unsplash.com"]);
  if (source.protocol !== "https:" || !allowedHosts.has(source.hostname)) {
    throw Object.assign(new Error("Origen de imagen no permitido."), { statusCode: 400 });
  }
  return source;
}

async function uploadVariant({ bytes, width, hash, url, anonKey, authorization }) {
  const objectPath = `optimized/${hash}/${width}.webp`;
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${url}/storage/v1/object/product-images/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: authorization,
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-upsert": "true"
    },
    body: bytes
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || body.error || "No se pudo guardar una variante."), { statusCode: response.status });
  }
  return {
    width,
    bytes: bytes.byteLength,
    url: `${url}/storage/v1/object/public/product-images/${encodedPath}`
  };
}

export async function handleImageOptimizationRequest(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") return sendJson(res, 405, { error: "Método no permitido." });

  try {
    const credentials = await authorize(req);
    const payload = await readJson(req);
    const source = validateSource(payload.sourceUrl, credentials.url);
    const response = await fetch(source, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw Object.assign(new Error("No se pudo leer la imagen original."), { statusCode: 400 });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) throw Object.assign(new Error("El archivo no es una imagen."), { statusCode: 400 });
    const original = Buffer.from(await response.arrayBuffer());
    if (original.byteLength > maxSourceBytes) throw Object.assign(new Error("La imagen supera 15 MB."), { statusCode: 400 });
    const hash = crypto.createHash("sha256").update(original).digest("hex").slice(0, 24);
    const base = sharp(original, { failOn: "warning" }).rotate();
    const variants = [];
    for (const width of widths) {
      const optimized = await base
        .clone()
        .resize({ width, fit: "inside", withoutEnlargement: true })
        .webp({ quality: width <= 640 ? 80 : 84, effort: 5, smartSubsample: true })
        .toBuffer();
      variants.push(await uploadVariant({ bytes: optimized, width, hash, ...credentials }));
    }

    const saveResponse = await fetch(`${credentials.url}/rest/v1/rpc/save_image_asset`, {
      method: "POST",
      headers: {
        apikey: credentials.anonKey,
        Authorization: credentials.authorization,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source_url: String(source),
        source_hash: hash,
        source_bytes: original.byteLength,
        generated_variants: variants
      })
    });
    if (!saveResponse.ok) {
      const body = await saveResponse.json().catch(() => ({}));
      throw Object.assign(new Error(body.message || "No se pudo registrar la optimización."), { statusCode: saveResponse.status });
    }
    return sendJson(res, 200, { sourceUrl: String(source), originalBytes: original.byteLength, variants });
  } catch (error) {
    return sendJson(res, Number(error?.statusCode || 500), {
      error: error instanceof Error ? error.message : "No se pudo optimizar la imagen."
    });
  }
}
