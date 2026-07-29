import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function toBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function safePathPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "producto";
}

function catalogPrompt(productName: string, brand: string) {
  return [
    "Editar la fotografía de referencia como una fotografía comercial premium para catálogo y ecommerce.",
    `El único sujeto es el producto llamado ${productName}.`,
    brand ? `La marca declarada es ${brand}.` : "",
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const authorization = request.headers.get("Authorization") ?? "";
  if (!openAiKey) return json({ error: "Falta OPENAI_API_KEY en los secretos de Supabase." }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Sesión no autorizada." }, 401);
  const { data: role } = await userClient.rpc("current_app_role");
  if (!["dueno", "administrador"].includes(String(role))) {
    return json({ error: "Solo dueño o administrador pueden generar fotos premium." }, 403);
  }

  const input = await request.json();
  const productId = String(input.productId ?? "").trim().slice(0, 100);
  const productName = String(input.productName ?? "").trim().slice(0, 160);
  const brand = String(input.brand ?? "").trim().slice(0, 100);
  if (!productId || !productName || !input.imageUrl) {
    return json({ error: "Faltan el producto o la imagen de referencia." }, 400);
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(String(input.imageUrl));
  } catch {
    return json({ error: "La imagen seleccionada no tiene una URL válida." }, 400);
  }
  const allowedImageHosts = new Set([new URL(supabaseUrl).hostname, "images.unsplash.com"]);
  if (imageUrl.protocol !== "https:" || !allowedImageHosts.has(imageUrl.hostname)) {
    return json({ error: "La imagen debe estar alojada en el almacenamiento autorizado." }, 400);
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) return json({ error: "No se pudo leer la imagen seleccionada." }, 400);
  const contentType = imageResponse.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return json({ error: "El archivo seleccionado no es una imagen." }, 400);
  const contentLength = Number(imageResponse.headers.get("content-length") ?? "0");
  if (contentLength > 12 * 1024 * 1024) return json({ error: "La imagen supera 12 MB." }, 400);
  const imageBlob = await imageResponse.blob();
  if (imageBlob.size > 12 * 1024 * 1024) return json({ error: "La imagen supera 12 MB." }, 400);

  const model = Deno.env.get("OPENAI_CATALOG_IMAGE_MODEL") ?? "gpt-image-2";
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", catalogPrompt(productName, brand));
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append("output_format", "png");
  form.append("image[]", imageBlob, "producto-referencia.png");

  const openAiResponse = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form
  });
  const openAiBody = await openAiResponse.json();
  if (!openAiResponse.ok) {
    console.error("OpenAI catalog image error", openAiBody?.error?.code, openAiBody?.error?.message);
    return json({ error: openAiBody?.error?.message ?? "No se pudo generar la foto premium." }, openAiResponse.status);
  }

  const encoded = openAiBody?.data?.[0]?.b64_json;
  if (!encoded) return json({ error: "OpenAI no devolvió una imagen." }, 502);

  const path = `${safePathPart(productId)}/premium-${crypto.randomUUID()}.png`;
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { error: uploadError } = await adminClient.storage.from("product-images").upload(path, toBytes(encoded), {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: false
  });
  if (uploadError) return json({ error: uploadError.message }, 500);

  const generatedImageUrl = adminClient.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  return json({ imageUrl: generatedImageUrl, model });
});
