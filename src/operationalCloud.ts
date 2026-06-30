import { supabase } from "./supabaseClient";
import type { OperationalSnapshot } from "./types";

interface OperationalStateRow {
  id: string;
  data: OperationalSnapshot;
  updated_at: string;
}

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
  return row?.data ?? null;
}

export async function saveCloudOperations(snapshot: OperationalSnapshot) {
  if (!isCloudOperationsEnabled() || !supabase) return true;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return false;

  const { error } = await supabase.rpc("save_operational_state", {
    state_data: snapshot
  });

  if (error) {
    console.error("No se pudo sincronizar el estado operativo.", error.message);
    return false;
  }

  return true;
}
