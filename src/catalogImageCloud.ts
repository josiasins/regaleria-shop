import { supabase } from "./supabaseClient";

export interface CatalogImageGenerationInput {
  productId: string;
  productName: string;
  brand?: string;
  imageUrl: string;
}

export interface CatalogImageGenerationResult {
  imageUrl: string;
  model: string;
}

async function invokeLocalCatalogImage(input: CatalogImageGenerationInput) {
  const response = await fetch("/api/ai/catalog-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.imageUrl) {
    throw new Error(body.error || "No se pudo generar la foto premium.");
  }
  return body as CatalogImageGenerationResult;
}

export async function generateCatalogProductImage(input: CatalogImageGenerationInput) {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke<CatalogImageGenerationResult>("generate-catalog-image", {
      body: input
    });
    if (!error && data?.imageUrl) return data;
    if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      throw new Error(error?.message || "La herramienta de foto premium no está disponible.");
    }
  }
  return invokeLocalCatalogImage(input);
}
