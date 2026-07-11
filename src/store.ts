import { create } from "zustand";
import { deleteCloudProduct, loadCloudCatalog, saveCloudProduct, seedCloudCatalog } from "./catalogCloud";
import { loadCloudCommerce, saveCloudOrder } from "./commerceCloud";
import { businessProfile, capitalEntries, cashClosures, cashShifts, categories, customers, expenses, movements, onlineOrders, products, purchaseReceipts, quotes, rolePermissions, sales, supplierPayments, suppliers, transfers } from "./data";
import { auditCloudOperations, isCloudOperationsEnabled, loadCloudOperations, saveCloudOperations } from "./operationalCloud";
import type {
  BusinessProfile,
  BusinessProfileInput,
  CapitalEntry,
  CapitalEntryDraftInput,
  CashClosure,
  CashShift,
  CashShiftAuditUpdateInput,
  Customer,
  CustomerDraftInput,
  Expense,
  ExpenseDraftInput,
  ImportProductRow,
  NewProductInput,
  OnlineOrder,
  OnlineOrderDraftInput,
  OperationalSnapshot,
  OperationAuditEntry,
  PaymentMethod,
  Product,
  ProductUpdateInput,
  RolePermissions,
  PurchaseLine,
  PurchaseReceipt,
  PurchaseReceiptDraftInput,
  PublishUpdateInput,
  Quote,
  QuoteDraftInput,
  Role,
  Sale,
  SaleAuditUpdateInput,
  SaleDraftInput,
  SaleLine,
  SalesAuditEntry,
  StockAdjustmentInput,
  StockBatchAdjustmentInput,
  StockMovement,
  Supplier,
  SupplierDraftInput,
  SupplierPayment,
  Transfer,
  TransferDraftInput,
  VariantUpdateInput,
  VariantCreateInput,
  EmailMessage
} from "./types";

interface AppState {
  products: Product[];
  sales: Sale[];
  quotes: Quote[];
  transfers: Transfer[];
  expenses: Expense[];
  movements: StockMovement[];
  onlineOrders: OnlineOrder[];
  purchaseReceipts: PurchaseReceipt[];
  customers: Customer[];
  suppliers: Supplier[];
  cashClosures: CashClosure[];
  cashShifts: CashShift[];
  supplierPayments: SupplierPayment[];
  capitalEntries: CapitalEntry[];
  emailMessages: EmailMessage[];
  salesAuditEntries: SalesAuditEntry[];
  operationAuditEntries: OperationAuditEntry[];
  businessProfile: BusinessProfile;
  categories: string[];
  rolePermissions: RolePermissions;
  activeRole: Role;
  catalogStatus: "cargando" | "actualizado" | "error";
  initializeCatalog: () => Promise<void>;
  setRole: (role: AppState["activeRole"]) => void;
  addProduct: (product: NewProductInput) => Promise<Product | null>;
  deleteProduct: (productId: string, requestedBy: Role) => Promise<boolean>;
  updateProductPublishable: (input: PublishUpdateInput) => void;
  updateProductDetails: (input: ProductUpdateInput) => Promise<boolean>;
  updateVariant: (input: VariantUpdateInput) => void;
  addVariant: (input: VariantCreateInput) => Promise<boolean>;
  importProducts: (rows: ImportProductRow[]) => number;
  addCustomer: (input: CustomerDraftInput) => Customer | null;
  updateCustomer: (id: string, input: CustomerDraftInput) => void;
  deleteCustomer: (id: string, requestedBy: Role) => boolean;
  restoreCustomer: (id: string, requestedBy: Role) => boolean;
  addSupplier: (input: SupplierDraftInput) => Supplier | null;
  updateSupplier: (id: string, input: SupplierDraftInput) => void;
  deleteSupplier: (id: string, requestedBy: Role) => boolean;
  restoreSupplier: (id: string, requestedBy: Role) => boolean;
  adjustStock: (input: StockAdjustmentInput) => StockMovement | null;
  adjustStockBatch: (input: StockBatchAdjustmentInput) => StockMovement[] | null;
  voidStockMovementBatch: (operationId: string, reason: string, requestedBy: Role) => boolean;
  addQuickSale: (variantId: string, quantity: number, paymentMethod: PaymentMethod, shiftId: string, discount?: number) => Sale | null;
  addDetailedSale: (input: SaleDraftInput & { shiftId: string }) => Sale | null;
  addQuote: (input: QuoteDraftInput) => Quote | null;
  addExpense: (expense: ExpenseDraftInput) => void;
  updateExpense: (id: string, expense: ExpenseDraftInput, requestedBy: Role) => boolean;
  deleteExpense: (id: string, requestedBy: Role) => boolean;
  restoreExpense: (id: string, requestedBy: Role) => boolean;
  addPurchaseReceipt: (input: PurchaseReceiptDraftInput) => PurchaseReceipt | null;
  updatePurchaseReceipt: (id: string, input: PurchaseReceiptDraftInput, requestedBy: Role) => boolean;
  deletePurchaseReceipt: (id: string, requestedBy: Role) => boolean;
  restorePurchaseReceipt: (id: string, requestedBy: Role) => boolean;
  closeCashDay: (note: string) => CashClosure;
  openCashShift: (initialCash: number, openedBy: Role, note: string) => CashShift | null;
  closeCashShift: (id: string, declaredClosingCash: number, closedBy: Role, note: string) => CashShift | null;
  updateSaleWithAudit: (saleId: string, input: SaleAuditUpdateInput, reason: string, requestedBy: Role) => Promise<boolean>;
  deleteSaleWithAudit: (saleId: string, reason: string, requestedBy: Role) => Promise<boolean>;
  restoreSaleWithAudit: (auditEntryId: string, reason: string, requestedBy: Role) => Promise<boolean>;
  updateShiftWithAudit: (shiftId: string, input: CashShiftAuditUpdateInput, reason: string, requestedBy: Role) => Promise<boolean>;
  deleteShiftWithAudit: (shiftId: string, reason: string, requestedBy: Role) => Promise<boolean>;
  restoreShiftWithAudit: (auditEntryId: string, reason: string, requestedBy: Role) => Promise<boolean>;
  addSupplierPayment: (input: { supplier: string; receiptId?: string; amount: number; paymentMethod: PaymentMethod; note: string }) => SupplierPayment | null;
  addCapitalEntry: (input: CapitalEntryDraftInput, requestedBy: Role) => CapitalEntry | null;
  deleteCapitalEntry: (id: string, requestedBy: Role) => boolean;
  updateBusinessProfile: (input: BusinessProfileInput) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  updateRolePermissions: (role: Role, permissions: RolePermissions[Role]) => void;
  addTransfer: (input: TransferDraftInput) => Transfer | null;
  addOnlineOrder: (input: OnlineOrderDraftInput) => Promise<OnlineOrder | null>;
  confirmTransfer: (id: string) => void;
  convertQuote: (id: string) => Sale | null;
  markAllSynced: () => void;
}

type OperationalStateFields = Pick<
  AppState,
  | "products"
  | "sales"
  | "quotes"
  | "transfers"
  | "expenses"
  | "movements"
  | "onlineOrders"
  | "purchaseReceipts"
  | "customers"
  | "suppliers"
  | "cashClosures"
  | "cashShifts"
  | "supplierPayments"
  | "capitalEntries"
  | "emailMessages"
  | "salesAuditEntries"
  | "operationAuditEntries"
  | "businessProfile"
  | "categories"
  | "rolePermissions"
>;

const money = (value: number) => Math.round(value * 100) / 100;
const nextNumber = (prefix: string, count: number) => `${prefix}-${String(count + 1).padStart(6, "0")}`;

function purchaseDateToIso(value: string | undefined, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function findVariant(products: Product[], variantId: string) {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

function buildSaleLine(product: Product, variant: Product["variants"][number], quantity: number): SaleLine {
  return {
    productId: product.id,
    variantId: variant.id,
    name: `${product.name} - ${variant.name}`,
    sku: variant.sku,
    quantity,
    unitPrice: variant.price,
    unitCost: variant.cost
  };
}

function saleTotals(lines: SaleLine[], discount: number) {
  const gross = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const cost = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  const total = Math.max(gross - discount, 0);
  return { total: money(total), margin: money(total - cost) };
}

function hasAvailableStock(products: Product[], lines: SaleLine[]) {
  return lines.every((line) => {
    const found = findVariant(products, line.variantId);
    return found && found.variant.stock >= line.quantity;
  });
}

function stockMovementsForSale(sale: Sale): StockMovement[] {
  return sale.lines.map((line) => ({
    id: `local_mov_${crypto.randomUUID()}`,
    productId: line.productId,
    variantId: line.variantId,
    type: "venta",
    quantity: -line.quantity,
    reason: sale.receiptNumber,
    createdAt: sale.createdAt,
    syncStatus: "pendiente"
  }));
}

function reversalStockMovementsForSale(sale: Sale, reason: string): StockMovement[] {
  const createdAt = new Date().toISOString();
  return sale.lines.map((line) => ({
    id: `local_mov_${crypto.randomUUID()}`,
    productId: line.productId,
    variantId: line.variantId,
    type: "ajuste",
    quantity: line.quantity,
    reason: `Anulacion ${sale.receiptNumber}: ${reason}`,
    createdAt,
    syncStatus: "pendiente"
  }));
}

function applySaleStock(products: Product[], sale: Sale) {
  return products.map((product) => ({
    ...product,
    syncStatus: sale.lines.some((line) => line.productId === product.id) ? "pendiente" : product.syncStatus,
    variants: product.variants.map((variant) => {
      const quantitySold = sale.lines
        .filter((line) => line.variantId === variant.id)
        .reduce((sum, line) => sum + line.quantity, 0);
      return quantitySold ? { ...variant, stock: variant.stock - quantitySold } : variant;
    })
  }));
}

function restoreSaleStock(products: Product[], sale: Sale) {
  return products.map((product) => ({
    ...product,
    syncStatus: sale.lines.some((line) => line.productId === product.id) ? "pendiente" : product.syncStatus,
    variants: product.variants.map((variant) => {
      const quantityRestored = sale.lines
        .filter((line) => line.variantId === variant.id)
        .reduce((sum, line) => sum + line.quantity, 0);
      return quantityRestored ? { ...variant, stock: variant.stock + quantityRestored } : variant;
    })
  }));
}

function canRunAudit(requestedBy: Role, reason: string) {
  return requestedBy === "dueno" && reason.trim().length >= 5;
}

function makeAuditEntry(input: Omit<SalesAuditEntry, "id" | "createdAt">): SalesAuditEntry {
  return {
    id: `local_audit_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input,
    reason: input.reason.trim()
  };
}

function makeOperationAuditEntry(input: Omit<OperationAuditEntry, "id" | "createdAt">): OperationAuditEntry {
  return {
    id: `local_opaudit_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input,
    reason: input.reason.trim()
  };
}

function canManageOperationalRecords(requestedBy: Role) {
  return requestedBy === "dueno" || requestedBy === "administrador" || requestedBy === "encargado";
}

function canDeleteSupplier(requestedBy: Role) {
  return requestedBy === "dueno" || requestedBy === "administrador";
}

function shouldUseDemoData() {
  return import.meta.env.MODE === "test";
}

function initialDataState() {
  const withDemoData = shouldUseDemoData();
  return {
    products: withDemoData ? structuredClone(products) : [],
    sales: withDemoData ? structuredClone(sales) : [],
    quotes: withDemoData ? structuredClone(quotes) : [],
    transfers: withDemoData ? structuredClone(transfers) : [],
    expenses: withDemoData ? structuredClone(expenses) : [],
    movements: withDemoData ? structuredClone(movements) : [],
    onlineOrders: withDemoData ? structuredClone(onlineOrders) : [],
    purchaseReceipts: withDemoData ? structuredClone(purchaseReceipts) : [],
    customers: withDemoData ? structuredClone(customers) : [],
    suppliers: withDemoData ? structuredClone(suppliers) : [],
    cashClosures: withDemoData ? structuredClone(cashClosures) : [],
    cashShifts: withDemoData ? structuredClone(cashShifts) : [],
    supplierPayments: withDemoData ? structuredClone(supplierPayments) : [],
    capitalEntries: withDemoData ? structuredClone(capitalEntries) : [],
    emailMessages: [],
    salesAuditEntries: [],
    operationAuditEntries: [],
    businessProfile: structuredClone(businessProfile),
    categories: structuredClone(categories),
    rolePermissions: structuredClone(rolePermissions),
    activeRole: "dueno" as const
  };
}

const blockedOperationalSeedIds = {
  sales: new Set(["sale_001", "sale_002"]),
  quotes: new Set(["quote_001"]),
  transfers: new Set(["tr_001"]),
  expenses: new Set(["exp_001", "exp_002"]),
  movements: new Set(["mov_001", "mov_002"]),
  customers: new Set(["cust_claudia", "cust_empresa_norte"])
};

// Las categorias configuradas y las que ya estan asignadas en el catalogo son
// dos vistas del mismo dato de negocio. Nunca se debe ocultar una categoria que
// siga siendo usada por un producto, aunque una copia operativa llegue atrasada.
function mergeCategories(configuredCategories: readonly string[], catalogProducts: readonly Product[]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of [...configuredCategories, ...catalogProducts.map((product) => product.category)]) {
    const category = value.trim();
    const key = category.toLocaleLowerCase();
    if (!category || seen.has(key)) continue;
    seen.add(key);
    merged.push(category);
  }

  return merged;
}

function sanitizeOperationalSnapshot(snapshot: OperationalSnapshot): OperationalSnapshot {
  return {
    ...snapshot,
    sales: (snapshot.sales ?? []).filter((item) => !blockedOperationalSeedIds.sales.has(item.id)),
    quotes: (snapshot.quotes ?? []).filter((item) => !blockedOperationalSeedIds.quotes.has(item.id)),
    transfers: (snapshot.transfers ?? []).filter((item) => !blockedOperationalSeedIds.transfers.has(item.id)),
    expenses: (snapshot.expenses ?? []).filter((item) => !blockedOperationalSeedIds.expenses.has(item.id)),
    movements: (snapshot.movements ?? []).filter((item) => !blockedOperationalSeedIds.movements.has(item.id)),
    customers: (snapshot.customers ?? []).filter((item) => !blockedOperationalSeedIds.customers.has(item.id))
  };
}

function operationalSnapshotFromState(state: OperationalStateFields): OperationalSnapshot {
  return {
    products: state.products,
    sales: state.sales,
    quotes: state.quotes,
    transfers: state.transfers,
    expenses: state.expenses,
    movements: state.movements,
    onlineOrders: state.onlineOrders,
    purchaseReceipts: state.purchaseReceipts,
    customers: state.customers,
    suppliers: state.suppliers,
    cashClosures: state.cashClosures,
    cashShifts: state.cashShifts,
    supplierPayments: state.supplierPayments,
    capitalEntries: state.capitalEntries,
    emailMessages: state.emailMessages,
    salesAuditEntries: state.salesAuditEntries,
    operationAuditEntries: state.operationAuditEntries,
    businessProfile: state.businessProfile,
    categories: mergeCategories(state.categories, state.products),
    rolePermissions: state.rolePermissions,
    updatedAt: new Date().toISOString()
  };
}

function stateFromOperationalSnapshot(snapshot: OperationalSnapshot): OperationalStateFields {
  const cleanSnapshot = sanitizeOperationalSnapshot(snapshot);
  return {
    products: cleanSnapshot.products ?? [],
    sales: cleanSnapshot.sales ?? [],
    quotes: cleanSnapshot.quotes ?? [],
    transfers: cleanSnapshot.transfers ?? [],
    expenses: cleanSnapshot.expenses ?? [],
    movements: cleanSnapshot.movements ?? [],
    onlineOrders: cleanSnapshot.onlineOrders ?? [],
    purchaseReceipts: cleanSnapshot.purchaseReceipts ?? [],
    customers: cleanSnapshot.customers ?? [],
    suppliers: cleanSnapshot.suppliers ?? [],
    cashClosures: cleanSnapshot.cashClosures ?? [],
    cashShifts: cleanSnapshot.cashShifts ?? [],
    supplierPayments: cleanSnapshot.supplierPayments ?? [],
    capitalEntries: cleanSnapshot.capitalEntries ?? [],
    emailMessages: cleanSnapshot.emailMessages ?? [],
    salesAuditEntries: cleanSnapshot.salesAuditEntries ?? [],
    operationAuditEntries: cleanSnapshot.operationAuditEntries ?? [],
    businessProfile: cleanSnapshot.businessProfile ?? businessProfile,
    categories: mergeCategories(cleanSnapshot.categories ?? categories, cleanSnapshot.products ?? []),
    rolePermissions: {
      dueno: Array.from(new Set([...(cleanSnapshot.rolePermissions?.dueno ?? []), ...rolePermissions.dueno])),
      administrador: Array.from(new Set([...(cleanSnapshot.rolePermissions?.administrador ?? []), ...rolePermissions.administrador])),
      encargado: Array.from(new Set([...(cleanSnapshot.rolePermissions?.encargado ?? []), ...rolePermissions.encargado])),
      cajero: Array.from(new Set([...(cleanSnapshot.rolePermissions?.cajero ?? []), ...rolePermissions.cajero]))
    }
  };
}

function syncedOperationalState(state: OperationalStateFields): OperationalStateFields {
  return {
    ...state,
    products: state.products.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    sales: state.sales.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    quotes: state.quotes.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    transfers: state.transfers.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    expenses: state.expenses.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    movements: state.movements.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    onlineOrders: state.onlineOrders.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    purchaseReceipts: state.purchaseReceipts.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    customers: state.customers.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    suppliers: state.suppliers.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    cashClosures: state.cashClosures.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    cashShifts: state.cashShifts.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    supplierPayments: state.supplierPayments.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    capitalEntries: state.capitalEntries.map((item) => ({ ...item, syncStatus: "sincronizado" })),
    salesAuditEntries: state.salesAuditEntries.map((entry) => ({
      ...entry,
      before: entry.before ? { ...entry.before, syncStatus: "sincronizado" } : undefined,
      after: entry.after ? { ...entry.after, syncStatus: "sincronizado" } : undefined
    })),
    operationAuditEntries: state.operationAuditEntries.map((entry) => ({
      ...entry,
      before: entry.before ? { ...entry.before, syncStatus: "sincronizado" } : undefined,
      after: entry.after ? { ...entry.after, syncStatus: "sincronizado" } : undefined
    }))
  };
}

function makeCustomer(input: CustomerDraftInput): Customer | null {
  if (!input.name.trim()) return null;
  return {
    id: `local_cust_${crypto.randomUUID()}`,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
    syncStatus: "pendiente"
  };
}

function makeSupplier(input: SupplierDraftInput): Supplier | null {
  if (!input.name.trim()) return null;
  return {
    id: `local_sup_${crypto.randomUUID()}`,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
    syncStatus: "pendiente"
  };
}

function shouldCreateContact(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "consumidor final";
}

function syncProductsToCloud(products: Product[], productIds?: string[]) {
  const selected = productIds ? products.filter((product) => productIds.includes(product.id)) : products;
  return Promise.all(selected.map((product) => saveCloudProduct(product)));
}

function purchaseLineDeltas(before: PurchaseLine[], after: PurchaseLine[]) {
  const deltas = new Map<string, PurchaseLine & { quantity: number }>();
  const addDelta = (line: PurchaseLine, quantity: number) => {
    const current = deltas.get(line.variantId);
    deltas.set(line.variantId, {
      ...line,
      quantity: (current?.quantity ?? 0) + quantity
    });
  };
  before.forEach((line) => addDelta(line, -line.quantity));
  after.forEach((line) => addDelta(line, line.quantity));
  return Array.from(deltas.values()).filter((line) => line.quantity !== 0);
}

function canApplyPurchaseDeltas(products: Product[], deltas: (PurchaseLine & { quantity: number })[]) {
  return deltas.every((delta) => {
    const found = findVariant(products, delta.variantId);
    return found && found.variant.stock + delta.quantity >= 0;
  });
}

function applyPurchaseDeltas(products: Product[], deltas: (PurchaseLine & { quantity: number })[]) {
  return products.map((product) => ({
    ...product,
    syncStatus: deltas.some((delta) => delta.productId === product.id) ? "pendiente" : product.syncStatus,
    variants: product.variants.map((variant) => {
      const delta = deltas.find((item) => item.variantId === variant.id);
      return delta ? { ...variant, stock: variant.stock + delta.quantity, cost: delta.quantity > 0 ? delta.unitCost : variant.cost } : variant;
    })
  }));
}

function stockMovementsForPurchaseDelta(deltas: (PurchaseLine & { quantity: number })[], reason: string, createdAt = new Date().toISOString()): StockMovement[] {
  return deltas.map((line) => ({
    id: `local_mov_${crypto.randomUUID()}`,
    productId: line.productId,
    variantId: line.variantId,
    type: "ajuste",
    quantity: line.quantity,
    reason,
    createdAt,
    syncStatus: "pendiente"
  }));
}

function makePurchaseReceiptFromInput(input: PurchaseReceiptDraftInput, existing?: PurchaseReceipt): PurchaseReceipt | null {
  const cleanLines = input.lines.filter((line) => line.quantity > 0 && line.unitCost >= 0);
  if (!input.supplier.trim() || !input.documentNumber.trim() || !cleanLines.length) return null;
  const total = cleanLines.reduce((sum, line) => sum + line.subtotal, 0) + Math.max(input.shippingCost, 0);
  const netTotal = cleanLines.reduce((sum, line) => sum + (line.netSubtotal ?? line.subtotal), 0) + Math.max(input.shippingCost, 0);
  const vatTotal = cleanLines.reduce((sum, line) => sum + (line.vatSubtotal ?? 0), 0);
  return {
    id: existing?.id ?? `local_purchase_${crypto.randomUUID()}`,
    number: existing?.number ?? nextNumber("COM", useStore.getState().purchaseReceipts.length),
    documentType: input.documentType,
    documentNumber: input.documentNumber.trim(),
    supplier: input.supplier.trim(),
    lines: cleanLines,
    shippingCost: money(Math.max(input.shippingCost, 0)),
    shippingNote: input.shippingNote.trim(),
    netTotal: money(netTotal),
    vatTotal: money(vatTotal),
    total: money(total),
    createdAt: purchaseDateToIso(input.purchaseDate, existing?.createdAt),
    deletedAt: existing?.deletedAt,
    deletedBy: existing?.deletedBy,
    syncStatus: "pendiente"
  };
}

function purchaseExpenseNote(receipt: PurchaseReceipt) {
  return `${receipt.documentType} ${receipt.documentNumber}${receipt.shippingCost ? ` · Envío ${money(receipt.shippingCost)}` : ""}`;
}

function isExpenseForPurchase(expense: Expense, receipt: PurchaseReceipt) {
  return expense.category === "Reposicion" && expense.vendor === receipt.supplier && expense.createdAt === receipt.createdAt;
}

const operationalStateKeys: (keyof OperationalStateFields)[] = [
  "products",
  "sales",
  "quotes",
  "transfers",
  "expenses",
  "movements",
  "onlineOrders",
  "purchaseReceipts",
  "customers",
  "suppliers",
  "cashClosures",
  "cashShifts",
  "supplierPayments",
  "capitalEntries",
  "emailMessages",
  "salesAuditEntries",
  "operationAuditEntries",
  "businessProfile",
  "categories",
  "rolePermissions"
];

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveInFlight = false;
let saveQueued = false;
let applyingSyncedState = false;
let hasAppliedCloudOperations = false;
let cloudOperationsUpdatedAt: string | null = null;
const operationalSafetyBackupKey = "regaleria-operational-safety-backup";

function hasOperationalChange(state: AppState, previous: AppState) {
  return operationalStateKeys.some((key) => state[key] !== previous[key]);
}

function hasPendingOperationalState(state: OperationalStateFields) {
  return [
    ...state.products,
    ...state.sales,
    ...state.quotes,
    ...state.transfers,
    ...state.expenses,
    ...state.movements,
    ...state.onlineOrders,
    ...state.purchaseReceipts,
    ...state.customers,
    ...state.suppliers,
    ...state.cashClosures,
    ...state.cashShifts,
    ...state.supplierPayments,
    ...state.capitalEntries
  ].some((item) => item.syncStatus !== "sincronizado");
}

function snapshotTimestamp(snapshot: OperationalSnapshot | null) {
  const timestamp = snapshot?.updatedAt ? new Date(snapshot.updatedAt).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function saveSafetyBackup(snapshot: OperationalSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(operationalSafetyBackupKey, JSON.stringify(snapshot));
  } catch {
    // Best effort: Supabase remains the source of truth when local storage is unavailable.
  }
}

function loadSafetyBackup() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(operationalSafetyBackupKey);
    return raw ? (JSON.parse(raw) as OperationalSnapshot) : null;
  } catch {
    return null;
  }
}

function clearSafetyBackup() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(operationalSafetyBackupKey);
  } catch {
    // Nothing to do.
  }
}

type SyncableRecord = { id: string; syncStatus: string };
type IdentifiedRecord = { id: string };

function mergePendingRecords<T extends SyncableRecord>(remote: T[], local: T[]) {
  const pending = local.filter((item) => item.syncStatus !== "sincronizado");
  const pendingIds = new Set(pending.map((item) => item.id));
  return [...pending, ...remote.filter((item) => !pendingIds.has(item.id))];
}

function mergeImmutableRecords<T extends IdentifiedRecord>(remote: T[], local: T[]) {
  const remoteIds = new Set(remote.map((item) => item.id));
  return [...local.filter((item) => !remoteIds.has(item.id)), ...remote];
}

function rebaseOperationalState(remote: OperationalStateFields, local: OperationalStateFields, cloudProducts: Product[] | null): OperationalStateFields {
  const onlineProducts = cloudProducts?.length ? cloudProducts : remote.products;
  const rebasedProducts = mergePendingRecords(onlineProducts, local.products);
  return {
    ...remote,
    // El catalogo se persiste por separado para que el stock visible quede alineado
    // con la ultima version online antes de reintentar el snapshot operativo.
    products: rebasedProducts,
    sales: mergePendingRecords(remote.sales, local.sales),
    quotes: mergePendingRecords(remote.quotes, local.quotes),
    transfers: mergePendingRecords(remote.transfers, local.transfers),
    expenses: mergePendingRecords(remote.expenses, local.expenses),
    movements: mergePendingRecords(remote.movements, local.movements),
    onlineOrders: mergePendingRecords(remote.onlineOrders, local.onlineOrders),
    purchaseReceipts: mergePendingRecords(remote.purchaseReceipts, local.purchaseReceipts),
    customers: mergePendingRecords(remote.customers, local.customers),
    suppliers: mergePendingRecords(remote.suppliers, local.suppliers),
    cashClosures: mergePendingRecords(remote.cashClosures, local.cashClosures),
    cashShifts: mergePendingRecords(remote.cashShifts, local.cashShifts),
    supplierPayments: mergePendingRecords(remote.supplierPayments, local.supplierPayments),
    capitalEntries: mergePendingRecords(remote.capitalEntries, local.capitalEntries),
    emailMessages: mergeImmutableRecords(remote.emailMessages, local.emailMessages),
    salesAuditEntries: mergeImmutableRecords(remote.salesAuditEntries, local.salesAuditEntries),
    operationAuditEntries: mergeImmutableRecords(remote.operationAuditEntries, local.operationAuditEntries),
    // Configuracion remota gana en una colision: evita que un navegador atrasado
    // revierta permisos o datos del negocio mientras se esta resolviendo stock.
    businessProfile: remote.businessProfile,
    categories: mergeCategories([...remote.categories, ...local.categories], rebasedProducts),
    rolePermissions: remote.rolePermissions
  };
}

async function retryOperationalConflict(localState: OperationalStateFields) {
  const [operations, cloudProducts] = await Promise.all([loadCloudOperations(), loadCloudCatalog()]);
  if (!operations) return false;

  const remote = stateFromOperationalSnapshot(sanitizeOperationalSnapshot(operations.snapshot));
  const rebased = rebaseOperationalState(remote, localState, cloudProducts);
  const nextState = syncedOperationalState(rebased);
  const snapshot = operationalSnapshotFromState(nextState);
  saveSafetyBackup(snapshot);
  const saved = await saveCloudOperations(snapshot, operations.updatedAt);
  if (!saved.ok) return false;

  cloudOperationsUpdatedAt = saved.updatedAt;
  clearSafetyBackup();
  applyingSyncedState = true;
  useStore.setState(nextState);
  applyingSyncedState = false;
  return true;
}

async function flushOperationalState() {
  if (import.meta.env.MODE === "test") return;
  if (saveInFlight) {
    saveQueued = true;
    return;
  }

  saveInFlight = true;
  do {
    saveQueued = false;
    const localState = useStore.getState();
    const pendingProductIds = localState.products
      .filter((product) => product.syncStatus !== "sincronizado")
      .map((product) => product.id);
    if (pendingProductIds.length) await syncProductsToCloud(localState.products, pendingProductIds);

    const nextState = syncedOperationalState(localState);
    const snapshot = operationalSnapshotFromState(nextState);
    saveSafetyBackup(snapshot);
    const saved = await saveCloudOperations(snapshot, cloudOperationsUpdatedAt);
    if (saved.ok && !saveQueued) {
      cloudOperationsUpdatedAt = saved.updatedAt;
      clearSafetyBackup();
      applyingSyncedState = true;
      useStore.setState(nextState);
      applyingSyncedState = false;
    } else if (!saved.ok && saved.reason === "conflict") {
      // Otra ventana guardo primero. Traemos esa version, incorporamos solo los
      // registros locales pendientes y reintentamos contra su marca de tiempo.
      await retryOperationalConflict(localState);
    }
  } while (saveQueued);
  saveInFlight = false;
}

function scheduleOperationalSave() {
  if (import.meta.env.MODE === "test") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushOperationalState();
  }, 350);
}

async function commitAuditedState(nextState: OperationalStateFields, reason: string) {
  const syncedState = syncedOperationalState(nextState);
  const snapshot = operationalSnapshotFromState(syncedState);
  saveSafetyBackup(snapshot);
  const saved = await auditCloudOperations(snapshot, reason, cloudOperationsUpdatedAt);
  if (!saved.ok) return false;
  cloudOperationsUpdatedAt = saved.updatedAt;
  clearSafetyBackup();
  applyingSyncedState = true;
  useStore.setState(syncedState);
  applyingSyncedState = false;
  return true;
}

export const useStore = create<AppState>((set, get) => ({
  ...initialDataState(),
  activeRole: "dueno",
  catalogStatus: "cargando",
  initializeCatalog: async () => {
    if (hasAppliedCloudOperations && hasPendingOperationalState(get())) {
      set({ catalogStatus: "actualizado" });
      return;
    }
    const [cloudProducts, commerce, operations] = await Promise.all([loadCloudCatalog(), loadCloudCommerce(), loadCloudOperations()]);
    const backup = loadSafetyBackup();
    const cloudSnapshot = operations?.snapshot ?? null;
    const selectedOperations = backup && snapshotTimestamp(backup) > snapshotTimestamp(cloudSnapshot) ? backup : cloudSnapshot;
    if (selectedOperations) {
      const cleanOperations = sanitizeOperationalSnapshot(selectedOperations);
      const operationalState = stateFromOperationalSnapshot(cleanOperations);
      cloudOperationsUpdatedAt = operations?.updatedAt ?? selectedOperations.updatedAt ?? null;
      hasAppliedCloudOperations = true;
      const resolvedProducts = cloudProducts?.length ? cloudProducts : operationalState.products;
      set({
        ...operationalState,
        products: resolvedProducts,
        categories: mergeCategories(operationalState.categories, resolvedProducts),
        onlineOrders: commerce.orders.length ? commerce.orders : operationalState.onlineOrders,
        emailMessages: commerce.emails.length ? commerce.emails : operationalState.emailMessages,
        catalogStatus: cloudProducts === null ? "error" : "actualizado"
      });
      if (selectedOperations === backup || cleanOperations !== selectedOperations) void saveCloudOperations(cleanOperations, cloudOperationsUpdatedAt).then((saved) => {
        if (saved.ok) {
          cloudOperationsUpdatedAt = saved.updatedAt;
          clearSafetyBackup();
        }
      });
      return;
    }

    if (cloudProducts === null) {
      set({ catalogStatus: "error" });
      return;
    }

    if (cloudProducts.length) {
      set({
        products: cloudProducts,
        categories: mergeCategories(get().categories, cloudProducts),
        onlineOrders: commerce.orders.length ? commerce.orders : get().onlineOrders,
        emailMessages: commerce.emails.length ? commerce.emails : get().emailMessages,
        catalogStatus: "actualizado"
      });
      void saveCloudOperations(operationalSnapshotFromState(get()), cloudOperationsUpdatedAt).then((saved) => {
        if (saved.ok) cloudOperationsUpdatedAt = saved.updatedAt;
      });
      return;
    }

    if (isCloudOperationsEnabled()) {
      set({ catalogStatus: "actualizado" });
      void saveCloudOperations(operationalSnapshotFromState(get()), cloudOperationsUpdatedAt).then((saved) => {
        if (saved.ok) cloudOperationsUpdatedAt = saved.updatedAt;
      });
      hasAppliedCloudOperations = true;
      return;
    }

    const seeded = await seedCloudCatalog(get().products);
    if (seeded) void saveCloudOperations(operationalSnapshotFromState(get()), cloudOperationsUpdatedAt).then((saved) => {
      if (saved.ok) cloudOperationsUpdatedAt = saved.updatedAt;
    });
    hasAppliedCloudOperations = true;
    set({ catalogStatus: seeded ? "actualizado" : "error" });
  },
  setRole: (role) => set({ activeRole: role }),
  addProduct: async (input) => {
    const now = new Date().toISOString();
    const product: Product = {
      id: `local_prod_${crypto.randomUUID()}`,
      name: input.name.trim(),
      category: input.category.trim(),
      supplier: input.supplier.trim(),
      description: input.description.trim(),
      publishable: input.publishable,
      imageUrl: input.imageUrl.trim() || "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80",
      imageUrls: input.imageUrls?.length ? input.imageUrls : [input.imageUrl.trim() || "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80"],
      slug: input.slug?.trim(),
      seoTitle: input.seoTitle?.trim(),
      seoDescription: input.seoDescription?.trim(),
      syncStatus: "pendiente",
      variants: [
        {
          id: `local_var_${crypto.randomUUID()}`,
          name: input.variant.name.trim(),
          sku: input.variant.sku.trim(),
          barcode: input.variant.barcode.trim(),
          stock: input.variant.stock,
          lowStockAt: input.variant.lowStockAt,
          cost: input.variant.cost,
          price: input.variant.price
        }
      ]
    };
    const movement: StockMovement = {
      id: `local_mov_${crypto.randomUUID()}`,
      productId: product.id,
      variantId: product.variants[0].id,
      type: "ingreso",
      quantity: product.variants[0].stock,
      reason: "Alta de producto",
      createdAt: now,
      syncStatus: "pendiente"
    };
    const saved = await saveCloudProduct(product);
    if (!saved) {
      set({ catalogStatus: "error" });
      return null;
    }
    set((state) => ({
      products: [product, ...state.products],
      movements: [movement, ...state.movements],
      categories: mergeCategories(state.categories, [product]),
      catalogStatus: "actualizado"
    }));
    return product;
  },
  deleteProduct: async (productId, requestedBy) => {
    if (requestedBy !== "dueno" && requestedBy !== "administrador") return false;
    if (!get().products.some((product) => product.id === productId)) return false;
    const deleted = await deleteCloudProduct(productId);
    if (!deleted) {
      set({ catalogStatus: "error" });
      return false;
    }
    set((state) => ({
      products: state.products.filter((product) => product.id !== productId),
      catalogStatus: "actualizado"
    }));
    return true;
  },
  updateProductPublishable: (input) => {
    set((state) => ({
      products: state.products.map((product) =>
        product.id === input.productId ? { ...product, publishable: input.publishable, syncStatus: "pendiente" } : product
      )
    }));
    const product = get().products.find((item) => item.id === input.productId);
    if (product) void saveCloudProduct(product);
  },
  updateProductDetails: async (input) => {
    if (!input.name.trim()) return false;
    const current = get().products.find((item) => item.id === input.productId);
    if (!current) return false;
    const pricingByVariant = new Map(input.pricing?.map((pricing) => [pricing.variantId, pricing]));
    const product: Product = {
      ...current,
      name: input.name.trim(),
      category: input.category.trim() || "Sin categoria",
      supplier: input.supplier?.trim() || current.supplier,
      brand: input.brand?.trim() || undefined,
      description: input.description.trim(),
      imageUrl: input.imageUrl.trim() || current.imageUrl,
      imageUrls: input.imageUrls?.length ? input.imageUrls.map((url) => url.trim()).filter(Boolean) : current.imageUrls,
      slug: input.slug?.trim(),
      seoTitle: input.seoTitle?.trim(),
      seoDescription: input.seoDescription?.trim(),
      publishable: input.publishable,
      variants: current.variants.map((variant) => {
        const pricing = pricingByVariant.get(variant.id);
        if (!pricing) return variant;
        return {
          ...variant,
          price: Math.max(pricing.price, 0),
          webPrice: pricing.webPrice === null ? undefined : Math.max(pricing.webPrice, 0)
        };
      }),
      syncStatus: "sincronizado"
    };
    const saved = await saveCloudProduct(product);
    if (!saved) {
      set({ catalogStatus: "error" });
      return false;
    }
    set((state) => ({
      products: state.products.map((item) => (item.id === product.id ? product : item)),
      categories: mergeCategories(state.categories, [product]),
      catalogStatus: "actualizado"
    }));
    return true;
  },
  updateVariant: (input) => {
    if (!input.name.trim() || !input.sku.trim()) return;
    set((state) => ({
      products: state.products.map((product) => ({
        ...product,
        syncStatus: product.variants.some((variant) => variant.id === input.variantId) ? "pendiente" : product.syncStatus,
        variants: product.variants.map((variant) =>
          variant.id === input.variantId
            ? {
                ...variant,
                name: input.name.trim(),
                sku: input.sku.trim(),
                barcode: input.barcode.trim(),
                lowStockAt: Math.max(input.lowStockAt, 0),
                cost: Math.max(input.cost, 0),
                price: Math.max(input.price, 0)
              }
            : variant
        )
      }))
    }));
    const product = get().products.find((item) => item.variants.some((variant) => variant.id === input.variantId));
    if (product) void saveCloudProduct(product);
  },
  addVariant: async (input) => {
    if (!input.name.trim() || !input.sku.trim() || input.price <= 0) return false;
    const current = get().products.find((product) => product.id === input.productId);
    if (!current || current.variants.some((variant) => variant.sku.toLowerCase() === input.sku.trim().toLowerCase())) return false;
    const product: Product = {
      ...current,
      variants: [
        ...current.variants,
        {
          id: `local_var_${crypto.randomUUID()}`,
          name: input.name.trim(),
          sku: input.sku.trim(),
          barcode: input.barcode.trim(),
          stock: Math.max(input.stock, 0),
          lowStockAt: Math.max(input.lowStockAt, 0),
          cost: Math.max(input.cost, 0),
          price: Math.max(input.price, 0)
        }
      ],
      syncStatus: "sincronizado"
    };
    const saved = await saveCloudProduct(product);
    if (!saved) return false;
    set((state) => ({ products: state.products.map((item) => (item.id === product.id ? product : item)) }));
    return true;
  },
  importProducts: (rows) => {
    const validRows = rows.filter((row) => row.name.trim() && row.sku.trim() && row.price > 0);
    if (!validRows.length) return 0;
    const now = new Date().toISOString();
    const placeholder = "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80";
    const newProducts: Product[] = validRows.map((row) => ({
      id: `local_prod_${crypto.randomUUID()}`,
      name: row.name.trim(),
      category: row.category.trim() || "Sin categoria",
      supplier: row.supplier.trim() || "Sin proveedor",
      description: "",
      publishable: false,
      imageUrl: placeholder,
      imageUrls: [placeholder],
      syncStatus: "pendiente",
      variants: [
        {
          id: `local_var_${crypto.randomUUID()}`,
          name: "Unico",
          sku: row.sku.trim(),
          barcode: "",
          stock: Math.max(row.stock, 0),
          lowStockAt: 3,
          cost: Math.max(row.cost, 0),
          price: Math.max(row.price, 0)
        }
      ]
    }));
    const newMovements: StockMovement[] = newProducts.map((product) => ({
      id: `local_mov_${crypto.randomUUID()}`,
      productId: product.id,
      variantId: product.variants[0].id,
      type: "ingreso",
      quantity: product.variants[0].stock,
      reason: "Importacion masiva",
      createdAt: now,
      syncStatus: "pendiente"
    }));
    set((state) => ({
      products: [...newProducts, ...state.products],
      movements: [...newMovements, ...state.movements],
      categories: mergeCategories(state.categories, newProducts)
    }));
    for (const product of newProducts) void saveCloudProduct(product);
    return newProducts.length;
  },
  addCustomer: (input) => {
    const customer = makeCustomer(input);
    if (!customer) return null;
    set((state) => ({ customers: [customer, ...state.customers] }));
    return customer;
  },
  updateCustomer: (id, input) => {
    if (!input.name.trim()) return;
    set((state) => ({
      customers: state.customers.map((customer) =>
        customer.id === id
          ? {
              ...customer,
              name: input.name.trim(),
              phone: input.phone.trim(),
              email: input.email.trim(),
              note: input.note.trim(),
              syncStatus: "pendiente"
            }
          : customer
      )
    }));
  },
  deleteCustomer: (id, requestedBy) => {
    if (requestedBy !== "dueno") return false;
    const customer = get().customers.find((item) => item.id === id && !item.deletedAt);
    if (!customer) return false;
    set((state) => ({
      customers: state.customers.map((item) =>
        item.id === id ? { ...item, deletedAt: new Date().toISOString(), deletedBy: requestedBy, syncStatus: "pendiente" } : item
      )
    }));
    return true;
  },
  restoreCustomer: (id, requestedBy) => {
    if (requestedBy !== "dueno") return false;
    const customer = get().customers.find((item) => item.id === id && item.deletedAt);
    if (!customer) return false;
    set((state) => ({
      customers: state.customers.map((item) =>
        item.id === id ? { ...item, deletedAt: undefined, deletedBy: undefined, syncStatus: "pendiente" } : item
      )
    }));
    return true;
  },
  addSupplier: (input) => {
    const supplier = makeSupplier(input);
    if (!supplier) return null;
    const entry = makeOperationAuditEntry({
      entityType: "proveedor",
      entityId: supplier.id,
      entityName: supplier.name,
      action: "creacion",
      reason: "Alta manual de proveedor",
      performedBy: get().activeRole,
      after: supplier
    });
    set((state) => ({ suppliers: [supplier, ...state.suppliers], operationAuditEntries: [entry, ...state.operationAuditEntries] }));
    return supplier;
  },
  updateSupplier: (id, input) => {
    if (!input.name.trim()) return;
    const current = get().suppliers.find((supplier) => supplier.id === id);
    if (!current) return;
    const updatedSupplier: Supplier = {
      ...current,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      note: input.note.trim(),
      syncStatus: "pendiente"
    };
    const entry = makeOperationAuditEntry({
      entityType: "proveedor",
      entityId: id,
      entityName: updatedSupplier.name,
      action: "correccion",
      reason: "Edicion de proveedor",
      performedBy: get().activeRole,
      before: current,
      after: updatedSupplier
    });
    set((state) => ({
      suppliers: state.suppliers.map((supplier) =>
        supplier.id === id ? updatedSupplier : supplier
      ),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
  },
  deleteSupplier: (id, requestedBy) => {
    if (!canDeleteSupplier(requestedBy)) return false;
    const supplier = get().suppliers.find((item) => item.id === id && !item.deletedAt);
    if (!supplier) return false;
    const deletedSupplier: Supplier = { ...supplier, deletedAt: new Date().toISOString(), deletedBy: requestedBy, syncStatus: "pendiente" };
    const entry = makeOperationAuditEntry({
      entityType: "proveedor",
      entityId: supplier.id,
      entityName: supplier.name,
      action: "eliminacion",
      reason: "Baja de proveedor",
      performedBy: requestedBy,
      before: supplier,
      after: deletedSupplier
    });
    set((state) => ({
      suppliers: state.suppliers.map((item) => (item.id === id ? deletedSupplier : item)),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    return true;
  },
  restoreSupplier: (id, requestedBy) => {
    if (!canDeleteSupplier(requestedBy)) return false;
    const supplier = get().suppliers.find((item) => item.id === id && item.deletedAt);
    if (!supplier) return false;
    const restoredSupplier: Supplier = { ...supplier, deletedAt: undefined, deletedBy: undefined, syncStatus: "pendiente" };
    const entry = makeOperationAuditEntry({
      entityType: "proveedor",
      entityId: supplier.id,
      entityName: supplier.name,
      action: "restauracion",
      reason: "Restauracion de proveedor",
      performedBy: requestedBy,
      before: supplier,
      after: restoredSupplier
    });
    set((state) => ({
      suppliers: state.suppliers.map((item) => (item.id === id ? restoredSupplier : item)),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    return true;
  },
  adjustStock: (input) => {
    const found = findVariant(get().products, input.variantId);
    if (!found || input.quantity < 1) return null;
    const signedQuantity = input.type === "ingreso" || input.type === "devolucion" ? input.quantity : -input.quantity;
    const nextStock = found.variant.stock + signedQuantity;
    if (nextStock < 0) return null;
    const movement: StockMovement = {
      id: `local_mov_${crypto.randomUUID()}`,
      productId: found.product.id,
      variantId: found.variant.id,
      type: input.type,
      quantity: signedQuantity,
      reason: input.reason.trim() || "Movimiento manual",
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    set((state) => ({
      movements: [movement, ...state.movements],
      products: state.products.map((product) =>
        product.id !== found.product.id
          ? product
          : {
              ...product,
              syncStatus: "pendiente",
              variants: product.variants.map((variant) =>
                variant.id === input.variantId ? { ...variant, stock: nextStock } : variant
              )
            }
      )
    }));
    const product = get().products.find((item) => item.id === found.product.id);
    if (product) void saveCloudProduct(product);
    return movement;
  },
  adjustStockBatch: (input) => {
    const uniqueLines = new Map(input.lines.map((line) => [line.variantId, line]));
    if (!uniqueLines.size || uniqueLines.size !== input.lines.length) return null;

    const draftLines = Array.from(uniqueLines.values()).map((line) => {
      const found = findVariant(get().products, line.variantId);
      const actualStock = Math.max(0, Math.trunc(line.actualStock));
      if (!found || !Number.isFinite(actualStock)) return null;
      return { found, actualStock, quantity: actualStock - found.variant.stock };
    });
    if (draftLines.some((line) => !line)) return null;

    const changedLines = draftLines.filter((line): line is NonNullable<typeof line> => Boolean(line && line.quantity));
    if (!changedLines.length) return null;

    const now = new Date().toISOString();
    const operationId = `local_stockop_${crypto.randomUUID()}`;
    const operationNumber = nextNumber("MOV", new Set(get().movements.map((item) => item.operationId ?? item.id)).size);
    const reason = input.reason.trim() || "Conteo de stock";
    const createdMovements: StockMovement[] = changedLines.map(({ found, quantity }) => ({
      id: `local_mov_${crypto.randomUUID()}`,
      productId: found.product.id,
      variantId: found.variant.id,
      type: "ajuste",
      quantity,
      reason,
      createdAt: now,
      operationId,
      operationNumber,
      correctionOfOperationId: input.correctionOfOperationId,
      syncStatus: "pendiente"
    }));
    const deltaByVariant = new Map(createdMovements.map((item) => [item.variantId, item.quantity]));
    const changedProductIds = new Set(createdMovements.map((item) => item.productId));
    const entry = makeOperationAuditEntry({
      entityType: "movimiento",
      entityId: operationId,
      entityName: operationNumber,
      action: input.correctionOfOperationId ? "correccion" : "creacion",
      reason,
      performedBy: get().activeRole,
      after: createdMovements
    });

    set((state) => ({
      movements: [...createdMovements, ...state.movements],
      products: state.products.map((product) =>
        !changedProductIds.has(product.id)
          ? product
          : {
              ...product,
              syncStatus: "pendiente",
              variants: product.variants.map((variant) => {
                const quantity = deltaByVariant.get(variant.id);
                return quantity === undefined ? variant : { ...variant, stock: variant.stock + quantity };
              })
            }
      ),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    syncProductsToCloud(get().products, [...changedProductIds]);
    return createdMovements;
  },
  voidStockMovementBatch: (operationId, reason, requestedBy) => {
    if (!canRunAudit(requestedBy, reason)) return false;
    const batch = get().movements.filter((item) => item.operationId === operationId && !item.voidedAt);
    if (!batch.length) return false;

    const currentByVariant = new Map(get().products.flatMap((product) => product.variants.map((variant) => [variant.id, variant.stock])));
    if (batch.some((item) => (currentByVariant.get(item.variantId) ?? -Infinity) - item.quantity < 0)) return false;

    const now = new Date().toISOString();
    const voidedBatch = batch.map((item) => ({ ...item, voidedAt: now, voidedBy: requestedBy, syncStatus: "pendiente" as const }));
    const voidedById = new Map(voidedBatch.map((item) => [item.id, item]));
    const deltaByVariant = new Map(batch.map((item) => [item.variantId, -item.quantity]));
    const changedProductIds = new Set(batch.map((item) => item.productId));
    const entry = makeOperationAuditEntry({
      entityType: "movimiento",
      entityId: operationId,
      entityName: batch[0].operationNumber ?? "Movimiento manual",
      action: "eliminacion",
      reason,
      performedBy: requestedBy,
      before: batch,
      after: voidedBatch
    });

    set((state) => ({
      movements: state.movements.map((item) => voidedById.get(item.id) ?? item),
      products: state.products.map((product) =>
        !changedProductIds.has(product.id)
          ? product
          : {
              ...product,
              syncStatus: "pendiente",
              variants: product.variants.map((variant) => {
                const quantity = deltaByVariant.get(variant.id);
                return quantity === undefined ? variant : { ...variant, stock: variant.stock + quantity };
              })
            }
      ),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    syncProductsToCloud(get().products, [...changedProductIds]);
    return true;
  },
  addQuickSale: (variantId, quantity, paymentMethod, shiftId, discount = 0) => {
    const found = findVariant(get().products, variantId);
    const shift = get().cashShifts.find((item) => item.id === shiftId && !item.closedAt);
    if (!shift || !found || quantity < 1 || found.variant.stock < quantity) return null;

    const line = buildSaleLine(found.product, found.variant, quantity);
    const totals = saleTotals([line], discount);
    const sale: Sale = {
      id: `local_sale_${crypto.randomUUID()}`,
      receiptNumber: nextNumber("CI", get().sales.length),
      type: "rapida",
      shiftId,
      customerName: "Consumidor final",
      lines: [line],
      discount,
      paymentMethod,
      total: totals.total,
      margin: totals.margin,
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    const movement: StockMovement = {
      id: `local_mov_${crypto.randomUUID()}`,
      productId: found.product.id,
      variantId,
      type: "venta",
      quantity: -quantity,
      reason: sale.receiptNumber,
      createdAt: sale.createdAt,
      syncStatus: "pendiente"
    };

    set((state) => ({
      sales: [sale, ...state.sales],
      movements: [movement, ...state.movements],
      products: state.products.map((product) =>
        product.id !== found.product.id
          ? product
          : {
              ...product,
              variants: product.variants.map((variant) =>
                variant.id === variantId ? { ...variant, stock: variant.stock - quantity } : variant
              )
            }
      )
    }));
    syncProductsToCloud(get().products, [found.product.id]);
    return sale;
  },
  addDetailedSale: (input) => {
    const cleanLines = input.lines.filter((line) => line.quantity > 0);
    const shift = get().cashShifts.find((item) => item.id === input.shiftId && !item.closedAt);
    if (!shift || !cleanLines.length || !hasAvailableStock(get().products, cleanLines)) return null;
    const totals = saleTotals(cleanLines, input.discount);
    const sale: Sale = {
      id: `local_sale_${crypto.randomUUID()}`,
      receiptNumber: nextNumber("CI", get().sales.length),
      type: "detallada",
      shiftId: input.shiftId,
      customerName: input.customerName?.trim() || "Consumidor final",
      lines: cleanLines,
      discount: input.discount,
      paymentMethod: input.paymentMethod,
      internalNote: input.internalNote?.trim(),
      total: totals.total,
      margin: totals.margin,
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    const newCustomer =
      sale.customerName && shouldCreateContact(sale.customerName) && !get().customers.some((customer) => customer.name.toLowerCase() === sale.customerName?.toLowerCase())
        ? makeCustomer({ name: sale.customerName, phone: "", email: "", note: "Creado desde venta." })
        : null;
    set((state) => ({
      sales: [sale, ...state.sales],
      movements: [...stockMovementsForSale(sale), ...state.movements],
      products: applySaleStock(state.products, sale),
      customers: newCustomer ? [newCustomer, ...state.customers] : state.customers
    }));
    syncProductsToCloud(get().products, sale.lines.map((line) => line.productId));
    return sale;
  },
  addQuote: (input) => {
    const cleanLines = input.lines.filter((line) => line.quantity > 0);
    if (!input.customerName.trim() || !cleanLines.length) return null;
    const totals = saleTotals(cleanLines, 0);
    const quote: Quote = {
      id: `local_quote_${crypto.randomUUID()}`,
      number: nextNumber("PR", get().quotes.length),
      customerName: input.customerName.trim(),
      lines: cleanLines,
      total: totals.total,
      status: "abierto",
      internalNote: input.internalNote?.trim(),
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    const newCustomer =
      shouldCreateContact(quote.customerName) && !get().customers.some((customer) => customer.name.toLowerCase() === quote.customerName.toLowerCase())
        ? makeCustomer({ name: quote.customerName, phone: "", email: "", note: "Creado desde presupuesto." })
        : null;
    set((state) => ({ quotes: [quote, ...state.quotes], customers: newCustomer ? [newCustomer, ...state.customers] : state.customers }));
    return quote;
  },
  addExpense: (expense) => {
    if (expense.amount <= 0) return;
    const newExpense: Expense = {
      id: `local_exp_${crypto.randomUUID()}`,
      category: expense.category.trim() || "Otro",
      amount: money(expense.amount),
      vendor: expense.vendor.trim(),
      note: expense.note.trim(),
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    const entry = makeOperationAuditEntry({
      entityType: "gasto",
      entityId: newExpense.id,
      entityName: newExpense.category,
      action: "creacion",
      reason: "Carga manual de gasto",
      performedBy: get().activeRole,
      after: newExpense
    });
    set((state) => ({ expenses: [newExpense, ...state.expenses], operationAuditEntries: [entry, ...state.operationAuditEntries] }));
  },
  updateExpense: (id, expense, requestedBy) => {
    if (!canManageOperationalRecords(requestedBy) || expense.amount <= 0) return false;
    const current = get().expenses.find((item) => item.id === id && !item.deletedAt);
    if (!current) return false;
    const updatedExpense: Expense = {
      ...current,
      category: expense.category.trim() || "Otro",
      amount: money(expense.amount),
      vendor: expense.vendor.trim(),
      note: expense.note.trim(),
      syncStatus: "pendiente"
    };
    const entry = makeOperationAuditEntry({
      entityType: "gasto",
      entityId: current.id,
      entityName: updatedExpense.category,
      action: "correccion",
      reason: "Edicion de gasto",
      performedBy: requestedBy,
      before: current,
      after: updatedExpense
    });
    set((state) => ({
      expenses: state.expenses.map((item) => (item.id === id ? updatedExpense : item)),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    return true;
  },
  deleteExpense: (id, requestedBy) => {
    if (!canManageOperationalRecords(requestedBy)) return false;
    const expense = get().expenses.find((item) => item.id === id && !item.deletedAt);
    if (!expense) return false;
    const deletedExpense: Expense = { ...expense, deletedAt: new Date().toISOString(), deletedBy: requestedBy, syncStatus: "pendiente" };
    const entry = makeOperationAuditEntry({
      entityType: "gasto",
      entityId: expense.id,
      entityName: expense.category,
      action: "eliminacion",
      reason: "Baja de gasto",
      performedBy: requestedBy,
      before: expense,
      after: deletedExpense
    });
    set((state) => ({
      expenses: state.expenses.map((item) => (item.id === id ? deletedExpense : item)),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    return true;
  },
  restoreExpense: (id, requestedBy) => {
    if (!canManageOperationalRecords(requestedBy)) return false;
    const expense = get().expenses.find((item) => item.id === id && item.deletedAt);
    if (!expense) return false;
    const restoredExpense: Expense = { ...expense, deletedAt: undefined, deletedBy: undefined, syncStatus: "pendiente" };
    const entry = makeOperationAuditEntry({
      entityType: "gasto",
      entityId: expense.id,
      entityName: expense.category,
      action: "restauracion",
      reason: "Restauracion de gasto",
      performedBy: requestedBy,
      before: expense,
      after: restoredExpense
    });
    set((state) => ({
      expenses: state.expenses.map((item) => (item.id === id ? restoredExpense : item)),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    return true;
  },
  addPurchaseReceipt: (input) => {
    const receipt = makePurchaseReceiptFromInput(input);
    if (!receipt) return null;
    const paymentDrafts = (input.payments ?? []).filter((payment) => payment.amount > 0);
    const paymentTotal = paymentDrafts.reduce((sum, payment) => sum + payment.amount, 0);
    if (paymentTotal > receipt.total + 0.01) return null;
    const cleanLines = receipt.lines;
    const createdAt = receipt.createdAt;
    const expense: Expense = {
      id: `local_exp_${crypto.randomUUID()}`,
      category: "Reposicion",
      amount: receipt.total,
      vendor: receipt.supplier,
      note: purchaseExpenseNote(receipt),
      createdAt,
      syncStatus: "pendiente"
    };
    const receiptMovements: StockMovement[] = cleanLines.map((line) => ({
      id: `local_mov_${crypto.randomUUID()}`,
      productId: line.productId,
      variantId: line.variantId,
      type: "ingreso",
      quantity: line.quantity,
      reason: receipt.number,
      createdAt,
      syncStatus: "pendiente"
    }));
    const newSupplier =
      !get().suppliers.some((supplier) => supplier.name.toLowerCase() === receipt.supplier.toLowerCase())
        ? makeSupplier({ name: receipt.supplier, phone: "", email: "", note: "Creado desde compra." })
        : null;
    const entry = makeOperationAuditEntry({
      entityType: "compra",
      entityId: receipt.id,
      entityName: receipt.number,
      action: "creacion",
      reason: "Registro de compra",
      performedBy: get().activeRole,
      after: receipt
    });
    const createdPayments: SupplierPayment[] = paymentDrafts.map((payment) => ({
      id: `local_suppay_${crypto.randomUUID()}`,
      supplier: receipt.supplier,
      receiptId: receipt.id,
      amount: money(payment.amount),
      paymentMethod: payment.paymentMethod,
      note: payment.note.trim(),
      createdAt,
      syncStatus: "pendiente"
    }));
    set((state) => ({
      purchaseReceipts: [receipt, ...state.purchaseReceipts],
      supplierPayments: [...createdPayments, ...state.supplierPayments],
      expenses: [expense, ...state.expenses],
      movements: [...receiptMovements, ...state.movements],
      suppliers: newSupplier ? [newSupplier, ...state.suppliers] : state.suppliers,
      operationAuditEntries: [entry, ...state.operationAuditEntries],
      products: state.products.map((product) => ({
        ...product,
        syncStatus: cleanLines.some((line) => line.productId === product.id) ? "pendiente" : product.syncStatus,
        variants: product.variants.map((variant) => {
          const purchaseLine = cleanLines.find((line) => line.variantId === variant.id);
          return purchaseLine ? { ...variant, stock: variant.stock + purchaseLine.quantity, cost: purchaseLine.unitCost } : variant;
        })
      }))
    }));
    syncProductsToCloud(get().products, cleanLines.map((line) => line.productId));
    return receipt;
  },
  updatePurchaseReceipt: (id, input, requestedBy) => {
    if (!canManageOperationalRecords(requestedBy)) return false;
    const current = get().purchaseReceipts.find((receipt) => receipt.id === id && !receipt.deletedAt);
    if (!current) return false;
    const updated = makePurchaseReceiptFromInput(input, current);
    if (!updated) return false;
    const deltas = purchaseLineDeltas(current.lines, updated.lines);
    if (!canApplyPurchaseDeltas(get().products, deltas)) return false;
    const entry = makeOperationAuditEntry({
      entityType: "compra",
      entityId: current.id,
      entityName: current.number,
      action: "correccion",
      reason: "Edicion de compra",
      performedBy: requestedBy,
      before: current,
      after: updated
    });
    const newSupplier =
      !get().suppliers.some((supplier) => supplier.name.toLowerCase() === updated.supplier.toLowerCase())
        ? makeSupplier({ name: updated.supplier, phone: "", email: "", note: "Creado desde edicion de compra." })
        : null;
    set((state) => ({
      purchaseReceipts: state.purchaseReceipts.map((receipt) => (receipt.id === id ? updated : receipt)),
      expenses: state.expenses.map((expense) =>
        isExpenseForPurchase(expense, current)
          ? { ...expense, amount: updated.total, vendor: updated.supplier, note: purchaseExpenseNote(updated), createdAt: updated.createdAt, syncStatus: "pendiente" }
          : expense
      ),
      movements: [...stockMovementsForPurchaseDelta(deltas, `Correccion ${current.number}`), ...state.movements],
      suppliers: newSupplier ? [newSupplier, ...state.suppliers] : state.suppliers,
      products: applyPurchaseDeltas(state.products, deltas),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    syncProductsToCloud(get().products, Array.from(new Set([...current.lines, ...updated.lines].map((line) => line.productId))));
    return true;
  },
  deletePurchaseReceipt: (id, requestedBy) => {
    if (!canManageOperationalRecords(requestedBy)) return false;
    const current = get().purchaseReceipts.find((receipt) => receipt.id === id && !receipt.deletedAt);
    if (!current) return false;
    const deltas = purchaseLineDeltas(current.lines, []);
    if (!canApplyPurchaseDeltas(get().products, deltas)) return false;
    const deleted: PurchaseReceipt = { ...current, deletedAt: new Date().toISOString(), deletedBy: requestedBy, syncStatus: "pendiente" };
    const entry = makeOperationAuditEntry({
      entityType: "compra",
      entityId: current.id,
      entityName: current.number,
      action: "eliminacion",
      reason: "Anulacion de compra",
      performedBy: requestedBy,
      before: current,
      after: deleted
    });
    set((state) => ({
      purchaseReceipts: state.purchaseReceipts.map((receipt) => (receipt.id === id ? deleted : receipt)),
      expenses: state.expenses.map((expense) =>
        isExpenseForPurchase(expense, current)
          ? { ...expense, deletedAt: deleted.deletedAt, deletedBy: requestedBy, syncStatus: "pendiente" }
          : expense
      ),
      movements: [...stockMovementsForPurchaseDelta(deltas, `Anulacion ${current.number}`), ...state.movements],
      products: applyPurchaseDeltas(state.products, deltas),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    syncProductsToCloud(get().products, current.lines.map((line) => line.productId));
    return true;
  },
  restorePurchaseReceipt: (id, requestedBy) => {
    if (!canManageOperationalRecords(requestedBy)) return false;
    const current = get().purchaseReceipts.find((receipt) => receipt.id === id && receipt.deletedAt);
    if (!current) return false;
    const restored: PurchaseReceipt = { ...current, deletedAt: undefined, deletedBy: undefined, syncStatus: "pendiente" };
    const deltas = purchaseLineDeltas([], restored.lines);
    const entry = makeOperationAuditEntry({
      entityType: "compra",
      entityId: current.id,
      entityName: current.number,
      action: "restauracion",
      reason: "Restauracion de compra",
      performedBy: requestedBy,
      before: current,
      after: restored
    });
    set((state) => ({
      purchaseReceipts: state.purchaseReceipts.map((receipt) => (receipt.id === id ? restored : receipt)),
      expenses: state.expenses.map((expense) =>
        isExpenseForPurchase(expense, current)
          ? { ...expense, deletedAt: undefined, deletedBy: undefined, syncStatus: "pendiente" }
          : expense
      ),
      movements: [...stockMovementsForPurchaseDelta(deltas, `Restauracion ${current.number}`), ...state.movements],
      products: applyPurchaseDeltas(state.products, deltas),
      operationAuditEntries: [entry, ...state.operationAuditEntries]
    }));
    syncProductsToCloud(get().products, restored.lines.map((line) => line.productId));
    return true;
  },
  closeCashDay: (note) => {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = get().sales.filter((sale) => !sale.deletedAt && sale.createdAt.slice(0, 10) === today);
    const todayExpenses = get().expenses.filter((expense) => !expense.deletedAt && expense.createdAt.slice(0, 10) === today);
    const totalByPayment = (method: PaymentMethod) => money(todaySales.filter((sale) => sale.paymentMethod === method).reduce((sum, sale) => sum + sale.total, 0));
    const closure: CashClosure = {
      id: `local_close_${crypto.randomUUID()}`,
      number: nextNumber("CAJA", get().cashClosures.length),
      date: today,
      cashTotal: totalByPayment("efectivo"),
      transferTotal: totalByPayment("transferencia"),
      cardTotal: totalByPayment("tarjeta"),
      otherTotal: totalByPayment("otro"),
      expensesTotal: money(todayExpenses.reduce((sum, expense) => sum + expense.amount, 0)),
      note: note.trim(),
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    set((state) => ({ cashClosures: [closure, ...state.cashClosures] }));
    return closure;
  },
  openCashShift: (initialCash, openedBy, note) => {
    if (initialCash < 0) return null;
    const currentOpen = get().cashShifts.find((shift) => !shift.closedAt);
    if (currentOpen) return currentOpen;
    const shift: CashShift = {
      id: `local_shift_${crypto.randomUUID()}`,
      number: nextNumber("TURNO", get().cashShifts.length),
      openedAt: new Date().toISOString(),
      openedBy,
      initialCash: money(initialCash),
      note: note.trim(),
      syncStatus: "pendiente"
    };
    set((state) => ({ cashShifts: [shift, ...state.cashShifts] }));
    return shift;
  },
  closeCashShift: (id, declaredClosingCash, closedBy, note) => {
    const shift = get().cashShifts.find((item) => item.id === id && !item.closedAt);
    if (!shift || declaredClosingCash < 0) return null;
    const shiftSales = get().sales.filter((sale) => !sale.deletedAt && sale.shiftId === id);
    const cashTotal = shiftSales.filter((sale) => sale.paymentMethod === "efectivo").reduce((sum, sale) => sum + sale.total, 0);
    const closedShift: CashShift = {
      ...shift,
      closedAt: new Date().toISOString(),
      closedBy,
      declaredClosingCash: money(declaredClosingCash),
      expectedClosingCash: money(shift.initialCash + cashTotal),
      closingNote: note.trim(),
      syncStatus: "pendiente"
    };
    set((state) => ({ cashShifts: state.cashShifts.map((item) => (item.id === id ? closedShift : item)) }));
    return closedShift;
  },
  updateSaleWithAudit: async (saleId, input, reason, requestedBy) => {
    const sale = get().sales.find((item) => item.id === saleId && !item.deletedAt);
    if (!sale || !canRunAudit(requestedBy, reason) || input.discount < 0) return false;
    const totals = saleTotals(sale.lines, input.discount);
    const updatedSale: Sale = {
      ...sale,
      customerName: input.customerName.trim() || "Consumidor final",
      discount: money(input.discount),
      paymentMethod: input.paymentMethod,
      internalNote: input.internalNote.trim(),
      createdAt: input.createdAt || sale.createdAt,
      total: totals.total,
      margin: totals.margin,
      syncStatus: "pendiente"
    };
    const entry = makeAuditEntry({
      entityType: "venta",
      entityId: sale.id,
      entityNumber: sale.receiptNumber,
      action: "correccion",
      reason,
      performedBy: requestedBy,
      before: sale,
      after: updatedSale
    });
    const current = get();
    return commitAuditedState({
      ...current,
      sales: current.sales.map((item) => (item.id === saleId ? updatedSale : item)),
      salesAuditEntries: [entry, ...current.salesAuditEntries]
    }, reason);
  },
  deleteSaleWithAudit: async (saleId, reason, requestedBy) => {
    const sale = get().sales.find((item) => item.id === saleId && !item.deletedAt);
    if (!sale || !canRunAudit(requestedBy, reason)) return false;
    const deletedSale: Sale = { ...sale, deletedAt: new Date().toISOString(), deletedBy: requestedBy, syncStatus: "pendiente" };
    const entry = makeAuditEntry({
      entityType: "venta",
      entityId: sale.id,
      entityNumber: sale.receiptNumber,
      action: "eliminacion",
      reason,
      performedBy: requestedBy,
      before: sale,
      after: deletedSale
    });
    const current = get();
    const nextProducts = restoreSaleStock(current.products, sale);
    const ok = await commitAuditedState({
      ...current,
      sales: current.sales.map((item) => (item.id === saleId ? deletedSale : item)),
      products: nextProducts,
      movements: [...reversalStockMovementsForSale(sale, reason), ...current.movements],
      salesAuditEntries: [entry, ...current.salesAuditEntries]
    }, reason);
    if (ok) syncProductsToCloud(nextProducts, sale.lines.map((line) => line.productId));
    return ok;
  },
  restoreSaleWithAudit: async (auditEntryId, reason, requestedBy) => {
    const source = get().salesAuditEntries.find((entry) => entry.id === auditEntryId && entry.entityType === "venta" && entry.action === "eliminacion");
    const sale = source?.before && "receiptNumber" in source.before ? source.before : null;
    const existingDeletedSale = sale ? get().sales.find((item) => item.id === sale.id && item.deletedAt) : null;
    if (!sale || get().sales.some((item) => item.id === sale.id && !item.deletedAt) || !canRunAudit(requestedBy, reason)) return false;
    if (!hasAvailableStock(get().products, sale.lines)) return false;
    const restoredSale: Sale = { ...(existingDeletedSale ?? sale), deletedAt: undefined, deletedBy: undefined, syncStatus: "pendiente" };
    const entry = makeAuditEntry({
      entityType: "venta",
      entityId: restoredSale.id,
      entityNumber: restoredSale.receiptNumber,
      action: "restauracion",
      reason,
      performedBy: requestedBy,
      after: restoredSale
    });
    const current = get();
    const nextProducts = applySaleStock(current.products, restoredSale);
    const ok = await commitAuditedState({
      ...current,
      sales: existingDeletedSale ? current.sales.map((item) => (item.id === restoredSale.id ? restoredSale : item)) : [restoredSale, ...current.sales],
      products: nextProducts,
      movements: [...stockMovementsForSale(restoredSale), ...current.movements],
      salesAuditEntries: [entry, ...current.salesAuditEntries]
    }, reason);
    if (ok) syncProductsToCloud(nextProducts, restoredSale.lines.map((line) => line.productId));
    return ok;
  },
  updateShiftWithAudit: async (shiftId, input, reason, requestedBy) => {
    const shift = get().cashShifts.find((item) => item.id === shiftId);
    if (!shift || !canRunAudit(requestedBy, reason) || input.initialCash < 0 || (input.declaredClosingCash ?? 0) < 0) return false;
    const shiftSales = get().sales.filter((sale) => !sale.deletedAt && sale.shiftId === shiftId);
    const cashTotal = shiftSales.filter((sale) => sale.paymentMethod === "efectivo").reduce((sum, sale) => sum + sale.total, 0);
    const updatedShift: CashShift = {
      ...shift,
      openedAt: input.openedAt || shift.openedAt,
      initialCash: money(input.initialCash),
      note: input.note.trim(),
      closedAt: input.closedAt || undefined,
      declaredClosingCash: input.closedAt ? money(input.declaredClosingCash ?? 0) : undefined,
      expectedClosingCash: input.closedAt ? money(input.initialCash + cashTotal) : undefined,
      closingNote: input.closedAt ? input.closingNote?.trim() : undefined,
      syncStatus: "pendiente"
    };
    const entry = makeAuditEntry({
      entityType: "turno",
      entityId: shift.id,
      entityNumber: shift.number,
      action: "correccion",
      reason,
      performedBy: requestedBy,
      before: shift,
      after: updatedShift
    });
    const current = get();
    return commitAuditedState({
      ...current,
      cashShifts: current.cashShifts.map((item) => (item.id === shiftId ? updatedShift : item)),
      salesAuditEntries: [entry, ...current.salesAuditEntries]
    }, reason);
  },
  deleteShiftWithAudit: async (shiftId, reason, requestedBy) => {
    const shift = get().cashShifts.find((item) => item.id === shiftId);
    if (!shift || !canRunAudit(requestedBy, reason)) return false;
    const entry = makeAuditEntry({
      entityType: "turno",
      entityId: shift.id,
      entityNumber: shift.number,
      action: "eliminacion",
      reason,
      performedBy: requestedBy,
      before: shift
    });
    const current = get();
    return commitAuditedState({
      ...current,
      cashShifts: current.cashShifts.filter((item) => item.id !== shiftId),
      salesAuditEntries: [entry, ...current.salesAuditEntries]
    }, reason);
  },
  restoreShiftWithAudit: async (auditEntryId, reason, requestedBy) => {
    const source = get().salesAuditEntries.find((entry) => entry.id === auditEntryId && entry.entityType === "turno" && entry.action === "eliminacion");
    const shift = source?.before && "number" in source.before && "openedAt" in source.before ? source.before : null;
    if (!shift || get().cashShifts.some((item) => item.id === shift.id) || !canRunAudit(requestedBy, reason)) return false;
    const restoredShift: CashShift = { ...shift, syncStatus: "pendiente" };
    const entry = makeAuditEntry({
      entityType: "turno",
      entityId: restoredShift.id,
      entityNumber: restoredShift.number,
      action: "restauracion",
      reason,
      performedBy: requestedBy,
      after: restoredShift
    });
    const current = get();
    return commitAuditedState({
      ...current,
      cashShifts: [restoredShift, ...current.cashShifts],
      salesAuditEntries: [entry, ...current.salesAuditEntries]
    }, reason);
  },
  addSupplierPayment: (input) => {
    if (!input.supplier.trim() || input.amount <= 0) return null;
    const receipt = input.receiptId ? get().purchaseReceipts.find((item) => item.id === input.receiptId && !item.deletedAt) : undefined;
    if (input.receiptId && (!receipt || receipt.supplier.toLowerCase() !== input.supplier.trim().toLowerCase())) return null;
    const alreadyPaid = input.receiptId
      ? get().supplierPayments.filter((payment) => payment.receiptId === input.receiptId).reduce((sum, payment) => sum + payment.amount, 0)
      : 0;
    if (receipt && input.amount > receipt.total - alreadyPaid + 0.01) return null;
    const payment: SupplierPayment = {
      id: `local_suppay_${crypto.randomUUID()}`,
      supplier: input.supplier.trim(),
      receiptId: input.receiptId,
      amount: money(input.amount),
      paymentMethod: input.paymentMethod,
      note: input.note.trim(),
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    set((state) => ({ supplierPayments: [payment, ...state.supplierPayments] }));
    return payment;
  },
  addCapitalEntry: (input, requestedBy) => {
    if (requestedBy !== "dueno" || input.amount <= 0) return null;
    const entry: CapitalEntry = {
      id: `local_cap_${crypto.randomUUID()}`,
      type: input.type,
      source: input.source.trim() || "Sin detalle",
      amount: money(input.amount),
      note: input.note.trim(),
      dueDate: input.dueDate,
      status: "activo",
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    set((state) => ({ capitalEntries: [entry, ...state.capitalEntries] }));
    return entry;
  },
  deleteCapitalEntry: (id, requestedBy) => {
    if (requestedBy !== "dueno") return false;
    const current = get().capitalEntries.find((entry) => entry.id === id && !entry.deletedAt);
    if (!current) return false;
    set((state) => ({
      capitalEntries: state.capitalEntries.map((entry) =>
        entry.id === id ? { ...entry, deletedAt: new Date().toISOString(), deletedBy: requestedBy, syncStatus: "pendiente" } : entry
      )
    }));
    return true;
  },
  updateBusinessProfile: (input) => {
    set({ businessProfile: { ...input } });
  },
  addCategory: (category) => {
    const clean = category.trim();
    if (!clean) return;
    set((state) => ({ categories: mergeCategories([...state.categories, clean], state.products) }));
  },
  removeCategory: (category) => {
    set((state) => ({
      // Si algun producto todavia la usa, se conserva disponible para evitar
      // que una edicion posterior pierda su categoria.
      categories: mergeCategories(state.categories.filter((item) => item !== category), state.products)
    }));
  },
  updateRolePermissions: (role, permissions) => {
    set((state) => ({ rolePermissions: { ...state.rolePermissions, [role]: permissions } }));
  },
  addTransfer: (input) => {
    if (!input.sender.trim() || input.amount <= 0) return null;
    const transfer: Transfer = {
      id: `local_tr_${crypto.randomUUID()}`,
      relatedTo: input.relatedTo,
      relatedId: input.relatedId,
      amount: input.amount,
      sender: input.sender.trim(),
      status: "pendiente",
      note: input.note.trim() || "Comprobante cargado manualmente",
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    set((state) => ({ transfers: [transfer, ...state.transfers] }));
    return transfer;
  },
  addOnlineOrder: async (input) => {
    const cleanLines = input.lines.filter((line) => line.quantity > 0);
    if (!input.customerName.trim() || !input.customerContact.trim() || !cleanLines.length) return null;
    if (!hasAvailableStock(get().products, cleanLines)) return null;
    const totals = saleTotals(cleanLines, 0);
    const order: OnlineOrder = {
      id: `local_order_${crypto.randomUUID()}`,
      number: nextNumber("WEB", get().onlineOrders.length),
      customerName: input.customerName.trim(),
      customerContact: input.customerContact.trim(),
      customerEmail: input.customerEmail.trim(),
      deliveryMethod: input.deliveryMethod,
      deliveryAddress: input.deliveryAddress.trim(),
      lines: cleanLines,
      total: totals.total,
      status: "nuevo",
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    const movementsForOrder: StockMovement[] = cleanLines.map((line) => ({
      id: `local_mov_${crypto.randomUUID()}`,
      productId: line.productId,
      variantId: line.variantId,
      type: "ajuste",
      quantity: -line.quantity,
      reason: order.number,
      createdAt: order.createdAt,
      syncStatus: "pendiente"
    }));
    const isFirstPurchase = !get().onlineOrders.some((item) => item.customerEmail.toLowerCase() === order.customerEmail.toLowerCase());
    const emailMessages: EmailMessage[] = [
      ...(isFirstPurchase && order.customerEmail
        ? [{
            id: `local_email_${crypto.randomUUID()}`,
            kind: "bienvenida" as const,
            to: order.customerEmail,
            subject: "Bienvenido a Regaleria Shop",
            html: `<h1>Gracias por elegirnos, ${order.customerName}</h1><p>Ya registramos tu cuenta de compra para que tus próximos pedidos sean más simples.</p>`,
            createdAt: order.createdAt,
            status: "pendiente" as const
          }]
        : []),
      ...(order.customerEmail
        ? [{
            id: `local_email_${crypto.randomUUID()}`,
            kind: "confirmacion_pedido" as const,
            to: order.customerEmail,
            subject: `Recibimos tu pedido ${order.number}`,
            html: `<h1>Pedido confirmado</h1><p>Hola ${order.customerName}, recibimos tu pedido ${order.number} por ${money(order.total)}.</p><p>Modalidad: ${order.deliveryMethod === "envio" ? `Envío a ${order.deliveryAddress}` : "Retiro en el local"}.</p>`,
            createdAt: order.createdAt,
            status: "pendiente" as const
          }]
        : []),
      {
        id: `local_email_${crypto.randomUUID()}`,
        kind: "aviso_negocio" as const,
        to: "josias.insfran66@gmail.com",
        subject: `Nuevo pedido web ${order.number}`,
        html: `<h1>Nuevo pedido web</h1><p>${order.customerName} realizó el pedido ${order.number} por ${money(order.total)}.</p><p>Contacto: ${order.customerContact} · ${order.customerEmail}</p>`,
        createdAt: order.createdAt,
        status: "pendiente" as const
      }
    ];
    const saved = await saveCloudOrder(order, emailMessages);
    if (!saved) return null;
    set((state) => ({
      onlineOrders: [order, ...state.onlineOrders],
      emailMessages: [...emailMessages, ...state.emailMessages],
      movements: [...movementsForOrder, ...state.movements],
      products: applySaleStock(state.products, { ...order, receiptNumber: order.number, type: "detallada", discount: 0, paymentMethod: "otro", margin: 0 })
    }));
    return order;
  },
  confirmTransfer: (id) => {
    set((state) => ({
      transfers: state.transfers.map((transfer) =>
        transfer.id === id ? { ...transfer, status: "confirmado", syncStatus: "pendiente" } : transfer
      )
    }));
  },
  convertQuote: (id) => {
    const quote = get().quotes.find((item) => item.id === id);
    const shift = get().cashShifts.find((item) => !item.closedAt);
    if (!quote || quote.status !== "abierto") return null;
    if (!shift || !hasAvailableStock(get().products, quote.lines)) return null;
    const totals = saleTotals(quote.lines, 0);
    const sale: Sale = {
      id: `local_sale_${crypto.randomUUID()}`,
      receiptNumber: nextNumber("CI", get().sales.length),
      type: "detallada",
      shiftId: shift.id,
      customerName: quote.customerName,
      lines: quote.lines,
      discount: 0,
      paymentMethod: "transferencia",
      internalNote: quote.internalNote,
      total: totals.total,
      margin: totals.margin,
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    set((state) => ({
      sales: [sale, ...state.sales],
      movements: [...stockMovementsForSale(sale), ...state.movements],
      products: applySaleStock(state.products, sale),
      quotes: state.quotes.map((item) => (item.id === id ? { ...item, status: "convertido", syncStatus: "pendiente" } : item))
    }));
    syncProductsToCloud(get().products, sale.lines.map((line) => line.productId));
    return sale;
  },
  markAllSynced: () => {
    if (import.meta.env.MODE === "test") {
      set(syncedOperationalState(get()));
      return;
    }
    void flushOperationalState();
  }
}));

useStore.subscribe((state, previous) => {
  if (applyingSyncedState) return;
  if (hasOperationalChange(state, previous)) scheduleOperationalSave();
});

export const resetStore = () => {
  useStore.setState(initialDataState());
};

export const canSeeFinancials = (role: AppState["activeRole"]) => role === "dueno" || role === "administrador" || role === "encargado";
export const canManageSettings = (role: AppState["activeRole"]) => role === "dueno" || role === "administrador";
