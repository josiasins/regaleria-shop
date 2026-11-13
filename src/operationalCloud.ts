import { supabase } from "./supabaseClient";
import type { OperationalSnapshot } from "./types";

export interface CloudOperationalState {
  snapshot: OperationalSnapshot;
  updatedAt: string;
  userId: string;
}
export type SaveOperationalResult =
  | { ok: true; updatedAt: string; snapshot: OperationalSnapshot }
  | { ok: false; reason: "unauthorized" | "conflict" | "error"; message: string };

export function isCloudOperationsEnabled() {
  if (import.meta.env.MODE === "test" || !supabase) return false;
  const host = window.location.hostname.toLowerCase();
  return host === String(import.meta.env.VITE_INTERNAL_DOMAIN || "sistema.regaleriashop.com").toLowerCase()
    || host.endsWith(".onrender.com") || host === "localhost" || host === "127.0.0.1";
}

export async function loadCloudOperations(): Promise<CloudOperationalState> {
  if (!supabase || !isCloudOperationsEnabled()) throw new Error("La persistencia operativa no está disponible.");
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session.session) throw new Error("Volvé a ingresar para cargar los datos del negocio.");
  const { data, error } = await supabase.rpc("load_operational_state_v2");
  if (error) throw new Error("No se pudieron leer los datos. Se bloqueó el guardado para protegerlos.");
  if (!data?.data || !data.updated_at) throw new Error("No se encontró el estado operativo. Se requiere una recuperación; no se creará una base vacía.");
  return { snapshot: data.data, updatedAt: data.updated_at, userId: session.session.user.id };
}

export async function saveCloudOperations(snapshot: OperationalSnapshot, expectedUpdatedAt?: string | null, changedProductIds: string[] = [], auditReason = ""): Promise<SaveOperationalResult> {
  if (!supabase || !isCloudOperationsEnabled() || !expectedUpdatedAt) return { ok: false, reason: "error", message: "Falta una lectura confirmada de la base. No se guardó sobre los datos existentes." };
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return { ok: false, reason: "unauthorized", message: "La sesión venció. Tus cambios siguen conservados en este equipo." };
  const { data, error } = await supabase.rpc("save_operational_state_v2", {
    state_data: snapshot, expected_updated_at: expectedUpdatedAt, changed_product_ids: changedProductIds, audit_reason: auditReason
  });
  if (error) return { ok: false, reason: error.code === "40001" ? "conflict" : "error", message: error.code === "40001" ? "Los datos cambiaron en otro equipo." : error.code === "23505" ? "El SKU o código de barras ya existe. Corregí el código; tus cambios siguen conservados." : "No se pudo confirmar el guardado. Tus cambios siguen conservados en este equipo." };
  if (!data?.updated_at || !data.data) return { ok: false, reason: "error", message: "La base no confirmó el guardado. Se conservó la copia pendiente." };
  return { ok: true, updatedAt: data.updated_at, snapshot: data.data };
}

export const auditCloudOperations = (snapshot: OperationalSnapshot, reason: string, expected?: string | null, productIds: string[] = []) => saveCloudOperations(snapshot, expected, productIds, reason);
