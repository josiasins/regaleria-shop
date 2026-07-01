import type { BusinessProfile, CapitalEntry, CashClosure, CashShift, Customer, Expense, OnlineOrder, Product, PurchaseReceipt, Quote, RolePermissions, Sale, StockMovement, Supplier, SupplierPayment, Transfer } from "./types";

export const products: Product[] = [
  {
    id: "prod_mate",
    name: "Set matero premium",
    category: "Mates y termos",
    supplier: "Distribuidora Sur",
    description: "Set listo para regalo con mate, bombilla y yerbera.",
    publishable: true,
    imageUrl: "https://images.unsplash.com/photo-1615485737651-580c9159c89f?auto=format&fit=crop&w=900&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1615485737651-580c9159c89f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1598373182133-52452f7691ef?auto=format&fit=crop&w=900&q=80"
    ],
    syncStatus: "sincronizado",
    variants: [
      { id: "var_mate_negro", name: "Negro", sku: "MAT-PREM-NEG", barcode: "7790001000011", stock: 8, lowStockAt: 4, cost: 10500, price: 18900 },
      { id: "var_mate_crema", name: "Crema", sku: "MAT-PREM-CRE", barcode: "7790001000012", stock: 3, lowStockAt: 4, cost: 10500, price: 18900 }
    ]
  },
  {
    id: "prod_vela",
    name: "Vela aromatica artesanal",
    category: "Deco",
    supplier: "Casa Aroma",
    description: "Vela de soja en vaso de vidrio, ideal para regalo chico.",
    publishable: true,
    imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?auto=format&fit=crop&w=900&q=80"
    ],
    syncStatus: "sincronizado",
    variants: [
      { id: "var_vela_vainilla", name: "Vainilla", sku: "VEL-SOJ-VAI", barcode: "7790002000011", stock: 18, lowStockAt: 6, cost: 2200, price: 4900 },
      { id: "var_vela_lavanda", name: "Lavanda", sku: "VEL-SOJ-LAV", barcode: "7790002000012", stock: 5, lowStockAt: 6, cost: 2200, price: 4900 }
    ]
  },
  {
    id: "prod_taza",
    name: "Taza frase regalo",
    category: "Bazar",
    supplier: "Importados Centro",
    description: "Taza de ceramica con caja individual.",
    publishable: false,
    imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80",
    imageUrls: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80"],
    syncStatus: "pendiente",
    variants: [
      { id: "var_taza_mama", name: "Mama", sku: "TAZ-FRA-MAM", barcode: "7790003000011", stock: 11, lowStockAt: 5, cost: 1800, price: 4200 },
      { id: "var_taza_amiga", name: "Amiga", sku: "TAZ-FRA-AMI", barcode: "7790003000012", stock: 2, lowStockAt: 5, cost: 1800, price: 4200 }
    ]
  }
];

export const sales: Sale[] = [
  {
    id: "sale_001",
    receiptNumber: "CI-000001",
    type: "rapida",
    lines: [{ productId: "prod_vela", variantId: "var_vela_vainilla", name: "Vela aromatica artesanal - Vainilla", sku: "VEL-SOJ-VAI", quantity: 2, unitPrice: 4900, unitCost: 2200 }],
    discount: 0,
    paymentMethod: "efectivo",
    total: 9800,
    margin: 5400,
    createdAt: "2026-06-03T11:20:00.000Z",
    syncStatus: "sincronizado"
  },
  {
    id: "sale_002",
    receiptNumber: "CI-000002",
    type: "detallada",
    customerName: "Claudia Gomez",
    lines: [{ productId: "prod_mate", variantId: "var_mate_negro", name: "Set matero premium - Negro", sku: "MAT-PREM-NEG", quantity: 1, unitPrice: 18900, unitCost: 10500 }],
    discount: 900,
    paymentMethod: "transferencia",
    total: 18000,
    margin: 7500,
    createdAt: "2026-06-03T13:42:00.000Z",
    syncStatus: "sincronizado"
  }
];

export const quotes: Quote[] = [
  {
    id: "quote_001",
    number: "PR-000001",
    customerName: "Empresa Norte",
    lines: [{ productId: "prod_taza", variantId: "var_taza_mama", name: "Taza frase regalo - Mama", sku: "TAZ-FRA-MAM", quantity: 12, unitPrice: 4200, unitCost: 1800 }],
    total: 50400,
    status: "abierto",
    createdAt: "2026-06-03T12:00:00.000Z",
    syncStatus: "sincronizado"
  }
];

export const transfers: Transfer[] = [
  { id: "tr_001", relatedTo: "venta", relatedId: "sale_002", amount: 18000, sender: "Claudia Gomez", status: "pendiente", note: "Comprobante cargado por mostrador", createdAt: "2026-06-03T13:45:00.000Z", syncStatus: "sincronizado" }
];

export const expenses: Expense[] = [
  { id: "exp_001", category: "Reposicion", amount: 42000, vendor: "Casa Aroma", note: "Compra inicial de velas", createdAt: "2026-06-03T09:30:00.000Z", syncStatus: "sincronizado" },
  { id: "exp_002", category: "Servicios", amount: 8500, vendor: "Internet", note: "Abono mensual", createdAt: "2026-06-02T15:30:00.000Z", syncStatus: "sincronizado" }
];

export const movements: StockMovement[] = [
  { id: "mov_001", productId: "prod_vela", variantId: "var_vela_vainilla", type: "ingreso", quantity: 20, reason: "Alta inicial", createdAt: "2026-06-03T09:00:00.000Z", syncStatus: "sincronizado" },
  { id: "mov_002", productId: "prod_vela", variantId: "var_vela_vainilla", type: "venta", quantity: -2, reason: "CI-000001", createdAt: "2026-06-03T11:20:00.000Z", syncStatus: "sincronizado" }
];

export const onlineOrders: OnlineOrder[] = [];

export const purchaseReceipts: PurchaseReceipt[] = [];

export const cashClosures: CashClosure[] = [];

export const cashShifts: CashShift[] = [];

export const supplierPayments: SupplierPayment[] = [];

export const capitalEntries: CapitalEntry[] = [];

export const businessProfile: BusinessProfile = {
  businessName: "Regaleria Shop",
  publicDomain: "regaleriashop.com",
  internalDomain: "sistema.regaleriashop.com",
  currency: "ARS",
  phone: "",
  address: "",
  receiptLegend: "Comprobante interno sin validez fiscal. Facturacion AFIP pendiente de decision.",
  backupSchedule: "Backup automatico diario de PostgreSQL y revision semanal de archivos."
};

export const categories = ["Mates y termos", "Deco", "Bazar", "Regalos personalizados", "Libreria", "Accesorios", "Sin categoria"];

export const rolePermissions: RolePermissions = {
  dueno: ["panel", "ventas", "stock", "compras", "clientes", "proveedores", "presupuestos", "pagos", "gastos", "capital", "catalogo", "web", "reportes", "sistema", "descuentos"],
  administrador: ["panel", "ventas", "stock", "compras", "clientes", "proveedores", "presupuestos", "pagos", "gastos", "catalogo", "web", "reportes", "sistema", "descuentos"],
  encargado: ["panel", "ventas", "stock", "compras", "clientes", "presupuestos", "pagos", "gastos", "catalogo", "web", "reportes", "descuentos"],
  cajero: ["panel", "ventas", "clientes", "presupuestos", "pagos"]
};

export const customers: Customer[] = [
  {
    id: "cust_claudia",
    name: "Claudia Gomez",
    phone: "3515550101",
    email: "claudia@example.com",
    note: "Compra regalos empresariales chicos.",
    createdAt: "2026-06-03T10:00:00.000Z",
    syncStatus: "sincronizado"
  },
  {
    id: "cust_empresa_norte",
    name: "Empresa Norte",
    phone: "3515550202",
    email: "compras@empresanorte.test",
    note: "Pide presupuestos por cantidad.",
    createdAt: "2026-06-03T10:15:00.000Z",
    syncStatus: "sincronizado"
  }
];

export const suppliers: Supplier[] = [
  {
    id: "sup_distribuidora_sur",
    name: "Distribuidora Sur",
    phone: "3515551001",
    email: "ventas@distribuidorasur.test",
    note: "Proveedor principal de mates y termos.",
    createdAt: "2026-06-03T09:00:00.000Z",
    syncStatus: "sincronizado"
  },
  {
    id: "sup_casa_aroma",
    name: "Casa Aroma",
    phone: "3515551002",
    email: "pedidos@casaaroma.test",
    note: "Velas, difusores y deco chica.",
    createdAt: "2026-06-03T09:05:00.000Z",
    syncStatus: "sincronizado"
  },
  {
    id: "sup_importados_centro",
    name: "Importados Centro",
    phone: "3515551003",
    email: "mayorista@importadoscentro.test",
    note: "Bazar y tazas con caja.",
    createdAt: "2026-06-03T09:10:00.000Z",
    syncStatus: "sincronizado"
  }
];
