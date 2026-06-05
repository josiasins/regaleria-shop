import type { Product } from "./types";

export interface AiPurchaseLine {
  productId: string;
  variantId: string;
  quantity: number;
  unitCost: number;
  confidence: number;
  reason: string;
}

export interface AiPurchaseResult {
  mode: "openai" | "demo";
  notes: string;
  lines: AiPurchaseLine[];
}

export interface AiProductImageResult {
  mode: "openai" | "demo";
  description: string;
  prompts: string[];
  images: string[];
  notes: string;
}

export interface StoredProductImageResult {
  url: string;
  notes: string;
}

function compactProducts(products: Product[], query: string) {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9áéíóúñ]+/i)
    .filter((token) => token.length > 2);

  const scored = products.map((product) => {
    const haystack = `${product.name} ${product.category} ${product.supplier} ${product.variants.map((variant) => `${variant.name} ${variant.sku} ${variant.barcode}`).join(" ")}`.toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
    return { product, score };
  });

  const selected = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((item) => item.product);

  const candidates = selected.length ? selected : products.slice(0, 12);

  return candidates.map((product) => ({
    id: product.id,
    n: product.name,
    cat: product.category,
    sup: product.supplier,
    v: product.variants.map((variant) => ({
      id: variant.id,
      n: variant.name,
      sku: variant.sku,
      bar: variant.barcode,
      cost: variant.cost
    }))
  }));
}

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function analyzePurchaseWithOpenAi(input: {
  expected: string;
  received: string;
  fileName: string;
  products: Product[];
}) {
  return postJson<AiPurchaseResult>("/api/ai/purchase-preload", {
    expected: input.expected,
    received: input.received,
    fileName: input.fileName,
    products: compactProducts(input.products, `${input.expected} ${input.received} ${input.fileName}`)
  });
}

export function generateProductImagesWithOpenAi(input: {
  productName: string;
  description: string;
  baseImage?: string;
}) {
  return postJson<AiProductImageResult>("/api/ai/product-images", input);
}

export function storeProductImage(input: { productName: string; image: string }) {
  return postJson<StoredProductImageResult>("/api/ai/store-product-image", input);
}
