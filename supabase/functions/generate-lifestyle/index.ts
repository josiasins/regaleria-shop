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

function promptFor(input: {
  products: Array<{ name: string }>;
  scene: "hogar" | "regalo" | "mesa" | "tienda";
  brief?: string;
}) {
  const sceneLabels = {
    hogar: "un hogar luminoso, contemporaneo y real",
    regalo: "una presentacion de regalo cuidada, con papel y cinta discretos",
    mesa: "una mesa editorial clara con composicion comercial",
    tienda: "una vidriera de tienda de regalos ordenada y natural"
  };
  return [
    `Crear una fotografia lifestyle horizontal usando exactamente estos productos de referencia: ${input.products.map((product) => product.name).join(", ")}.`,
    `Integrarlos juntos en ${sceneLabels[input.scene] ?? sceneLabels.hogar}.`,
    "Conservar forma, materiales, colores y detalles reconocibles de cada producto.",
    "Luz natural suave, fotografia ecommerce premium, composicion limpia, sin texto, sin logos agregados, sin personas.",
    input.brief ? `Indicacion adicional: ${input.brief.slice(0, 500)}.` : ""
  ].filter(Boolean).join(" ");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Metodo no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const authorization = request.headers.get("Authorization") ?? "";
  if (!openAiKey) return json({ error: "Falta OPENAI_API_KEY en los secretos de Supabase." }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Sesion no autorizada." }, 401);
  const { data: role } = await userClient.rpc("current_app_role");
  if (!["dueno", "administrador"].includes(String(role))) return json({ error: "Solo dueño o administrador pueden generar imagenes." }, 403);

  const input = await request.json();
  const products = Array.isArray(input.products)
    ? input.products.filter((product: { imageUrl?: string; name?: string }) => product?.imageUrl && product?.name).slice(0, 3)
    : [];
  if (products.length < 2) return json({ error: "Elegí dos o tres productos con imagen." }, 400);
  const allowedImageHosts = new Set([new URL(supabaseUrl).hostname, "images.unsplash.com"]);

  const form = new FormData();
  form.append("model", Deno.env.get("OPENAI_LIFESTYLE_IMAGE_MODEL") ?? "gpt-image-2");
  form.append("prompt", promptFor({ products, scene: input.scene, brief: input.brief }));
  form.append("size", "1536x1024");
  form.append("quality", input.quality === "medium" ? "medium" : "low");
  form.append("output_format", "jpeg");
  form.append("output_compression", "86");

  for (const [index, product] of products.entries()) {
    let imageUrl: URL;
    try {
      imageUrl = new URL(product.imageUrl);
    } catch {
      return json({ error: `La imagen de ${product.name} no tiene una URL valida.` }, 400);
    }
    if (!["https:", "http:"].includes(imageUrl.protocol)) {
      return json({ error: `La imagen de ${product.name} usa un protocolo no permitido.` }, 400);
    }
    if (!allowedImageHosts.has(imageUrl.hostname)) {
      return json({ error: `La imagen de ${product.name} debe estar en el almacenamiento autorizado.` }, 400);
    }
    const response = await fetch(imageUrl);
    if (!response.ok) return json({ error: `No se pudo leer la imagen de ${product.name}.` }, 400);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return json({ error: `La referencia de ${product.name} no es una imagen.` }, 400);
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > 12 * 1024 * 1024) return json({ error: `La imagen de ${product.name} supera 12 MB.` }, 400);
    const blob = await response.blob();
    if (blob.size > 12 * 1024 * 1024) return json({ error: `La imagen de ${product.name} supera 12 MB.` }, 400);
    form.append("image[]", blob, `producto-${index + 1}.png`);
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: form
  });
  const openAiBody = await openAiResponse.json();
  if (!openAiResponse.ok) {
    console.error("OpenAI image error", openAiBody?.error?.code, openAiBody?.error?.message);
    return json({ error: openAiBody?.error?.message ?? "No se pudo generar la imagen." }, openAiResponse.status);
  }

  const encoded = openAiBody?.data?.[0]?.b64_json;
  if (!encoded) return json({ error: "OpenAI no devolvio una imagen." }, 502);

  const path = `storefront/lifestyle-${crypto.randomUUID()}.jpg`;
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { error: uploadError } = await adminClient.storage.from("product-images").upload(path, toBytes(encoded), {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false
  });
  if (uploadError) return json({ error: uploadError.message }, 500);
  const imageUrl = adminClient.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  return json({
    imageUrl,
    prompt: form.get("prompt"),
    model: form.get("model")
  });
});
