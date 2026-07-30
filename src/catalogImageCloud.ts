import { supabase } from "./supabaseClient";
import { requestImageOptimization } from "./imageAssetsCloud";

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

async function invokeCatalogImage(input: CatalogImageGenerationInput) {
  const { data } = await supabase!.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Tu sesión venció. Volvé a ingresar para generar la imagen.");

  const apiBaseUrl = String(import.meta.env.VITE_INTERNAL_API_URL || "").replace(/\/$/, "");
  const response = await fetch(`${apiBaseUrl}/api/ai/catalog-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(input)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.imageUrl) {
    throw new Error(body.error || "No se pudo generar la foto premium.");
  }
  void requestImageOptimization(String(body.imageUrl));
  return body as CatalogImageGenerationResult;
}

export async function generateCatalogProductImage(input: CatalogImageGenerationInput) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  return invokeCatalogImage(input);
}
