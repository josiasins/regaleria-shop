import { isCloudCatalogEnabled } from "./catalogCloud";
import { supabase } from "./supabaseClient";
import type { EmailMessage, OnlineOrder, OnlineOrderManagementInput } from "./types";

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

export async function manageCloudOrder(input: OnlineOrderManagementInput) {
  if (!isCloudCatalogEnabled()) return null;
  if (!supabase) return null;
  const payload = input.action === "set_status"
    ? { status: input.status }
    : input.action === "add_payment"
      ? { payment: input.payment }
      : input.action === "update_delivery"
        ? { delivery: input.delivery }
        : {};
  const { data, error } = await supabase.rpc("manage_store_order", {
    target_order_id: input.orderId,
    order_action: input.action,
    action_data: payload,
    action_reason: input.reason
  });
  if (error) {
    console.error("No se pudo actualizar el pedido web.", error.message);
    return null;
  }
  return data as OnlineOrder;
}

export function subscribeToCloudOrders(onChange: (orders: OnlineOrder[]) => void) {
  if (!isCloudCatalogEnabled() || !supabase) return () => {};
  const client = supabase;
  let active = true;
  const refresh = async () => {
    const commerce = await loadCloudCommerce();
    if (active) onChange(commerce.orders);
  };
  const channel = client
    .channel("store-orders-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "store_orders" }, () => void refresh())
    .subscribe();
  return () => {
    active = false;
    void client.removeChannel(channel);
  };
}
