import type { Product } from "./types";
import { supabase } from "./supabaseClient";

interface CatalogRow {
  id: string;
  publishable: boolean;
  data: Product;
  updated_at: string;
}

export function isCloudCatalogEnabled() {
  if (import.meta.env.MODE === "test") return false;
  const hostname = window.location.hostname.toLowerCase();
  const publicDomain = String(import.meta.env.VITE_PUBLIC_DOMAIN || "regaleriashop.com").toLowerCase();
  const internalDomain = String(import.meta.env.VITE_INTERNAL_DOMAIN || "sistema.regaleriashop.com").toLowerCase();
  return hostname === publicDomain || hostname === `www.${publicDomain}` || hostname === internalDomain || hostname.endsWith(".onrender.com");
}

function catalogRow(product: Product) {
  return {
    id: product.id,
    publishable: product.publishable,
    data: { ...product, syncStatus: "sincronizado" },
    updated_at: new Date().toISOString()
  };
}

export async function loadCloudCatalog() {
  if (!isCloudCatalogEnabled()) return [];
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("public_catalog_products")
    .select("id,publishable,data,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("No se pudo cargar el catalogo compartido.", error.message);
    return null;
  }

  return (data as CatalogRow[]).map((row) => ({
    ...row.data,
    publishable: row.publishable,
    syncStatus: "sincronizado" as const
  }));
}

export async function saveCloudProduct(product: Product) {
  if (!isCloudCatalogEnabled()) return true;
  if (!supabase) return false;
  const row = catalogRow(product);
  const { error } = await supabase.rpc("save_catalog_product", {
    product_id: row.id,
    product_publishable: row.publishable,
    product_data: row.data
  });
  if (error) {
    console.error("No se pudo actualizar el producto compartido.", error.message);
    return false;
  }
  return true;
}

export async function deleteCloudProduct(productId: string) {
  if (!isCloudCatalogEnabled()) return true;
  if (!supabase) return false;
  const { error } = await supabase.rpc("delete_catalog_product", {
    product_id: productId
  });
  if (error) {
    console.error("No se pudo eliminar el producto compartido.", error.message);
    return false;
  }
  return true;
}

export async function seedCloudCatalog(products: Product[]) {
  if (!isCloudCatalogEnabled()) return true;
  if (!supabase || !products.length) return false;
  const { error } = await supabase.from("public_catalog_products").upsert(products.map(catalogRow), { onConflict: "id" });
  if (error) {
    console.error("No se pudo iniciar el catalogo compartido.", error.message);
    return false;
  }
  return true;
}
