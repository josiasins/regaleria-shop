import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OperationalSnapshot } from "./types";
import { mergeOperationalSnapshots, outboxKey } from "./operationalSync";

const cloud = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock("./operationalCloud", () => ({ isCloudOperationsEnabled: () => true, loadCloudOperations: cloud.load, saveCloudOperations: cloud.save }));
vi.mock("./catalogCloud", () => ({ loadCloudCatalog: async () => [], deleteCloudProduct: async () => true }));
vi.mock("./commerceCloud", () => ({ loadCloudCommerce: async () => ({ orders: [], emails: [] }), manageCloudOrder: vi.fn(), saveCloudOrder: vi.fn() }));

function fixture(): OperationalSnapshot {
  return { products: [{ id: "product-1", name: "Fixture", category: "Prueba", variants: [{ id: "variant-1", stock: 10 }], syncStatus: "sincronizado", cloudUpdatedAt: "2026-01-01T00:00:00Z" }],
    sales: [], quotes: [], transfers: [], expenses: [], movements: [], onlineOrders: [], purchaseReceipts: [], customers: [], suppliers: [], cashClosures: [], cashShifts: [], supplierPayments: [], capitalEntries: [{ id: "capital-existing", amount: 2400, type: "capital_prestado", source: "Fixture", syncStatus: "sincronizado" }], emailMessages: [], salesAuditEntries: [], operationAuditEntries: [], businessProfile: {}, categories: ["Prueba"], rolePermissions: { dueno: ["capital"], administrador: [], encargado: [], cajero: [] }, updatedAt: "2026-01-01T00:00:00Z" } as unknown as OperationalSnapshot;
}
let store: typeof import("./store");
let remote: OperationalSnapshot;
let revision: number;
const add = (amount: number) => store.useStore.getState().addCapitalEntry({ amount, type: "capital_propio", source: "Prueba", note: "", dueDate: "" }, "dueno");
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); window.localStorage.clear(); remote = fixture(); revision = 1;
  cloud.load.mockReset().mockImplementation(async () => ({ snapshot: structuredClone(remote), updatedAt: `revision-${revision}`, userId: "owner-fixture" }));
  cloud.save.mockReset().mockImplementation(async (snapshot) => { remote = structuredClone(snapshot); return { ok: true, snapshot: structuredClone(remote), updatedAt: `revision-${++revision}` }; });
  store = await import("./store");
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("durable operational persistence", () => {
  it("never saves after a failed read, and leaves editing locked", async () => {
    cloud.load.mockRejectedValueOnce(new Error("offline"));
    await store.useStore.getState().initializeCatalog();
    await vi.advanceTimersByTimeAsync(1000);
    expect(cloud.save).not.toHaveBeenCalled();
    expect(store.useStore.getState().operationsLoaded).toBe(false);
    expect(store.useStore.getState().persistenceStatus).toBe("error");
  });
  it("hydration is read-only and keeps configured role restrictions", async () => {
    await store.useStore.getState().initializeCatalog();
    await vi.advanceTimersByTimeAsync(1000);
    expect(cloud.save).not.toHaveBeenCalled();
    expect(store.useStore.getState().capitalEntries[0].amount).toBe(2400);
    expect(store.useStore.getState().rolePermissions.cajero).toEqual([]);
  });
  it("ignores future-dated legacy backups without overwriting the server", async () => {
    window.localStorage.setItem("regaleria-operational-safety-backup", JSON.stringify({ ...fixture(), capitalEntries: [], updatedAt: "2099-01-01T00:00:00Z" }));
    await store.useStore.getState().initializeCatalog();
    expect(store.useStore.getState().capitalEntries).toHaveLength(1);
    expect(store.useStore.getState().recoveryAvailable).toBe(true);
    expect(cloud.save).not.toHaveBeenCalled();
  });
  it("persists the outbox synchronously before debounce and retains it after failure", async () => {
    await store.useStore.getState().initializeCatalog(); add(100);
    expect(JSON.parse(window.localStorage.getItem(outboxKey("owner-fixture"))!).pending.capitalEntries).toHaveLength(2);
    expect(cloud.save).not.toHaveBeenCalled();
    cloud.save.mockResolvedValueOnce({ ok: false, reason: "error", message: "offline" });
    await store.flushOperationalState();
    expect(window.localStorage.getItem(outboxKey("owner-fixture"))).not.toBeNull();
    expect(store.useStore.getState().persistenceStatus).toBe("error");
    await store.flushOperationalState();
    expect(window.localStorage.getItem(outboxKey("owner-fixture")) ).toBeNull();
    expect(remote.capitalEntries).toHaveLength(2);
  });
  it("recovers pending records after a reload without replacing remote history", async () => {
    const base = fixture(); const pending = fixture(); pending.capitalEntries.push({ ...base.capitalEntries[0], id: "local-new", amount: 77 });
    remote.capitalEntries.push({ ...base.capitalEntries[0], id: "remote-new", amount: 88 });
    window.localStorage.setItem(outboxKey("owner-fixture"), JSON.stringify({ version: 2, userId: "owner-fixture", baseUpdatedAt: "revision-1", base, pending }));
    await store.useStore.getState().initializeCatalog(); await store.flushOperationalState();
    expect(remote.capitalEntries.map(x => x.id).sort()).toEqual(["capital-existing", "local-new", "remote-new"]);
  });
  it("does not apply another account's pending records", async () => {
    window.localStorage.setItem(outboxKey("different-user"), JSON.stringify({ version: 2, userId: "different-user", baseUpdatedAt: "revision-1", base: fixture(), pending: { ...fixture(), capitalEntries: [] } }));
    await store.useStore.getState().initializeCatalog();
    expect(store.useStore.getState().capitalEntries).toHaveLength(1);
    expect(cloud.save).not.toHaveBeenCalled();
  });
  it("retains edits made while the previous request is in flight", async () => {
    await store.useStore.getState().initializeCatalog(); add(100);
    let finish!: (value: any) => void;
    cloud.save.mockImplementationOnce((snapshot) => new Promise(resolve => { finish = () => { remote = structuredClone(snapshot); resolve({ ok: true, snapshot: remote, updatedAt: "revision-2" }); }; }));
    const saving = store.flushOperationalState(); await Promise.resolve(); add(200); finish(null); await saving;
    expect(remote.capitalEntries.map(x => x.amount).sort((a,b) => a-b)).toEqual([100,200,2400]);
    expect(store.useStore.getState().capitalEntries).toHaveLength(3);
  });
  it("merges independent changes against their common base after a version conflict", async () => {
    await store.useStore.getState().initializeCatalog(); add(100);
    remote.expenses.push({ id: "remote-expense", amount: 50 } as any);
    cloud.save.mockResolvedValueOnce({ ok: false, reason: "conflict" });
    await store.flushOperationalState();
    expect(remote.capitalEntries).toHaveLength(2); expect(remote.expenses[0].id).toBe("remote-expense");
  });
  it("blocks concurrent stock changes, including two identical decrements", () => {
    const base=fixture(), local=fixture(), there=fixture();
    local.products[0].variants[0].stock=9; there.products[0].variants[0].stock=9;
    expect(() => mergeOperationalSnapshots(base,local,there)).toThrow(/stock/);
  });
  it("advances the acknowledged product version while retaining a newer local stock edit", () => {
    const base=fixture(), pending=fixture(), ack=fixture();
    pending.products[0].variants[0].stock=9;
    ack.products[0].cloudUpdatedAt="2026-01-02T00:00:00Z";
    const merged=mergeOperationalSnapshots(base,pending,ack);
    expect(merged.products[0].variants[0].stock).toBe(9);
    expect(merged.products[0].cloudUpdatedAt).toBe("2026-01-02T00:00:00Z");
  });
  it("keeps a conflicting record and the durable outbox for review", async () => {
    await store.useStore.getState().initializeCatalog();
    store.useStore.setState({ capitalEntries: [{ ...store.useStore.getState().capitalEntries[0], amount: 10 }] });
    remote.capitalEntries[0].amount=20;
    cloud.save.mockResolvedValueOnce({ ok: false, reason: "conflict" });
    await store.flushOperationalState();
    expect(store.useStore.getState().persistenceStatus).toBe("conflict");
    expect(window.localStorage.getItem(outboxKey("owner-fixture"))).not.toBeNull();
    expect(remote.capitalEntries[0].amount).toBe(20);
  });
});
