import { isCloudCatalogEnabled } from "./catalogCloud";
import { supabase } from "./supabaseClient";
import type { EmailMessage, OnlineOrder, OnlineOrderManagementInput } from "./types";

export async function saveCloudOrder(order: OnlineOrder, emails: EmailMessage[]) {
  if (!isCloudCatalogEnabled()) return order;
  if (!supabase) return null;
  const { data: savedOrder, error: v3Error } = await supabase.rpc("create_store_order_v3", {
    order_data: order
  });
  if (!v3Error && savedOrder) return { ...order, ...savedOrder, syncStatus: "sincronizado" } as OnlineOrder;

  const missingV3 = v3Error?.code === "PGRST202";
  if (!missingV3) {
    console.error("No se pudo registrar el pedido web.", v3Error?.message);
    return null;
  }

  const { error } = await supabase.rpc("create_store_order", {
    order_data: order,
    email_data: emails
  });
  if (error) {
    console.error("No se pudo registrar el pedido web.", error.message);
    return null;
  }
  return { ...order, syncStatus: "sincronizado" as const };
}

export async function loadCloudCommerce() {
  if (!isCloudCatalogEnabled() || !supabase) return { orders: [], emails: [] };
  const client = supabase;
  const readAll = async (table: "store_orders" | "store_email_queue") => {
    const rows: { data: unknown }[] = [];
    for (let start = 0; ; start += 500) {
      const { data, error } = await client.from(table).select("data").order("created_at").order("id").range(start, start + 499);
      if (error) throw new Error("No se pudieron leer los pedidos o correos. Reintentá la carga segura.");
      rows.push(...(data ?? []));
      if (!data || data.length < 500) return rows.reverse();
    }
  };
  const [orderRows, emailRows] = await Promise.all([readAll("store_orders"), readAll("store_email_queue")]);
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
    try {
      const commerce = await loadCloudCommerce();
      if (active) onChange(commerce.orders);
    } catch { console.warn("Se conservó la lista de pedidos: no se pudo confirmar la actualización."); }
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
