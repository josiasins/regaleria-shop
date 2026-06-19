import { create } from "zustand";
import { deleteCloudProduct, loadCloudCatalog, saveCloudProduct, seedCloudCatalog } from "./catalogCloud";
import { businessProfile, cashClosures, cashShifts, categories, customers, expenses, movements, onlineOrders, products, purchaseReceipts, quotes, rolePermissions, sales, supplierPayments, suppliers, transfers } from "./data";
import type {
  BusinessProfile,
  BusinessProfileInput,
  CashClosure,
  CashShift,
  Customer,
  CustomerDraftInput,
  Expense,
  ImportProductRow,
  NewProductInput,
  OnlineOrder,
  OnlineOrderDraftInput,
  PaymentMethod,
  Product,
  ProductUpdateInput,
  RolePermissions,
  PurchaseReceipt,
  PurchaseReceiptDraftInput,
  PublishUpdateInput,
  Quote,
  QuoteDraftInput,
  Role,
  Sale,
  SaleDraftInput,
  SaleLine,
  StockAdjustmentInput,
  StockMovement,
  Supplier,
  SupplierDraftInput,
  SupplierPayment,
  Transfer,
  TransferDraftInput,
  VariantUpdateInput
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
  importProducts: (rows: ImportProductRow[]) => number;
  addCustomer: (input: CustomerDraftInput) => Customer | null;
  updateCustomer: (id: string, input: CustomerDraftInput) => void;
  addSupplier: (input: SupplierDraftInput) => Supplier | null;
  updateSupplier: (id: string, input: SupplierDraftInput) => void;
  adjustStock: (input: StockAdjustmentInput) => StockMovement | null;
  addQuickSale: (variantId: string, quantity: number, paymentMethod: PaymentMethod, shiftId: string, discount?: number) => Sale | null;
  addDetailedSale: (input: SaleDraftInput & { shiftId: string }) => Sale | null;
  addQuote: (input: QuoteDraftInput) => Quote | null;
  addExpense: (expense: Pick<Expense, "category" | "amount" | "vendor" | "note">) => void;
  addPurchaseReceipt: (input: PurchaseReceiptDraftInput) => PurchaseReceipt | null;
  closeCashDay: (note: string) => CashClosure;
  openCashShift: (initialCash: number, openedBy: Role, note: string) => CashShift | null;
  closeCashShift: (id: string, declaredClosingCash: number, closedBy: Role, note: string) => CashShift | null;
  addSupplierPayment: (supplier: string, amount: number, note: string) => SupplierPayment | null;
  updateBusinessProfile: (input: BusinessProfileInput) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  updateRolePermissions: (role: Role, permissions: RolePermissions[Role]) => void;
  addTransfer: (input: TransferDraftInput) => Transfer | null;
  addOnlineOrder: (input: OnlineOrderDraftInput) => OnlineOrder | null;
  confirmTransfer: (id: string) => void;
  convertQuote: (id: string) => Sale | null;
  markAllSynced: () => void;
}

const money = (value: number) => Math.round(value * 100) / 100;
const nextNumber = (prefix: string, count: number) => `${prefix}-${String(count + 1).padStart(6, "0")}`;

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

function applySaleStock(products: Product[], sale: Sale) {
  return products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => {
      const quantitySold = sale.lines
        .filter((line) => line.variantId === variant.id)
        .reduce((sum, line) => sum + line.quantity, 0);
      return quantitySold ? { ...variant, stock: variant.stock - quantitySold } : variant;
    })
  }));
}

function initialDataState() {
  return {
    products: structuredClone(products),
    sales: structuredClone(sales),
    quotes: structuredClone(quotes),
    transfers: structuredClone(transfers),
    expenses: structuredClone(expenses),
    movements: structuredClone(movements),
    onlineOrders: structuredClone(onlineOrders),
    purchaseReceipts: structuredClone(purchaseReceipts),
    customers: structuredClone(customers),
    suppliers: structuredClone(suppliers),
    cashClosures: structuredClone(cashClosures),
    cashShifts: structuredClone(cashShifts),
    supplierPayments: structuredClone(supplierPayments),
    businessProfile: structuredClone(businessProfile),
    categories: structuredClone(categories),
    rolePermissions: structuredClone(rolePermissions),
    activeRole: "dueno" as const
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
  for (const product of selected) void saveCloudProduct(product);
}

export const useStore = create<AppState>((set, get) => ({
  ...initialDataState(),
  activeRole: "dueno",
  catalogStatus: "cargando",
  initializeCatalog: async () => {
    const cloudProducts = await loadCloudCatalog();
    if (cloudProducts === null) {
      set({ catalogStatus: "error" });
      return;
    }
    if (cloudProducts.length) {
      set({ products: cloudProducts, catalogStatus: "actualizado" });
      return;
    }
    const seeded = await seedCloudCatalog(get().products);
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
      imageUrls: [input.imageUrl.trim() || "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80"],
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
    set((state) => ({ products: [product, ...state.products], movements: [movement, ...state.movements], catalogStatus: "actualizado" }));
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
    const product: Product = {
      ...current,
      name: input.name.trim(),
      category: input.category.trim() || "Sin categoria",
      supplier: input.supplier.trim() || "Sin proveedor",
      description: input.description.trim(),
      imageUrl: input.imageUrl.trim() || current.imageUrl,
      imageUrls: input.imageUrls?.length ? input.imageUrls.map((url) => url.trim()).filter(Boolean) : current.imageUrls,
      publishable: input.publishable,
      syncStatus: "sincronizado"
    };
    const saved = await saveCloudProduct(product);
    if (!saved) {
      set({ catalogStatus: "error" });
      return false;
    }
    set((state) => ({
      products: state.products.map((item) => (item.id === product.id ? product : item)),
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
      categories: Array.from(new Set([...state.categories, ...newProducts.map((product) => product.category)]))
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
  addSupplier: (input) => {
    const supplier = makeSupplier(input);
    if (!supplier) return null;
    set((state) => ({ suppliers: [supplier, ...state.suppliers] }));
    return supplier;
  },
  updateSupplier: (id, input) => {
    if (!input.name.trim()) return;
    set((state) => ({
      suppliers: state.suppliers.map((supplier) =>
        supplier.id === id
          ? {
              ...supplier,
              name: input.name.trim(),
              phone: input.phone.trim(),
              email: input.email.trim(),
              note: input.note.trim(),
              syncStatus: "pendiente"
            }
          : supplier
      )
    }));
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
    const newExpense: Expense = {
      id: `local_exp_${crypto.randomUUID()}`,
      ...expense,
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    set((state) => ({ expenses: [newExpense, ...state.expenses] }));
  },
  addPurchaseReceipt: (input) => {
    const cleanLines = input.lines.filter((line) => line.quantity > 0 && line.unitCost >= 0);
    if (!input.supplier.trim() || !input.documentNumber.trim() || !cleanLines.length) return null;
    const createdAt = new Date().toISOString();
    const total = cleanLines.reduce((sum, line) => sum + line.subtotal, 0);
    const receipt: PurchaseReceipt = {
      id: `local_purchase_${crypto.randomUUID()}`,
      number: nextNumber("COM", get().purchaseReceipts.length),
      documentType: input.documentType,
      documentNumber: input.documentNumber.trim(),
      supplier: input.supplier.trim(),
      lines: cleanLines,
      total: money(total),
      createdAt,
      syncStatus: "pendiente"
    };
    const expense: Expense = {
      id: `local_exp_${crypto.randomUUID()}`,
      category: "Reposicion",
      amount: receipt.total,
      vendor: receipt.supplier,
      note: `${receipt.documentType} ${receipt.documentNumber}`,
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
    set((state) => ({
      purchaseReceipts: [receipt, ...state.purchaseReceipts],
      expenses: [expense, ...state.expenses],
      movements: [...receiptMovements, ...state.movements],
      suppliers: newSupplier ? [newSupplier, ...state.suppliers] : state.suppliers,
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
  closeCashDay: (note) => {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = get().sales.filter((sale) => sale.createdAt.slice(0, 10) === today);
    const todayExpenses = get().expenses.filter((expense) => expense.createdAt.slice(0, 10) === today);
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
    const shiftSales = get().sales.filter((sale) => sale.shiftId === id);
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
  addSupplierPayment: (supplier, amount, note) => {
    if (!supplier.trim() || amount <= 0) return null;
    const payment: SupplierPayment = {
      id: `local_suppay_${crypto.randomUUID()}`,
      supplier: supplier.trim(),
      amount: money(amount),
      note: note.trim(),
      createdAt: new Date().toISOString(),
      syncStatus: "pendiente"
    };
    set((state) => ({ supplierPayments: [payment, ...state.supplierPayments] }));
    return payment;
  },
  updateBusinessProfile: (input) => {
    set({ businessProfile: { ...input } });
  },
  addCategory: (category) => {
    const clean = category.trim();
    if (!clean) return;
    set((state) => ({ categories: Array.from(new Set([...state.categories, clean])) }));
  },
  removeCategory: (category) => {
    set((state) => ({ categories: state.categories.filter((item) => item !== category) }));
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
  addOnlineOrder: (input) => {
    const cleanLines = input.lines.filter((line) => line.quantity > 0);
    if (!input.customerName.trim() || !input.customerContact.trim() || !cleanLines.length) return null;
    if (!hasAvailableStock(get().products, cleanLines)) return null;
    const totals = saleTotals(cleanLines, 0);
    const order: OnlineOrder = {
      id: `local_order_${crypto.randomUUID()}`,
      number: nextNumber("WEB", get().onlineOrders.length),
      customerName: input.customerName.trim(),
      customerContact: input.customerContact.trim(),
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
    set((state) => ({
      onlineOrders: [order, ...state.onlineOrders],
      movements: [...movementsForOrder, ...state.movements],
      products: applySaleStock(state.products, { ...order, receiptNumber: order.number, type: "detallada", discount: 0, paymentMethod: "otro", margin: 0 })
    }));
    syncProductsToCloud(get().products, cleanLines.map((line) => line.productId));
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
    set((state) => ({
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
      supplierPayments: state.supplierPayments.map((item) => ({ ...item, syncStatus: "sincronizado" }))
    }));
  }
}));

export const resetStore = () => {
  useStore.setState(initialDataState());
};

export const canSeeFinancials = (role: AppState["activeRole"]) => role === "dueno" || role === "administrador" || role === "encargado";
export const canManageSettings = (role: AppState["activeRole"]) => role === "dueno" || role === "administrador";
