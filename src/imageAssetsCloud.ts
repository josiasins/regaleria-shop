import { supabase } from "./supabaseClient";

export interface ImageVariant {
  width: number;
  bytes: number;
  url: string;
}
interface ImageAssetRow {
  original_url: string;
  variants: ImageVariant[];
}

let assetPromise: Promise<Map<string, ImageVariant[]>> | null = null;

export function loadImageAssets() {
  if (!assetPromise) {
    assetPromise = (async () => {
      const map = new Map<string, ImageVariant[]>();
      if (!supabase) return map;
      const { data, error } = await supabase.from("image_assets").select("original_url,variants");
      if (error) return map;
      for (const row of (data ?? []) as ImageAssetRow[]) {
        map.set(row.original_url, [...row.variants].sort((a, b) => a.width - b.width));
      }
      return map;
    })();
  }
  return assetPromise;
}

export async function requestImageOptimization(sourceUrl: string) {
  if (!supabase || !sourceUrl) return null;
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return null;
  const apiBaseUrl = String(import.meta.env.VITE_INTERNAL_API_URL || "").replace(/\/$/, "");
  if (!apiBaseUrl) return null;
  const response = await fetch(`${apiBaseUrl}/api/images/optimize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ sourceUrl })
  });
  if (!response.ok) return null;
  assetPromise = null;
  return response.json();
}
