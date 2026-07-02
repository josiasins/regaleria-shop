import { supabase } from "./supabaseClient";
import type { OperationalSnapshot } from "./types";

interface OperationalStateRow {
  id: string;
  data: OperationalSnapshot;
  updated_at: string;
}

export interface CloudOperationalState {
  snapshot: OperationalSnapshot;
  updatedAt: string;
}

export type SaveOperationalResult =
  | { ok: true; updatedAt: string }
  | { ok: false; reason: "unauthorized" | "conflict" | "error"; message: string };

export function isCloudOperationsEnabled() {
  if (import.meta.env.MODE === "test") return false;
  if (!supabase) return false;
  const hostname = window.location.hostname.toLowerCase();
  const internalDomain = String(import.meta.env.VITE_INTERNAL_DOMAIN || "sistema.regaleriashop.com").toLowerCase();
  return hostname === internalDomain || hostname.endsWith(".onrender.com") || hostname === "localhost" || hostname === "127.0.0.1";
}

export async function loadCloudOperations() {
  if (!isCloudOperationsEnabled() || !supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await supabase
    .from("operational_state")
    .select("id,data,updated_at")
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    console.error("No se pudo cargar el estado operativo.", error.message);
    return null;
  }

  const row = data as OperationalStateRow | null;
  return row ? { snapshot: row.data, updatedAt: row.updated_at } satisfies CloudOperationalState : null;
}

export async function saveCloudOperations(snapshot: OperationalSnapshot, expectedUpdatedAt?: string | null): Promise<SaveOperationalResult> {
  if (!isCloudOperationsEnabled() || !supabase) return { ok: true, updatedAt: new Date().toISOString() };
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { ok: false, reason: "unauthorized", message: "No hay sesion autorizada." };

  const { data, error } = await supabase.rpc("save_operational_state", {
    state_data: snapshot,
    expected_updated_at: expectedUpdatedAt ?? null
  });

  if (error) {
    console.error("No se pudo sincronizar el estado operativo.", error.message);
    return {
      ok: false,
      reason: error.message.toLowerCase().includes("changed remotely") ? "conflict" : "error",
      message: error.message
    };
  }

  return { ok: true, updatedAt: String(data) };
}

export async function auditCloudOperations(snapshot: OperationalSnapshot, reason: string, expectedUpdatedAt?: string | null): Promise<SaveOperationalResult> {
  if (!isCloudOperationsEnabled() || !supabase) return { ok: true, updatedAt: new Date().toISOString() };
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { ok: false, reason: "unauthorized", message: "No hay sesion autorizada." };

  const { data, error } = await supabase.rpc("audit_operational_state", {
    state_data: { ...snapshot, auditReason: reason },
    expected_updated_at: expectedUpdatedAt ?? null
  });

  if (error) {
    console.error("No se pudo auditar el estado operativo.", error.message);
    return {
      ok: false,
      reason: error.message.toLowerCase().includes("changed remotely") ? "conflict" : "error",
      message: error.message
    };
  }

  return { ok: true, updatedAt: String(data) };
}
