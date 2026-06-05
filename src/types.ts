export type Role = "dueno" | "administrador" | "encargado" | "cajero";
export type SyncStatus = "sincronizado" | "pendiente" | "con_conflicto" | "fallo";
export type TransferStatus = "pendiente" | "confirmado" | "rechazado";
export type StockMovementType = "ingreso" | "venta" | "ajuste" | "devolucion" | "perdida_rotura";
export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta" | "otro";

export interface Variant {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  stock: number;
  lowStockAt: number;
  cost: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  supplier: string;
  description: string;
  publishable: boolean;
  imageUrl: string;
  imageUrls?: string[];
  variants: Variant[];
  syncStatus: SyncStatus;
}

export interface PublishUpdateInput {
  productId: string;
  publishable: boolean;
}

export interface ProductUpdateInput {
  productId: string;
  name: string;
  category: string;
  supplier: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  publishable: boolean;
}

export interface VariantUpdateInput {
  variantId: string;
  name: string;
  sku: string;
  barcode: string;
  lowStockAt: number;
  cost: number;
  price: number;
}

export interface NewProductInput {
  name: string;
  category: string;
  supplier: string;
  description: string;
  publishable: boolean;
  imageUrl: string;
  variant: {
    name: string;
    sku: string;
    barcode: string;
    stock: number;
    lowStockAt: number;
    cost: number;
    price: number;
  };
}

export interface StockAdjustmentInput {
  variantId: string;
  type: Exclude<StockMovementType, "venta">;
  quantity: number;
  reason: string;
}

export interface SaleLine {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  type: "rapida" | "detallada";
  shiftId?: string;
  customerName?: string;
  lines: SaleLine[];
  discount: number;
  paymentMethod: PaymentMethod;
  internalNote?: string;
  total: number;
  margin: number;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface SaleDraftInput {
  customerName?: string;
  lines: SaleLine[];
  discount: number;
  paymentMethod: PaymentMethod;
  internalNote?: string;
}

export interface Quote {
  id: string;
  number: string;
  customerName: string;
  lines: SaleLine[];
  total: number;
  status: "abierto" | "convertido" | "vencido";
  internalNote?: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface QuoteDraftInput {
  customerName: string;
  lines: SaleLine[];
  internalNote?: string;
}

export interface Transfer {
  id: string;
  relatedTo: "venta" | "presupuesto";
  relatedId: string;
  amount: number;
  sender: string;
  status: TransferStatus;
  note: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface TransferDraftInput {
  relatedTo: "venta" | "presupuesto";
  relatedId: string;
  amount: number;
  sender: string;
  note: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  vendor: string;
  note: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export type PurchaseDocumentType = "factura" | "remito" | "ticket" | "otro";

export interface PurchaseLine {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface PurchaseReceipt {
  id: string;
  number: string;
  documentType: PurchaseDocumentType;
  documentNumber: string;
  supplier: string;
  lines: PurchaseLine[];
  total: number;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface PurchaseReceiptDraftInput {
  documentType: PurchaseDocumentType;
  documentNumber: string;
  supplier: string;
  lines: PurchaseLine[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface CustomerDraftInput {
  name: string;
  phone: string;
  email: string;
  note: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface SupplierDraftInput {
  name: string;
  phone: string;
  email: string;
  note: string;
}

export interface OnlineOrder {
  id: string;
  number: string;
  customerName: string;
  customerContact: string;
  lines: SaleLine[];
  total: number;
  status: "nuevo" | "preparando" | "entregado" | "cancelado";
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface OnlineOrderDraftInput {
  customerName: string;
  customerContact: string;
  lines: SaleLine[];
}

export interface StockMovement {
  id: string;
  productId: string;
  variantId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface CashClosure {
  id: string;
  number: string;
  date: string;
  cashTotal: number;
  transferTotal: number;
  cardTotal: number;
  otherTotal: number;
  expensesTotal: number;
  note: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface CashShift {
  id: string;
  number: string;
  openedAt: string;
  openedBy: Role;
  initialCash: number;
  note: string;
  closedAt?: string;
  closedBy?: Role;
  declaredClosingCash?: number;
  expectedClosingCash?: number;
  closingNote?: string;
  syncStatus: SyncStatus;
}

export interface SupplierPayment {
  id: string;
  supplier: string;
  amount: number;
  note: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface BusinessProfile {
  businessName: string;
  publicDomain: string;
  internalDomain: string;
  currency: string;
  phone: string;
  address: string;
  receiptLegend: string;
  backupSchedule: string;
}

export type BusinessProfileInput = BusinessProfile;

export interface ImportProductRow {
  name: string;
  category: string;
  supplier: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
}

export type PermissionKey =
  | "panel"
  | "ventas"
  | "stock"
  | "compras"
  | "clientes"
  | "proveedores"
  | "presupuestos"
  | "pagos"
  | "gastos"
  | "catalogo"
  | "web"
  | "reportes"
  | "sistema"
  | "descuentos";

export type RolePermissions = Record<Role, PermissionKey[]>;
