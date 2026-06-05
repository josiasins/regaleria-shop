import { supabase } from "./supabaseClient";

export type FileBucket = "product-images" | "purchase-documents" | "transfer-receipts" | "expense-documents";

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
