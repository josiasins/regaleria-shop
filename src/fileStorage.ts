import { supabase } from "./supabaseClient";

export type FileBucket = "product-images" | "purchase-documents" | "transfer-receipts" | "expense-documents";

const productImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxProductImageBytes = 8 * 1024 * 1024;

function safeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "producto";
}

export async function uploadBusinessFile(bucket: FileBucket, path: string, file: File) {
  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true
  });

  if (error) throw error;
  return data;
}

export function getPublicBusinessFileUrl(bucket: FileBucket, path: string) {
  if (!supabase) return "";
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadProductImage(productId: string, productName: string, file: File) {
  if (!productImageTypes.has(file.type)) {
    throw new Error("Formato no compatible. Usa una imagen JPG, PNG o WebP.");
  }
  if (file.size > maxProductImageBytes) {
    throw new Error("La imagen supera los 8 MB. Reduce su tamaño e intenta nuevamente.");
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${safeFilePart(productId)}/${safeFilePart(productName)}-${crypto.randomUUID()}.${extension}`;
  await uploadBusinessFile("product-images", path, file);
  return getPublicBusinessFileUrl("product-images", path);
}
