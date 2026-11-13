import type { OperationalSnapshot } from "./types";

// Device timestamps never authorize replacing server data.
export const outboxKey = (userId: string) => `regaleria-operations-v2:${userId}`;
export interface OperationalOutbox {
  version: 2;
  userId: string;
  baseUpdatedAt: string;
  base: OperationalSnapshot;
  pending: OperationalSnapshot;
}

function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== "syncStatus" && key !== "cloudUpdatedAt" && key !== "updatedAt")
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, comparable(item)]));
  return value;
}
export const sameOperationalValue = (a: unknown, b: unknown) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));
export class OperationalConflict extends Error {}

function mergeValue(base: any, local: any, remote: any, path: string): any {
  const localChanged = !sameOperationalValue(base, local);
  const remoteChanged = !sameOperationalValue(base, remote);
  if (!localChanged) return remote;
  if (!remoteChanged) return local;
  if (path.endsWith(".stock")) throw new OperationalConflict("El stock cambió en otro equipo. Tus cambios siguen conservados para revisión.");
  // Two separate operations can produce the same stock quantity. Never treat
  // matching quantities as proof that both stock movements were committed.
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    if ([...base, ...local, ...remote].every((item) => item && typeof item === "object" && typeof item.id === "string")) {
      const before = new Map(base.map((item) => [item.id, item]));
      const here = new Map(local.map((item) => [item.id, item]));
      const there = new Map(remote.map((item) => [item.id, item]));
      for (const id of before.keys()) if (!here.has(id) || !there.has(id)) throw new OperationalConflict(`Falta un registro en ${path}. Se conservó la copia pendiente.`);
      return [...new Set([...here.keys(), ...there.keys()])].map((id) => {
        if (!before.has(id)) {
          if (here.has(id) && there.has(id) && !sameOperationalValue(here.get(id), there.get(id))) throw new OperationalConflict(`Hay dos versiones del registro en ${path}.`);
          return there.get(id) ?? here.get(id);
        }
        return mergeValue(before.get(id), here.get(id), there.get(id), `${path}.${id}`);
      });
    }
    if (path === "categories") return [...new Set([...remote, ...local])];
  }
  if (base && local && remote && !Array.isArray(base) && typeof base === "object" && typeof local === "object" && typeof remote === "object") {
    return Object.fromEntries([...new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])].map((key) => [key,
      key === "cloudUpdatedAt" || key === "updatedAt" ? remote[key] : key === "syncStatus" ? "pendiente" : mergeValue(base[key], local[key], remote[key], path ? `${path}.${key}` : key)
    ]));
  }
  if (sameOperationalValue(local, remote)) return remote;
  throw new OperationalConflict(`El registro ${path} cambió en otro equipo. Tus cambios siguen conservados para revisión.`);
}

export function mergeOperationalSnapshots(base: OperationalSnapshot, pending: OperationalSnapshot, remote: OperationalSnapshot): OperationalSnapshot {
  const merged = mergeValue(base, pending, remote, "") as OperationalSnapshot;
  // Business comparisons deliberately ignore revisions. Acknowledged revisions
  // must still advance when an edit arrived while the request was in flight.
  return { ...merged, products: merged.products.map(product => ({ ...product,
    cloudUpdatedAt: remote.products.find(item => item.id === product.id)?.cloudUpdatedAt ?? product.cloudUpdatedAt
  })) };
}

export function readOutbox(userId: string): OperationalOutbox | null {
  const raw = window.localStorage.getItem(outboxKey(userId));
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (value.version !== 2 || value.userId !== userId || !value.baseUpdatedAt || !value.base || !value.pending) throw new Error("La copia local requiere revisión; se conservó sin reemplazar la nube.");
  return value;
}
