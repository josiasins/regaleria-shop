import type { Role } from "./types";
import { supabase } from "./supabaseClient";

export async function loadCurrentAppRole(): Promise<Role | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("current_app_role");
  if (error) {
    console.error("No se pudo cargar el rol autorizado.", error.message);
    return null;
  }
  return data as Role | null;
}
