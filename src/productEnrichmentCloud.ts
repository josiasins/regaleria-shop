import { supabase } from "./supabaseClient";
import type { ProductCommerce } from "./types";

export interface ProductEnrichmentInput {
  productId: string;
  productName: string;
  code: string;
  category: string;
  brand: string;
  description: string;
  imageUrl: string;
}

export interface ProductEnrichmentResult {
  description: string;
  commerce: Pick<
    ProductCommerce,
    | "valueProposition"
    | "whatIsIt"
    | "idealFor"
    | "occasions"
    | "includes"
    | "materials"
    | "care"
    | "presentation"
  > & {
    giftProfile: Pick<ProductCommerce["giftProfile"], "recipients" | "occasions" | "interests">;
  };
  model: string;
}

export async function generateProductEnrichment(input: ProductEnrichmentInput) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Tu sesión venció. Volvé a ingresar.");

  const apiBaseUrl = String(import.meta.env.VITE_INTERNAL_API_URL || "").replace(/\/$/, "");
  const response = await fetch(`${apiBaseUrl}/api/ai/product-enrichment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(input)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.commerce) {
    throw new Error(body.error || "No se pudo completar la ficha comercial.");
  }
  return body as ProductEnrichmentResult;
}
