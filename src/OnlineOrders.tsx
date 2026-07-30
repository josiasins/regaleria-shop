import {
  Check,
  ClockCounterClockwise,
  CreditCard,
  MagnifyingGlass,
  Package,
  Receipt,
  ShoppingBag,
  Truck,
  WarningCircle
} from "@phosphor-icons/react";
import { clsx } from "clsx";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "./receipt";
import { useStore } from "./store";
import type { OnlineOrder, OnlineOrderStatus, PaymentMethod } from "./types";

const statusLabels: Record<OnlineOrderStatus, string> = {
  nuevo: "Nuevo",
  confirmado: "Confirmado",
  preparando: "Preparando",
  listo: "Listo para entregar",
  entregado: "Entregado",
  cancelado: "Cancelado"
};

const paymentLabels = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagado: "Pagado",
  reembolso_pendiente: "Reembolso pendiente",
  reembolsado: "Reembolsado"
} as const;

const nextStatuses: Exclude<OnlineOrderStatus, "cancelado">[] = ["nuevo", "confirmado", "preparando", "listo", "entregado"];

function paidAmount(order: OnlineOrder) {
  return order.paidAmount ?? order.payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
}

function paymentStatus(order: OnlineOrder) {
  if (order.paymentStatus) return order.paymentStatus;
  const paid = paidAmount(order);
  if (paid >= order.total) return "pagado";
  if (paid > 0) return "parcial";
  return "pendiente";
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function OnlineOrders() {
  const orders = useStore((state) => state.onlineOrders);
  const activeRole = useStore((state) => state.activeRole);
  const manageOnlineOrder = useStore((state) => state.manageOnlineOrder);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OnlineOrderStatus | "todos">("todos");
  const [selectedId, setSelectedId] = useState<string | null>(orders[0]?.id ?? null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia");
  const [paymentNote, setPaymentNote] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = activeRole === "dueno" || activeRole === "administrador" || activeRole === "encargado";

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "todos" && order.status !== statusFilter) return false;
      if (!clean) return true;
      return `${order.number} ${order.customerName} ${order.customerEmail} ${order.customerContact} ${order.lines.map((line) => `${line.name} ${line.sku}`).join(" ")}`
        .toLowerCase()
        .includes(clean);
    });
  }, [orders, query, statusFilter]);

  const selected = filtered.find((order) => order.id === selectedId) ?? filtered[0] ?? null;
  const selectedStatusIndex = selected ? nextStatuses.indexOf(selected.status as Exclude<OnlineOrderStatus, "cancelado">) : -1;
  const suggestedStatus = selectedStatusIndex >= 0 ? nextStatuses[selectedStatusIndex + 1] : undefined;
  const pendingCount = orders.filter((order) => !["entregado", "cancelado"].includes(order.status)).length;
  const pendingCollection = orders
    .filter((order) => order.status !== "cancelado")
    .reduce((sum, order) => sum + Math.max(order.total - paidAmount(order), 0), 0);

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setDeliveryAddress(selected.deliveryAddress);
    setTrackingCode(selected.trackingCode ?? "");
    setInternalNote(selected.internalNote ?? "");
    setPaymentAmount(Math.max(selected.total - paidAmount(selected), 0));
    setPaymentNote("");
    setReason("");
    setMessage("");
  }, [selected?.id, selected?.updatedAt]);

  const run = async (operation: () => Promise<OnlineOrder | null>, success: string) => {
    if (!reason.trim()) {
      setMessage("Escribí un motivo breve para dejar la operación auditada.");
      return;
    }
    setBusy(true);
    setMessage("Guardando...");
    const updated = await operation();
    setBusy(false);
    if (!updated) {
      setMessage("No se pudo guardar. Revisá el saldo, el estado y tu conexión.");
      return;
    }
    setReason("");
    setMessage(success);
  };

  const updateStatus = (status: Exclude<OnlineOrderStatus, "cancelado">) => {
    if (!selected) return;
    void run(
      () => manageOnlineOrder({ orderId: selected.id, action: "set_status", status, reason }),
      `Pedido marcado como ${statusLabels[status].toLowerCase()}.`
    );
  };

  const registerPayment = () => {
    if (!selected || paymentAmount <= 0) return;
    void run(
      () => manageOnlineOrder({
        orderId: selected.id,
        action: "add_payment",
        payment: { amount: paymentAmount, paymentMethod, note: paymentNote.trim() },
        reason
      }),
      "Pago registrado y saldo actualizado."
    );
  };

  const saveDelivery = () => {
    if (!selected) return;
    void run(
      () => manageOnlineOrder({
        orderId: selected.id,
        action: "update_delivery",
        delivery: {
          deliveryMethod: selected.deliveryMethod,
          deliveryAddress,
          trackingCode,
          internalNote
        },
        reason
      }),
      "Datos de entrega actualizados."
    );
  };

  const cancelOrder = () => {
    if (!selected || !window.confirm(`¿Cancelar ${selected.number} y devolver su stock?`)) return;
    void run(
      () => manageOnlineOrder({ orderId: selected.id, action: "cancel", reason }),
      "Pedido cancelado. El stock reservado fue devuelto una sola vez."
    );
  };

  return (
    <section className="workspace online-orders-workspace">
      <header className="orders-summary">
        <div><span>Pedidos activos</span><strong>{pendingCount}</strong></div>
        <div><span>Saldo pendiente</span><strong>{formatMoney(pendingCollection)}</strong></div>
        <div><span>Total histórico</span><strong>{orders.length}</strong></div>
      </header>

      <div className="orders-toolbar">
        <label className="orders-search"><MagnifyingGlass size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido, cliente, producto o código" /></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="todos">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span>{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <div className="orders-layout">
        <section className="orders-list" aria-label="Pedidos online">
          <header><span>Pedido</span><span>Estado</span><span>Total</span></header>
          {filtered.map((order) => {
            const status = paymentStatus(order);
            return (
              <button className={clsx(selected?.id === order.id && "selected")} key={order.id} onClick={() => setSelectedId(order.id)}>
                <span><strong>{order.number}</strong><small>{order.customerName} · {dateTime(order.createdAt)}</small></span>
                <span><b className={`order-status ${order.status}`}>{statusLabels[order.status]}</b><small>{paymentLabels[status]}</small></span>
                <strong>{formatMoney(order.total)}</strong>
              </button>
            );
          })}
          {!filtered.length && <div className="orders-empty"><ShoppingBag size={34} /><strong>No hay pedidos con este filtro</strong><span>Los pedidos confirmados desde la web aparecerán acá.</span></div>}
        </section>

        <aside className="order-detail">
          {selected ? (
            <>
              <header className="order-detail-heading">
                <div><span>Pedido online</span><h2>{selected.number}</h2><p>{dateTime(selected.createdAt)}</p></div>
                <div><b className={`order-status ${selected.status}`}>{statusLabels[selected.status]}</b><b className={`payment-status ${paymentStatus(selected)}`}>{paymentLabels[paymentStatus(selected)]}</b></div>
              </header>

              <section className="order-customer">
                <div><span>Cliente</span><strong>{selected.customerName}</strong><a href={`mailto:${selected.customerEmail}`}>{selected.customerEmail}</a><a href={`tel:${selected.customerContact}`}>{selected.customerContact}</a></div>
                <div><span>Entrega</span><strong>{selected.deliveryMethod === "envio" ? "Envío" : "Retiro en el local"}</strong><small>{selected.deliveryAddress || "Sin dirección"}</small></div>
              </section>

              <section className="order-lines">
                <header><span>Artículo</span><span>Cantidad</span><span>Importe</span></header>
                {selected.lines.map((line) => (
                  <div key={line.variantId}><span><strong>{line.name}</strong><small>{line.sku}</small></span><b>{line.quantity}</b><strong>{formatMoney(line.quantity * line.unitPrice)}</strong></div>
                ))}
                <footer><span>Total</span><strong>{formatMoney(selected.total)}</strong></footer>
              </section>

              {selected.status !== "cancelado" && canManage && (
                <>
                  <label className="order-audit-reason">Motivo de la próxima operación<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej: pago confirmado por transferencia" /></label>
                  <section className="order-workflow">
                    <header><Package size={20} /><div><strong>Preparación</strong><span>Mové el pedido por su circuito real.</span></div></header>
                    {suggestedStatus && <button className="order-next-status" disabled={busy} onClick={() => updateStatus(suggestedStatus)}><Check size={18} /> {statusLabels[suggestedStatus]}</button>}
                    {!suggestedStatus && <p className="order-complete-state"><Check size={18} /> El pedido completó su circuito.</p>}
                    <details className="order-manual-status">
                      <summary>Cambiar estado manualmente</summary>
                      <div className="order-status-actions">
                        {nextStatuses.map((status) => <button key={status} className={clsx(selected.status === status && "active")} disabled={busy || selected.status === status} onClick={() => updateStatus(status)}>{statusLabels[status]}</button>)}
                      </div>
                    </details>
                  </section>

                  <section className="order-payment">
                    <header><CreditCard size={20} /><div><strong>Cobro</strong><span>Pagado {formatMoney(paidAmount(selected))} de {formatMoney(selected.total)}</span></div></header>
                    <div className="order-payment-grid">
                      <label>Importe<input type="number" min="0" max={Math.max(selected.total - paidAmount(selected), 0)} value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.target.value) || 0)} /></label>
                      <label>Medio<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option><option value="otro">Otro</option></select></label>
                      <label>Nota<input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Referencia o detalle" /></label>
                      <button disabled={busy || paymentAmount <= 0 || paidAmount(selected) >= selected.total} onClick={registerPayment}><Check size={18} /> Registrar pago</button>
                    </div>
                  </section>

                  <section className="order-delivery">
                    <header><Truck size={20} /><div><strong>Entrega y nota interna</strong><span>Datos operativos que no ve el cliente.</span></div></header>
                    <div>
                      <label>Dirección<input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} /></label>
                      <label>Seguimiento<input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="Código o empresa de envío" /></label>
                    </div>
                    <label>Nota interna<textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} /></label>
                    <button className="secondary-action" disabled={busy} onClick={saveDelivery}>Guardar entrega</button>
                  </section>

                  <button className="order-cancel" disabled={busy} onClick={cancelOrder}><WarningCircle size={18} /> Cancelar y devolver stock</button>
                </>
              )}

              <section className="order-history">
                <header><ClockCounterClockwise size={20} /><strong>Historial</strong></header>
                {(selected.events ?? []).slice().reverse().map((event) => (
                  <div key={event.id}><span>{dateTime(event.createdAt)}</span><strong>{event.reason}</strong><small>{event.createdBy || event.action}</small></div>
                ))}
                {!selected.events?.length && <p>El pedido fue recibido. Las próximas acciones quedarán registradas acá.</p>}
              </section>
              {message && <p className="order-message" aria-live="polite">{message}</p>}
            </>
          ) : (
            <div className="orders-empty"><Receipt size={36} /><strong>Seleccioná un pedido</strong><span>Vas a ver su cobro, preparación y entrega.</span></div>
          )}
        </aside>
      </div>
    </section>
  );
}
