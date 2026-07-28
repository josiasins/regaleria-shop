import type { Product, Role } from "./types";
import { supabase } from "./supabaseClient";
import { createDefaultStorefrontSettings, normalizeStorefrontSettings, type StorefrontSettings } from "./storefront";

interface StorefrontSettingsRow {
  data: StorefrontSettings;
  updated_at: string;
}

export interface LifestyleGenerationInput {
  products: Array<Pick<Product, "id" | "name" | "imageUrl">>;
  brief: string;
  scene: "hogar" | "regalo" | "mesa" | "tienda";
  quality: "low" | "medium";
}

export interface LifestyleGenerationResult {
  imageUrl: string;
  prompt: string;
  model: string;
}

export async function loadStorefrontSettings(products: readonly Product[]) {
  if (import.meta.env.MODE === "test") return createDefaultStorefrontSettings(products);
  if (!supabase) return createDefaultStorefrontSettings(products);
  const { data, error } = await supabase
    .from("storefront_settings")
    .select("data,updated_at")
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    console.error("No se pudo cargar la configuracion de la tienda.", error.message);
    return createDefaultStorefrontSettings(products);
  }

  const row = data as StorefrontSettingsRow | null;
  return normalizeStorefrontSettings(row ? { ...row.data, updatedAt: row.updated_at } : null, products);
}

export function subscribeToStorefrontSettings(
  products: readonly Product[],
  onChange: (settings: StorefrontSettings) => void
) {
  if (import.meta.env.MODE === "test" || !supabase) return () => undefined;
  const client = supabase;

  const channel = client
    .channel("storefront-settings-live")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "storefront_settings",
        filter: "id=eq.main"
      },
      (payload) => {
        const row = payload.new as StorefrontSettingsRow | undefined;
        if (!row?.data) return;
        onChange(normalizeStorefrontSettings({ ...row.data, updatedAt: row.updated_at }, products));
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function saveStorefrontSettings(settings: StorefrontSettings) {
  if (!supabase) return { ok: false, message: "Supabase no esta configurado." };
  const { data, error } = await supabase.rpc("save_storefront_settings", {
    settings_data: { ...settings, updatedAt: new Date().toISOString() }
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, updatedAt: String(data) };
}

export function canEditStorefront(role: Role) {
  return role === "dueno" || role === "administrador";
}

async function invokeLocalLifestyle(input: LifestyleGenerationInput) {
  const response = await fetch("/api/ai/lifestyle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "No se pudo generar la imagen lifestyle.");
  }
  return response.json() as Promise<LifestyleGenerationResult>;
}

export async function generateLifestyleImage(input: LifestyleGenerationInput) {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke<LifestyleGenerationResult>("generate-lifestyle", {
      body: input
    });
    if (!error && data?.imageUrl) return data;
    if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      throw new Error(error?.message || "La funcion de imagenes no esta disponible.");
    }
  }
  return invokeLocalLifestyle(input);
}
