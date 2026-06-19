import { isCloudCatalogEnabled } from "./catalogCloud";
import { supabase } from "./supabaseClient";
import type { EmailMessage, OnlineOrder } from "./types";

export async function saveCloudOrder(order: OnlineOrder, emails: EmailMessage[]) {
  if (!isCloudCatalogEnabled()) return true;
  if (!supabase) return false;
  const { error } = await supabase.rpc("create_store_order", {
    order_data: order,
    email_data: emails
  });
  if (error) {
    console.error("No se pudo registrar el pedido web.", error.message);
    return false;
  }
  return true;
}

export async function loadCloudCommerce() {
  if (!isCloudCatalogEnabled() || !supabase) return { orders: [], emails: [] };
  const [{ data: orderRows }, { data: emailRows }] = await Promise.all([
    supabase.from("store_orders").select("data").order("created_at", { ascending: false }).limit(100),
    supabase.from("store_email_queue").select("data").order("created_at", { ascending: false }).limit(100)
  ]);
  return {
    orders: (orderRows ?? []).map((row) => row.data as OnlineOrder),
    emails: (emailRows ?? []).map((row) => row.data as EmailMessage)
  };
}
