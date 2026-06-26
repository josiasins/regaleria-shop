import {
  ArrowLeft,
  ArrowClockwise,
  Barcode,
  ChartLineUp,
  CheckCircle,
  ClockCounterClockwise,
  CreditCard,
  FileText,
  Gear,
  GlobeHemisphereWest,
  Heart,
  House,
  EnvelopeSimple,
  Keyboard,
  ListBullets,
  MagnifyingGlass,
  MinusCircle,
  Package,
  PencilSimple,
  PlusCircle,
  Printer,
  Receipt,
  ShoppingCartSimple,
  SquaresFour,
  Storefront,
  Trash,
  Truck,
  TrendUp,
  Users,
  Wallet
} from "@phosphor-icons/react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { analyzePurchaseWithOpenAi } from "./aiClient";
import { isCloudCatalogEnabled } from "./catalogCloud";
import { uploadProductImage } from "./fileStorage";
import { createReceiptPdf, formatMoney } from "./receipt";
import { canSeeFinancials, useStore } from "./store";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import type { CashShiftAuditUpdateInput, Customer, ImportProductRow, PaymentMethod, Product, ProductUpdateInput, PurchaseDocumentType, PurchaseLine, Role, SaleAuditUpdateInput, SaleLine, StockMovementType, Supplier } from "./types";
import type { Session } from "@supabase/supabase-js";

const sections = [
  { id: "panel", label: "Panel", icon: ChartLineUp },
  { id: "ventas", label: "Ventas", icon: ShoppingCartSimple },
  { id: "stock", label: "Stock", icon: Package },
  { id: "compras", label: "Compras", icon: Truck },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "proveedores", label: "Proveedores", icon: Truck },
  { id: "presupuestos", label: "Presupuestos", icon: FileText },
  { id: "pagos", label: "Transferencias", icon: CreditCard },
  { id: "gastos", label: "Gastos", icon: Wallet },
  { id: "catalogo", label: "Catalogo", icon: Storefront },
  { id: "web", label: "Web publica", icon: GlobeHemisphereWest },
  { id: "reportes", label: "Reportes", icon: ChartLineUp },
  { id: "sistema", label: "Configuracion", icon: Gear }
] as const;

type Section = (typeof sections)[number]["id"];
type StockPage = "control" | "alta" | "movimiento" | "variante" | "importacion" | "historial";
type SalesPage = "mostrador" | "turnos" | "recientes" | "auditoria" | "ayuda";
type PurchasePage = "factura" | "precarga" | "recientes" | "cuentas" | "pago";
type ContactPage = "lista" | "nuevo" | "editar" | "eliminados";
type QuotePage = "nuevo" | "lista";
type TransferPage = "cargar" | "comprobantes";
type ExpensePage = "cargar" | "recientes" | "resumen" | "cierre";
type SettingsPage = "roles" | "operativa" | "categorias" | "sincronizacion" | "atajos";

const internalAllowedEmails = String(import.meta.env.VITE_INTERNAL_ALLOWED_EMAILS || "josias.insfran66@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const sectionGroups: { title: string; ids: Section[] }[] = [
  { title: "Operacion", ids: ["panel", "ventas", "stock", "compras"] },
  { title: "Personas", ids: ["clientes", "proveedores"] },
  { title: "Finanzas", ids: ["presupuestos", "pagos", "gastos"] },
  { title: "Catalogo y web", ids: ["catalogo", "web"] },
  { title: "Analisis", ids: ["reportes"] },
  { title: "Configuracion", ids: ["sistema"] }
];

const roleLabels: Record<Role, string> = {
  dueno: "Dueño",
  administrador: "Administrador",
  encargado: "Encargado",
  cajero: "Cajero"
};

function toDateTimeLocal(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function BrandMark({ className = "brand-mark", label = "Regaleria Shop", src = "/brand/regaleria-shop-symbol.svg" }: { className?: string; label?: string; src?: string }) {
  return <img className={className} src={src} alt={label} />;
}

const allSectionIds = sections.map((section) => section.id);

export function App() {
  if (isPublicWebsite()) return <PublicSite />;

  return (
    <AuthGate>
      <InternalApp />
    </AuthGate>
  );
}

function useCatalogSync() {
  const initializeCatalog = useStore((state) => state.initializeCatalog);

  useEffect(() => {
    if (!isCloudCatalogEnabled()) return;
    void initializeCatalog();
    const refresh = window.setInterval(() => void initializeCatalog(), 10_000);
    return () => window.clearInterval(refresh);
  }, [initializeCatalog]);
}

function isPublicWebsite() {
  const hostname = window.location.hostname.toLowerCase();
  const publicDomain = String(import.meta.env.VITE_PUBLIC_DOMAIN || "regaleriashop.com").toLowerCase();
  return hostname === publicDomain || hostname === `www.${publicDomain}` || new URLSearchParams(window.location.search).get("preview") === "public";
}

function shouldRequireInternalLogin() {
  const hostname = window.location.hostname.toLowerCase();
  const internalDomain = String(import.meta.env.VITE_INTERNAL_DOMAIN || "sistema.regaleriashop.com").toLowerCase();
  return hostname === internalDomain || hostname.endsWith(".onrender.com");
}

function isAuthorizedInternalSession(session: Session | null) {
  if (!session) return false;
  const sessionEmail = session.user.email?.toLowerCase();
  return Boolean(sessionEmail && internalAllowedEmails.includes(sessionEmail));
}

function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(shouldRequireInternalLogin());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const requiresLogin = shouldRequireInternalLogin();

  useEffect(() => {
    if (!requiresLogin || !supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, [requiresLogin]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setMessage("Ingresando...");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setMessage(error ? "Email o contraseña incorrectos." : "");
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setMessage("Abriendo Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: "select_account"
        }
      }
    });
    if (error) setMessage("Google todavia no esta configurado en Supabase.");
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  if (!requiresLogin) return <>{children}</>;

  if (!isSupabaseConfigured) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <BrandMark />
          <h1>Sistema interno</h1>
          <p>Falta configurar Supabase para activar el ingreso seguro.</p>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <BrandMark />
          <h1>Sistema interno</h1>
          <p>Verificando acceso...</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-screen">
        <form className="auth-card" onSubmit={signIn}>
          <BrandMark />
          <span>Regaleria Shop</span>
          <h1>Sistema interno</h1>
          <p>Ingresá con una cuenta autorizada del negocio.</p>
          <button className="google-action" type="button" onClick={signInWithGoogle}>
            <GlobeHemisphereWest size={19} />
            Ingresar con Google
          </button>
          <div className="auth-divider"><span>o con email</span></div>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
          </label>
          <button className="primary-action full" type="submit">Ingresar</button>
          {message && <strong className="auth-message">{message}</strong>}
        </form>
      </main>
    );
  }

  if (!isAuthorizedInternalSession(session)) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <BrandMark />
          <span>Regaleria Shop</span>
          <h1>Cuenta no autorizada</h1>
          <p>El sistema interno solo acepta cuentas habilitadas por el dueño.</p>
          <strong className="auth-message">{session.user.email || "Cuenta sin email"}</strong>
          <button className="primary-action full" type="button" onClick={signOut}>Salir y elegir otra cuenta</button>
        </section>
      </main>
    );
  }

  return (
    <>
      <button className="auth-session-button" onClick={signOut}>Salir</button>
      {children}
    </>
  );
}

function PublicSite() {
  useCatalogSync();

  return (
    <main className="public-site">
      <PublicShop />
    </main>
  );
}

function InternalApp() {
  useCatalogSync();
  useEffect(() => {
    document.title = "Regaleria | Gestión";
  }, []);

  const [section, setSection] = useState<Section>("panel");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const role = useStore((state) => state.activeRole);
  const setRole = useStore((state) => state.setRole);
  const rolePermissions = useStore((state) => state.rolePermissions);
  const allowedSections = rolePermissions[role].filter((id): id is Section => allSectionIds.includes(id as Section));

  const navigate = (nextSection: Section) => {
    setSection(nextSection);
    setIsMobileNavOpen(false);
    if (nextSection !== "catalogo") setEditingProductId(null);
  };
  const toggleGroup = (title: string) => {
    setCollapsedGroups((current) => ({ ...current, [title]: !current[title] }));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F2" && allowedSections.includes("ventas")) {
        event.preventDefault();
        navigate("ventas");
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [allowedSections]);

  useEffect(() => {
    if (!allowedSections.includes(section)) setSection("panel");
  }, [allowedSections, section]);

  return (
    <div className="app-shell">
      <button className="mobile-menu-button" onClick={() => setIsMobileNavOpen(true)} aria-label="Abrir menu">
        <ListBullets size={22} />
        <span>Menu</span>
      </button>
      {isMobileNavOpen && <button className="mobile-nav-backdrop" onClick={() => setIsMobileNavOpen(false)} aria-label="Cerrar menu" />}
      <aside className={clsx("sidebar", isMobileNavOpen && "open")}>
        <div className="brand-lockup">
          <BrandMark className="brand-lockup-logo" src="/brand/Regaleria-shop-logo-white-costado.svg" />
          <button className="mobile-menu-close" onClick={() => setIsMobileNavOpen(false)} aria-label="Cerrar menu">
            <MinusCircle size={20} />
          </button>
        </div>
        <nav>
          {sectionGroups.map((group) => {
            const items = group.ids.map((id) => sections.find((item) => item.id === id)).filter((item): item is (typeof sections)[number] => Boolean(item && allowedSections.includes(item.id)));
            if (!items.length) return null;
            const isCollapsed = Boolean(collapsedGroups[group.title]);
            return (
              <div className={clsx("nav-group", isCollapsed && "collapsed")} key={group.title}>
                <button
                  className="nav-group-toggle"
                  onClick={() => toggleGroup(group.title)}
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? "Expandir grupo" : "Comprimir grupo"}
                  title={`${isCollapsed ? "Expandir" : "Comprimir"} ${group.title}`}
                >
                  <span>{group.title}</span>
                  {isCollapsed ? <PlusCircle size={15} /> : <MinusCircle size={15} />}
                </button>
                {!isCollapsed && (
                  <div className="nav-group-items">
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.id} className={clsx("nav-item", section === item.id && "active")} onClick={() => navigate(item.id)}>
                          <Icon size={20} weight="duotone" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="role-box">
          <label>
            Rol activo
            <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option value="dueno">Dueño</option>
              <option value="administrador">Administrador</option>
              <option value="encargado">Encargado</option>
              <option value="cajero">Cajero</option>
            </select>
          </label>
          <span>{roleLabels[role]}</span>
        </div>
      </aside>
      <main>
        <Header section={section} onNavigate={navigate} allowedSections={allowedSections} />
        {section === "panel" && <Dashboard />}
        {section === "ventas" && <Sales />}
        {section === "stock" && <Stock />}
        {section === "compras" && <Purchases />}
        {section === "clientes" && <Customers />}
        {section === "proveedores" && <Suppliers />}
        {section === "presupuestos" && <Quotes />}
        {section === "pagos" && <Transfers />}
        {section === "gastos" && <Expenses />}
        {section === "catalogo" && <Catalog editingProductId={editingProductId} onEditProduct={setEditingProductId} onBack={() => setEditingProductId(null)} />}
        {section === "web" && <PublicShop />}
        {section === "reportes" && <Reports />}
        {section === "sistema" && <System />}
      </main>
    </div>
  );
}

function Header({ section, onNavigate, allowedSections }: { section: Section; onNavigate: (section: Section) => void; allowedSections: Section[] }) {
  const markAllSynced = useStore((state) => state.markAllSynced);
  const { products, customers, suppliers, sales } = useStore();
  const [search, setSearch] = useState("");
  const pending = useStore((state) =>
    [
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
      ...state.cashShifts
    ].filter((item) => item.syncStatus !== "sincronizado").length
  );
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => markAllSynced(), 900);
    return () => window.clearTimeout(timer);
  }, [markAllSynced, pending]);
  const title = sections.find((item) => item.id === section)?.label ?? "Panel";
  const searchResults = search.trim()
    ? [
        ...products.map((product) => ({ label: product.name, meta: `${product.category} · ${product.supplier}`, section: "catalogo" as Section })),
        ...customers.map((customer) => ({ label: customer.name, meta: "Cliente", section: "clientes" as Section })),
        ...suppliers.map((supplier) => ({ label: supplier.name, meta: "Proveedor", section: "proveedores" as Section })),
        ...sales.map((sale) => ({ label: sale.receiptNumber, meta: sale.customerName ?? "Venta", section: "ventas" as Section }))
      ]
        .filter((item) => allowedSections.includes(item.section))
        .filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 6)
    : [];
  return (
    <header className="topbar">
      <div>
        <p>Plataforma online preparada para offline parcial</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <label className="global-search">
          <MagnifyingGlass size={17} />
          <input id="global-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, cliente, proveedor o venta" />
          {searchResults.length > 0 && (
            <div className="global-results">
              {searchResults.map((item) => (
                <button key={`${item.section}-${item.label}`} onClick={() => {
                  onNavigate(item.section);
                  setSearch("");
                }}>
                  <strong>{item.label}</strong>
                  <span>{item.meta}</span>
                </button>
              ))}
            </div>
          )}
        </label>
        <div className={clsx("sync-pill", pending ? "syncing" : "synced")}>
          <ArrowClockwise size={18} />
          {pending ? `Sincronizando ${pending} cambio${pending === 1 ? "" : "s"}` : "Todo actualizado"}
        </div>
      </div>
    </header>
  );
}

function Dashboard() {
  const { sales, expenses, products, transfers, onlineOrders, activeRole } = useStore();
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalMargin = sales.reduce((sum, sale) => sum + sale.margin, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const lowStock = products.flatMap((product) => product.variants.filter((variant) => variant.stock <= variant.lowStockAt).map((variant) => `${product.name} (${variant.name})`));
  const pendingTransfers = transfers.filter((transfer) => transfer.status === "pendiente");

  return (
    <section className="workspace">
      <div className="metric-grid">
        <Metric label="Ventas del periodo" value={formatMoney(totalSales)} icon={<Receipt size={24} />} />
        <Metric label="Margen estimado" value={canSeeFinancials(activeRole) ? formatMoney(totalMargin) : "Restringido"} icon={<TrendUp size={24} />} />
        <Metric label="Gastos cargados" value={canSeeFinancials(activeRole) ? formatMoney(totalExpenses) : "Restringido"} icon={<Wallet size={24} />} />
        <Metric label="Transferencias pendientes" value={String(pendingTransfers.length)} icon={<CreditCard size={24} />} />
        <Metric label="Pedidos web" value={String(onlineOrders.length)} icon={<GlobeHemisphereWest size={24} />} />
      </div>
      <div className="split">
        <Panel title="Decisiones sugeridas">
          <Decision tone="urgent" title="Reponer stock critico" text={lowStock.length ? lowStock.slice(0, 3).join(", ") : "No hay productos bajo minimo."} />
          <Decision tone="calm" title="Confirmar transferencias" text={`${pendingTransfers.length} comprobante(s) necesitan revision antes de cerrar caja.`} />
          <Decision tone="growth" title="Preparar catalogo online" text={`${products.filter((product) => product.publishable).length} productos ya estan marcados como publicables.`} />
        </Panel>
        <Panel title="Ultimas ventas">
          <DataList
            items={sales.slice(0, 5).map((sale) => ({
              title: sale.receiptNumber,
              meta: sale.customerName ?? sale.type,
              value: formatMoney(sale.total)
            }))}
          />
        </Panel>
      </div>
    </section>
  );
}

function Sales() {
  const products = useStore((state) => state.products);
  const customers = useStore((state) => state.customers);
  const sales = useStore((state) => state.sales);
  const cashShifts = useStore((state) => state.cashShifts);
  const salesAuditEntries = useStore((state) => state.salesAuditEntries);
  const activeRole = useStore((state) => state.activeRole);
  const rolePermissions = useStore((state) => state.rolePermissions);
  const addQuickSale = useStore((state) => state.addQuickSale);
  const addDetailedSale = useStore((state) => state.addDetailedSale);
  const openCashShift = useStore((state) => state.openCashShift);
  const closeCashShift = useStore((state) => state.closeCashShift);
  const updateSaleWithAudit = useStore((state) => state.updateSaleWithAudit);
  const deleteSaleWithAudit = useStore((state) => state.deleteSaleWithAudit);
  const restoreSaleWithAudit = useStore((state) => state.restoreSaleWithAudit);
  const updateShiftWithAudit = useStore((state) => state.updateShiftWithAudit);
  const deleteShiftWithAudit = useStore((state) => state.deleteShiftWithAudit);
  const restoreShiftWithAudit = useStore((state) => state.restoreShiftWithAudit);
  const canDiscount = rolePermissions[activeRole].includes("descuentos");
  const isOwner = activeRole === "dueno";
  const [salesPage, setSalesPage] = useState<SalesPage>("mostrador");
  const [variantId, setVariantId] = useState(products[0]?.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [initialCash, setInitialCash] = useState(0);
  const [shiftNote, setShiftNote] = useState("");
  const [declaredClosingCash, setDeclaredClosingCash] = useState(0);
  const [closingNote, setClosingNote] = useState("");
  const [customerChoice, setCustomerChoice] = useState("consumidor_final");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [detailVariantId, setDetailVariantId] = useState(products[0]?.variants[0]?.id ?? "");
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailDiscount, setDetailDiscount] = useState(0);
  const [detailPayment, setDetailPayment] = useState<PaymentMethod>("efectivo");
  const [detailNote, setDetailNote] = useState("");
  const [detailLines, setDetailLines] = useState<SaleLine[]>([]);
  const [auditSaleId, setAuditSaleId] = useState(sales[0]?.id ?? "");
  const [auditShiftId, setAuditShiftId] = useState(cashShifts[0]?.id ?? "");
  const [saleAuditDraft, setSaleAuditDraft] = useState<SaleAuditUpdateInput>({
    customerName: "",
    discount: 0,
    paymentMethod: "efectivo",
    internalNote: "",
    createdAt: ""
  });
  const [shiftAuditDraft, setShiftAuditDraft] = useState<CashShiftAuditUpdateInput>({
    openedAt: "",
    initialCash: 0,
    note: "",
    closedAt: "",
    declaredClosingCash: 0,
    closingNote: ""
  });
  const [auditPassword, setAuditPassword] = useState("");
  const [auditReason, setAuditReason] = useState("");
  const [auditMessage, setAuditMessage] = useState("");

  const selected = findProductVariant(products, variantId);
  const activeShift = cashShifts.find((shift) => !shift.closedAt);
  const displayedShift = activeShift ?? cashShifts[0];
  const shiftSales = displayedShift ? sales.filter((sale) => sale.shiftId === displayedShift.id) : [];
  const shiftCashSales = shiftSales.filter((sale) => sale.paymentMethod === "efectivo").reduce((sum, sale) => sum + sale.total, 0);
  const shiftTransferSales = shiftSales.filter((sale) => sale.paymentMethod === "transferencia").reduce((sum, sale) => sum + sale.total, 0);
  const shiftCardSales = shiftSales.filter((sale) => sale.paymentMethod === "tarjeta").reduce((sum, sale) => sum + sale.total, 0);
  const shiftOtherSales = shiftSales.filter((sale) => sale.paymentMethod === "otro").reduce((sum, sale) => sum + sale.total, 0);
  const expectedClosingCash = (displayedShift?.initialCash ?? 0) + shiftCashSales;
  const activeCustomers = customers.filter((customer) => !customer.deletedAt);
  const auditSale = sales.find((sale) => sale.id === auditSaleId);
  const auditShift = cashShifts.find((shift) => shift.id === auditShiftId);
  const deletedAuditEntries = salesAuditEntries.filter((entry) => entry.action === "eliminacion");

  useEffect(() => {
    if (!isOwner && salesPage === "auditoria") setSalesPage("mostrador");
  }, [isOwner, salesPage]);
  useEffect(() => {
    if (!sales.some((sale) => sale.id === auditSaleId)) setAuditSaleId(sales[0]?.id ?? "");
  }, [auditSaleId, sales]);
  useEffect(() => {
    if (!cashShifts.some((shift) => shift.id === auditShiftId)) setAuditShiftId(cashShifts[0]?.id ?? "");
  }, [auditShiftId, cashShifts]);
  useEffect(() => {
    if (!auditSale) return;
    setSaleAuditDraft({
      customerName: auditSale.customerName ?? "Consumidor final",
      discount: auditSale.discount,
      paymentMethod: auditSale.paymentMethod,
      internalNote: auditSale.internalNote ?? "",
      createdAt: toDateTimeLocal(auditSale.createdAt)
    });
  }, [auditSale?.id]);
  useEffect(() => {
    if (!auditShift) return;
    setShiftAuditDraft({
      openedAt: toDateTimeLocal(auditShift.openedAt),
      initialCash: auditShift.initialCash,
      note: auditShift.note,
      closedAt: toDateTimeLocal(auditShift.closedAt),
      declaredClosingCash: auditShift.declaredClosingCash ?? 0,
      closingNote: auditShift.closingNote ?? ""
    });
  }, [auditShift?.id]);

  const finishAuditAction = (ok: boolean, success: string) => {
    setAuditMessage(ok ? success : "No se pudo completar. Revisa rol, contraseña, motivo y datos.");
    if (ok) {
      setAuditPassword("");
      setAuditReason("");
    }
  };
  const hasAuditFields = () => {
    if (activeRole !== "dueno") {
      setAuditMessage("Solo el dueño puede anular, corregir o restaurar.");
      return false;
    }
    if (!auditPassword.trim()) {
      setAuditMessage("Falta la contraseña de auditoria del dueño.");
      return false;
    }
    if (auditReason.trim().length < 5) {
      setAuditMessage("Escribi un motivo de al menos 5 caracteres.");
      return false;
    }
    return true;
  };
  useEffect(() => {
    if (activeShift) setDeclaredClosingCash(activeShift.initialCash + shiftCashSales);
  }, [activeShift?.id, shiftCashSales]);
  const openShift = () => {
    const shift = openCashShift(initialCash, activeRole, shiftNote);
    if (shift) {
      setInitialCash(0);
      setShiftNote("");
      setDeclaredClosingCash(shift.initialCash);
      setSalesPage("mostrador");
    }
  };
  const closeShift = () => {
    if (!activeShift) return;
    const closed = closeCashShift(activeShift.id, declaredClosingCash, activeRole, closingNote);
    if (closed) {
      setClosingNote("");
      setDeclaredClosingCash(0);
      setSalesPage("recientes");
    }
  };
  const submit = () => {
    if (!activeShift) return;
    const sale = addQuickSale(variantId, quantity, paymentMethod, activeShift.id);
    if (sale) setSalesPage("recientes");
  };
  const detailSelected = findProductVariant(products, detailVariantId);
  const detailTotal = saleLineTotal(detailLines) - detailDiscount;
  const addDetailLine = () => {
    if (!detailSelected || detailQuantity < 1 || detailSelected.variant.stock < detailQuantity) return;
    setDetailLines((current) => mergeLine(current, buildUiSaleLine(detailSelected.product, detailSelected.variant, detailQuantity)));
  };
  const submitDetailedSale = () => {
    const customerName = resolveCustomerName(activeCustomers, customerChoice, newCustomerName);
    const sale = addDetailedSale({
      shiftId: activeShift?.id ?? "",
      customerName,
      lines: detailLines,
      discount: detailDiscount,
      paymentMethod: detailPayment,
      internalNote: detailNote
    });
    if (sale) {
      setCustomerChoice("consumidor_final");
      setNewCustomerName("");
      setDetailLines([]);
      setDetailDiscount(0);
      setDetailNote("");
      setSalesPage("recientes");
    }
  };
  const saveSaleAudit = () => {
    if (!auditSale) return;
    if (!hasAuditFields()) return;
    finishAuditAction(
      updateSaleWithAudit(
        auditSale.id,
        { ...saleAuditDraft, createdAt: fromDateTimeLocal(saleAuditDraft.createdAt, auditSale.createdAt) },
        auditPassword,
        auditReason,
        activeRole
      ),
      "Venta corregida y registrada en auditoria."
    );
  };
  const removeSaleAudit = () => {
    if (!auditSale) return;
    if (!hasAuditFields()) return;
    finishAuditAction(deleteSaleWithAudit(auditSale.id, auditPassword, auditReason, activeRole), "Venta anulada, stock devuelto e historial guardado.");
  };
  const saveShiftAudit = () => {
    if (!auditShift) return;
    if (!hasAuditFields()) return;
    finishAuditAction(
      updateShiftWithAudit(
        auditShift.id,
        {
          ...shiftAuditDraft,
          openedAt: fromDateTimeLocal(shiftAuditDraft.openedAt, auditShift.openedAt),
          closedAt: shiftAuditDraft.closedAt ? fromDateTimeLocal(shiftAuditDraft.closedAt, auditShift.closedAt ?? auditShift.openedAt) : undefined
        },
        auditPassword,
        auditReason,
        activeRole
      ),
      "Turno corregido y registrado en auditoria."
    );
  };
  const removeShiftAudit = () => {
    if (!auditShift) return;
    if (!hasAuditFields()) return;
    finishAuditAction(deleteShiftWithAudit(auditShift.id, auditPassword, auditReason, activeRole), "Turno quitado del listado operativo e historial guardado.");
  };
  const restoreAuditEntry = (entryId: string, entityType: "venta" | "turno") => {
    if (!hasAuditFields()) return;
    const ok = entityType === "venta"
      ? restoreSaleWithAudit(entryId, auditPassword, auditReason, activeRole)
      : restoreShiftWithAudit(entryId, auditPassword, auditReason, activeRole);
    finishAuditAction(ok, entityType === "venta" ? "Venta restaurada y stock aplicado nuevamente." : "Turno restaurado.");
  };
  const salesTabs: { id: SalesPage; label: string; icon: typeof Receipt }[] = [
    { id: "mostrador", label: "Mostrador", icon: ShoppingCartSimple },
    { id: "turnos", label: "Turnos", icon: Wallet },
    { id: "recientes", label: "Ventas del turno", icon: ClockCounterClockwise },
    ...(isOwner ? [{ id: "auditoria" as const, label: "Auditoria", icon: PencilSimple }] : []),
    { id: "ayuda", label: "Ayuda", icon: Keyboard }
  ];

  return (
    <section className="workspace">
      <div className="sales-workspace">
        <div className="sales-topbar" aria-label="Secciones de ventas">
          {salesTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={clsx("sales-tab", salesPage === tab.id && "active")} onClick={() => setSalesPage(tab.id)}>
                <Icon size={18} weight="duotone" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <Panel title="Estado de turno">
          <div className="shift-strip">
            <div>
              <span>{activeShift ? activeShift.number : displayedShift ? `${displayedShift.number} cerrado` : "Turno sin abrir"}</span>
              <strong>{activeShift ? `Efectivo inicial ${formatMoney(activeShift.initialCash)}` : "Abrir turno antes de vender"}</strong>
            </div>
            <div>
              <span>Venta en efectivo del turno</span>
              <strong>{formatMoney(shiftCashSales)}</strong>
            </div>
            <button className="secondary-action" onClick={() => setSalesPage("turnos")}>
              <Wallet size={18} /> {activeShift ? "Ver turno" : "Ir a turno"}
            </button>
          </div>
        </Panel>
      {salesPage === "mostrador" && (
      <div className="sales-stack">
          {!activeShift && (
            <Panel title="Turno requerido">
              <div className="empty-lines">No se puede vender sin un turno abierto. Abrilo desde Turnos y declara el efectivo inicial.</div>
            </Panel>
          )}
        <div className="sales-register-grid">
          <Panel title="Caja rapida">
            <div className="form-grid">
              <ProductVariantPicker label="Producto" searchLabel="Buscar producto" products={products} variantId={variantId} onChange={setVariantId} />
              <label>
                Cantidad
                <input type="number" min={1} max={selected?.variant.stock ?? 1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
              </label>
              <label>
                Medio de pago
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
            </div>
            <div className="checkout-row">
              <div>
                <span>Total estimado</span>
                <strong>{formatMoney((selected?.variant.price ?? 0) * quantity)}</strong>
              </div>
              <button className="primary-action" onClick={submit} disabled={!activeShift || !selected || selected.variant.stock < quantity}>
                <ShoppingCartSimple size={19} /> Cobrar
              </button>
            </div>
          </Panel>
          <Panel title="Venta detallada">
            <div className="form-grid two">
              <label>
                Cliente
                <select value={customerChoice} onChange={(event) => setCustomerChoice(event.target.value)}>
                  <option value="consumidor_final">Consumidor final</option>
                  {activeCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                  <option value="nuevo">Agregar cliente rapido</option>
                </select>
              </label>
              <label>
                Medio de pago
                <select value={detailPayment} onChange={(event) => setDetailPayment(event.target.value as PaymentMethod)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
            </div>
            {customerChoice === "nuevo" && (
              <label>
                Nuevo cliente
                <input value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} placeholder="Nombre del cliente" />
              </label>
            )}
            <div className="line-builder">
              <ProductVariantPicker label="Producto" searchLabel="Buscar producto detallado" products={products} variantId={detailVariantId} onChange={setDetailVariantId} />
              <label>
                Cant.
                <input type="number" min={1} value={detailQuantity} onChange={(event) => setDetailQuantity(Number(event.target.value))} />
              </label>
              <button className="secondary-action" onClick={addDetailLine} disabled={!detailSelected || detailSelected.variant.stock < detailQuantity}>
                <PlusCircle size={18} /> Agregar
              </button>
            </div>
            <CartLines lines={detailLines} onRemove={(variant) => setDetailLines((current) => current.filter((line) => line.variantId !== variant))} />
            <label>
              Nota interna
              <input value={detailNote} onChange={(event) => setDetailNote(event.target.value)} placeholder="Dato para el equipo, no sale en comprobante" />
            </label>
            <div className="checkout-row">
              <label>
                Descuento
                <input type="number" min={0} value={detailDiscount} disabled={!canDiscount} onChange={(event) => setDetailDiscount(Number(event.target.value))} />
              </label>
              <div>
                <span>Total final</span>
                <strong>{formatMoney(Math.max(detailTotal, 0))}</strong>
              </div>
              <button className="primary-action" onClick={submitDetailedSale} disabled={!activeShift || !detailLines.length || detailDiscount > saleLineTotal(detailLines)}>
                <Receipt size={19} /> Cerrar venta
              </button>
            </div>
          </Panel>
        </div>
      </div>
      )}
      {salesPage === "turnos" && (
        <div className="sales-turns-grid">
          <div className="sales-stack">
            <Panel title="Abrir turno de caja">
              <div className="form-grid one compact">
                <label>
                  Efectivo inicial
                  <input type="number" min={0} value={initialCash} onChange={(event) => setInitialCash(Number(event.target.value))} />
                </label>
                <label>
                  Nota del turno
                  <input value={shiftNote} onChange={(event) => setShiftNote(event.target.value)} placeholder="Responsable, caja fisica, observaciones" />
                </label>
                <button className="primary-action" onClick={openShift} disabled={initialCash < 0 || Boolean(activeShift)}>
                  <Wallet size={19} /> {activeShift ? "Turno abierto" : "Abrir turno"}
                </button>
                <span className="muted-text">Este turno es operativo de mostrador. Caja central y tesoreria se controlan aparte.</span>
              </div>
            </Panel>
            <Panel title="Cerrar turno">
              <div className="form-grid one compact">
                <label>
                  Efectivo contado al cierre
                  <input type="number" min={0} value={declaredClosingCash} onChange={(event) => setDeclaredClosingCash(Number(event.target.value))} disabled={!activeShift} />
                </label>
                <label>
                  Nota de cierre
                  <input value={closingNote} onChange={(event) => setClosingNote(event.target.value)} placeholder="Diferencias, responsable, observaciones" disabled={!activeShift} />
                </label>
                <button className="primary-action" onClick={closeShift} disabled={!activeShift || declaredClosingCash < 0}>
                  <Receipt size={18} /> Cerrar turno
                </button>
                <span className="muted-text">Esperado: {formatMoney(expectedClosingCash)}. Diferencia: {formatMoney(declaredClosingCash - expectedClosingCash)}.</span>
              </div>
            </Panel>
          </div>
          <div className="sales-stack">
            <Panel title="Turno actual">
              <DataList
                items={[
                  { title: displayedShift?.number ?? "Sin turno abierto", meta: displayedShift ? `${displayedShift.closedAt ? "Cerrado" : "Abierto"} por ${roleLabels[displayedShift.openedBy]} · ${formatDistanceToNow(new Date(displayedShift.openedAt), { addSuffix: true, locale: es })}` : "Todavia no se declaro efectivo inicial.", value: displayedShift ? formatMoney(displayedShift.initialCash) : "$0" },
                  { title: "Efectivo vendido", meta: `${shiftSales.length} venta(s) del turno`, value: formatMoney(shiftCashSales) },
                  { title: "Efectivo esperado", meta: "Inicial declarado + ventas en efectivo.", value: formatMoney(expectedClosingCash) }
                ]}
              />
            </Panel>
            <Panel title="Historial de turnos">
              <DataList
                items={cashShifts.slice(0, 8).map((shift) => ({
                  title: shift.number,
                  meta: `${shift.closedAt ? "Cerrado" : "Abierto"} · ${new Date(shift.openedAt).toLocaleString("es-AR")} · ${shift.note || "Sin nota"}`,
                  value: shift.closedAt ? formatMoney(shift.declaredClosingCash ?? 0) : formatMoney(shift.initialCash)
                }))}
              />
            </Panel>
          </div>
        </div>
      )}
      {salesPage === "auditoria" && isOwner && (
        <div className="audit-workspace">
          <Panel title="Clave y motivo de auditoria">
            <div className="form-grid three">
              <label>
                Contraseña de dueño
                <input type="password" value={auditPassword} onChange={(event) => setAuditPassword(event.target.value)} placeholder="Requerida para corregir o restaurar" />
              </label>
              <label>
                Motivo
                <input value={auditReason} onChange={(event) => setAuditReason(event.target.value)} placeholder="Ej: error de carga, control de caja" />
              </label>
              <div className="audit-status" role="status">
                {auditMessage || "Cada accion queda registrada con fecha, rol, antes y despues."}
              </div>
            </div>
          </Panel>
          <div className="audit-grid">
            <Panel title="Auditar venta">
              <div className="form-grid one compact">
                <label>
                  Venta
                  <select value={auditSaleId} onChange={(event) => setAuditSaleId(event.target.value)}>
                    {sales.map((sale) => (
                      <option key={sale.id} value={sale.id}>
                        {sale.receiptNumber} · {sale.customerName ?? "Consumidor final"} · {formatMoney(sale.total)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid two">
                  <label>
                    Cliente
                    <input value={saleAuditDraft.customerName} onChange={(event) => setSaleAuditDraft((current) => ({ ...current, customerName: event.target.value }))} />
                  </label>
                  <label>
                    Fecha y hora
                    <input type="datetime-local" value={saleAuditDraft.createdAt} onChange={(event) => setSaleAuditDraft((current) => ({ ...current, createdAt: event.target.value }))} />
                  </label>
                </div>
                <div className="form-grid two">
                  <label>
                    Medio de pago
                    <select value={saleAuditDraft.paymentMethod} onChange={(event) => setSaleAuditDraft((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))}>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="otro">Otro</option>
                    </select>
                  </label>
                  <label>
                    Descuento
                    <input type="number" min={0} value={saleAuditDraft.discount} onChange={(event) => setSaleAuditDraft((current) => ({ ...current, discount: Number(event.target.value) }))} />
                  </label>
                </div>
                <label>
                  Nota interna
                  <input value={saleAuditDraft.internalNote} onChange={(event) => setSaleAuditDraft((current) => ({ ...current, internalNote: event.target.value }))} />
                </label>
                {auditSale && (
                  <div className="audit-readonly">
                    <span>{auditSale.lines.map((line) => `${line.name} x${line.quantity}`).join(" · ")}</span>
                    <strong>Total actual {formatMoney(auditSale.total)}</strong>
                  </div>
                )}
                <div className="audit-actions">
                  <button className="primary-action" onClick={saveSaleAudit} disabled={!auditSale}>
                    <CheckCircle size={18} /> Guardar correccion
                  </button>
                  <button className="secondary-action danger" onClick={removeSaleAudit} disabled={!auditSale}>
                    <Trash size={18} /> Anular venta
                  </button>
                </div>
                {auditMessage && <span className="audit-inline-message">{auditMessage}</span>}
              </div>
            </Panel>
            <Panel title="Auditar turno">
              <div className="form-grid one compact">
                <label>
                  Turno
                  <select value={auditShiftId} onChange={(event) => setAuditShiftId(event.target.value)}>
                    {cashShifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.number} · {shift.closedAt ? "Cerrado" : "Abierto"} · {formatMoney(shift.initialCash)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid two">
                  <label>
                    Apertura
                    <input type="datetime-local" value={shiftAuditDraft.openedAt} onChange={(event) => setShiftAuditDraft((current) => ({ ...current, openedAt: event.target.value }))} />
                  </label>
                  <label>
                    Efectivo inicial
                    <input type="number" min={0} value={shiftAuditDraft.initialCash} onChange={(event) => setShiftAuditDraft((current) => ({ ...current, initialCash: Number(event.target.value) }))} />
                  </label>
                </div>
                <label>
                  Nota de apertura
                  <input value={shiftAuditDraft.note} onChange={(event) => setShiftAuditDraft((current) => ({ ...current, note: event.target.value }))} />
                </label>
                <div className="form-grid two">
                  <label>
                    Cierre
                    <input type="datetime-local" value={shiftAuditDraft.closedAt} onChange={(event) => setShiftAuditDraft((current) => ({ ...current, closedAt: event.target.value }))} />
                  </label>
                  <label>
                    Efectivo contado
                    <input type="number" min={0} value={shiftAuditDraft.declaredClosingCash ?? 0} onChange={(event) => setShiftAuditDraft((current) => ({ ...current, declaredClosingCash: Number(event.target.value) }))} />
                  </label>
                </div>
                <label>
                  Nota de cierre
                  <input value={shiftAuditDraft.closingNote ?? ""} onChange={(event) => setShiftAuditDraft((current) => ({ ...current, closingNote: event.target.value }))} />
                </label>
                <div className="audit-actions">
                  <button className="primary-action" onClick={saveShiftAudit} disabled={!auditShift}>
                    <CheckCircle size={18} /> Guardar turno
                  </button>
                  <button className="secondary-action danger" onClick={removeShiftAudit} disabled={!auditShift}>
                    <Trash size={18} /> Borrar turno
                  </button>
                </div>
              </div>
            </Panel>
          </div>
          <Panel title="Historial de auditoria y restauracion">
            <div className="table audit-table">
              {salesAuditEntries.map((entry) => (
                <div className="table-row audit-row" key={entry.id}>
                  <div>
                    <strong>{entry.entityNumber} · {entry.entityType} · {entry.action}</strong>
                    <span>{new Date(entry.createdAt).toLocaleString("es-AR")} · {roleLabels[entry.performedBy]} · {entry.reason}</span>
                  </div>
                  <span>{entry.before ? "Con respaldo" : "Sin respaldo"}</span>
                  <strong>{entry.after ? "Actualizado" : "Archivado"}</strong>
                  {deletedAuditEntries.some((deleted) => deleted.id === entry.id) ? (
                    <button className="secondary-action" onClick={() => restoreAuditEntry(entry.id, entry.entityType)}>
                      <ArrowClockwise size={18} /> Restaurar
                    </button>
                  ) : (
                    <span className="muted-text">Registrado</span>
                  )}
                </div>
              ))}
              {!salesAuditEntries.length && <div className="empty-lines">Todavia no hay correcciones, anulaciones ni restauraciones registradas.</div>}
            </div>
          </Panel>
        </div>
      )}
      {salesPage === "ayuda" && (
        <Panel title="Ayuda de mostrador">
          <DataList
            items={[
              { title: "Buscar producto", meta: "Filtra por nombre, SKU o codigo de barra antes de cobrar.", value: "Caja" },
              { title: "Turno separado", meta: "El efectivo inicial del turno no es tesoreria ni caja central.", value: activeShift ? "Abierto" : "Pendiente" },
              { title: "Ventas del turno", meta: "La vista de ventas muestra solo lo registrado dentro del turno activo o seleccionado.", value: String(shiftSales.length) },
              { title: "F2", meta: "Vuelve directo a Ventas desde cualquier pantalla.", value: "Atajo" },
              { title: "Ctrl/Cmd + K", meta: "Abre la busqueda global del sistema.", value: "Atajo" }
            ]}
          />
        </Panel>
      )}
      {salesPage === "recientes" && (
        <Panel title={displayedShift ? `Ventas del turno ${displayedShift.number}` : "Ventas del turno"}>
          <div className="shift-summary">
            <span>Efectivo {formatMoney(shiftCashSales)}</span>
            <span>Transferencia {formatMoney(shiftTransferSales)}</span>
            <span>Tarjeta {formatMoney(shiftCardSales)}</span>
            <span>Otro {formatMoney(shiftOtherSales)}</span>
            <strong>Esperado en efectivo {formatMoney(expectedClosingCash)}</strong>
          </div>
          <div className="table">
            {shiftSales.map((sale) => (
              <div className="table-row" key={sale.id}>
                <div>
                  <strong>{sale.receiptNumber}</strong>
                  <span>{[sale.customerName ?? "Consumidor final", new Date(sale.createdAt).toLocaleString("es-AR"), sale.lines.map((line) => line.name).join(", ")].join(" · ")}</span>
                  {sale.internalNote && <span>{sale.internalNote}</span>}
                </div>
                <span>{sale.paymentMethod}</span>
                <strong>{formatMoney(sale.total)}</strong>
                <button className="icon-button" title="Imprimir PDF" onClick={() => createReceiptPdf(sale)}>
                  <Printer size={18} />
                </button>
              </div>
            ))}
            {!shiftSales.length && <div className="empty-lines">Todavia no hay ventas registradas en este turno.</div>}
          </div>
        </Panel>
      )}
      </div>
    </section>
  );
}

function ProductVariantPicker({ label, searchLabel, products, variantId, onChange }: { label: string; searchLabel: string; products: Product[]; variantId: string; onChange: (variantId: string) => void }) {
  const [query, setQuery] = useState("");
  const options = products.flatMap((product) =>
    product.variants.map((variant) => ({
      product,
      variant,
      label: `${product.name} - ${variant.name}`,
      search: `${product.name} ${product.category} ${product.supplier} ${variant.name} ${variant.sku} ${variant.barcode}`.toLowerCase()
    }))
  );
  const filtered = options.filter((option) => option.search.includes(query.trim().toLowerCase())).slice(0, 30);
  const visibleOptions = filtered.length ? filtered : options.slice(0, 30);
  const selectedStillVisible = visibleOptions.some((option) => option.variant.id === variantId);

  return (
    <div className="product-picker">
      <label>
        {searchLabel}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, SKU o codigo" />
      </label>
      <label>
        {label}
        <select value={selectedStillVisible ? variantId : ""} onChange={(event) => onChange(event.target.value)}>
          {!selectedStillVisible && <option value="">Elegir producto</option>}
          {visibleOptions.map(({ product, variant, label }) => (
            <option key={variant.id} value={variant.id}>
              {label} · {variant.sku} · Stock {variant.stock}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Stock() {
  const products = useStore((state) => state.products);
  const categories = useStore((state) => state.categories);
  const movements = useStore((state) => state.movements);
  const addProduct = useStore((state) => state.addProduct);
  const addCategory = useStore((state) => state.addCategory);
  const updateVariant = useStore((state) => state.updateVariant);
  const importProducts = useStore((state) => state.importProducts);
  const adjustStock = useStore((state) => state.adjustStock);
  const addVariant = useStore((state) => state.addVariant);
  const activeRole = useStore((state) => state.activeRole);
  const canSeeSupplier = activeRole === "dueno" || activeRole === "administrador";
  const [stockPage, setStockPage] = useState<StockPage>("control");
  const [query, setQuery] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    supplier: "",
    description: "",
    publishable: true,
    imageUrl: "",
    imageUrls: [] as string[],
    seoTitle: "",
    seoDescription: "",
    variantName: "Unico",
    sku: "",
    barcode: "",
    stock: 1,
    lowStockAt: 3,
    cost: 0,
    price: 0
  });
  const [movement, setMovement] = useState({
    variantId: products[0]?.variants[0]?.id ?? "",
    type: "ingreso" as Exclude<StockMovementType, "venta">,
    quantity: 1,
    reason: ""
  });
  const [variantDraftId, setVariantDraftId] = useState(products[0]?.variants[0]?.id ?? "");
  const variantDraftFound = products.flatMap((product) => product.variants).find((variant) => variant.id === variantDraftId);
  const [variantDraft, setVariantDraft] = useState({
    name: variantDraftFound?.name ?? "",
    sku: variantDraftFound?.sku ?? "",
    barcode: variantDraftFound?.barcode ?? "",
    lowStockAt: variantDraftFound?.lowStockAt ?? 0,
    cost: variantDraftFound?.cost ?? 0,
    price: variantDraftFound?.price ?? 0
  });
  const [importText, setImportText] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [productSaveStatus, setProductSaveStatus] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newProductImageStatus, setNewProductImageStatus] = useState("");
  const [isUploadingNewProductImages, setIsUploadingNewProductImages] = useState(false);
  const [variantMode, setVariantMode] = useState<"editar" | "crear">("editar");
  const [newVariant, setNewVariant] = useState({
    productId: products[0]?.id ?? "",
    name: "",
    sku: "",
    barcode: "",
    stock: 0,
    lowStockAt: 3,
    cost: 0,
    price: 0
  });
  const [variantStatus, setVariantStatus] = useState("");

  useEffect(() => {
    const found = products.flatMap((product) => product.variants).find((variant) => variant.id === variantDraftId);
    if (!found) return;
    setVariantDraft({
      name: found.name,
      sku: found.sku,
      barcode: found.barcode,
      lowStockAt: found.lowStockAt,
      cost: found.cost,
      price: found.price
    });
  }, [products, variantDraftId]);

  const filteredProducts = products.filter((product) => {
    const value = query.trim().toLowerCase();
    if (!value) return true;
    return (
      product.name.toLowerCase().includes(value) ||
      product.category.toLowerCase().includes(value) ||
      product.supplier.toLowerCase().includes(value) ||
      product.variants.some((variant) =>
        [variant.name, variant.sku, variant.barcode].some((field) => field.toLowerCase().includes(value))
      )
    );
  });

  const submitProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.sku.trim() || newProduct.price <= 0) return;
    const resolvedCategory = newProduct.category === "__new" ? newCategoryName.trim() : newProduct.category;
    if (newProduct.category === "__new" && !resolvedCategory) {
      setProductSaveStatus("Escribi el nombre de la nueva categoria.");
      return;
    }
    if (resolvedCategory) addCategory(resolvedCategory);
    setProductSaveStatus("Guardando en la nube...");
    const savedProduct = await addProduct({
      name: newProduct.name,
      category: resolvedCategory || "Sin categoria",
      supplier: newProduct.supplier || "Sin proveedor",
      description: newProduct.description,
      publishable: newProduct.publishable,
      imageUrl: newProduct.imageUrl,
      imageUrls: newProduct.imageUrls,
      seoTitle: newProduct.seoTitle,
      seoDescription: newProduct.seoDescription,
      slug: slugify(newProduct.name),
      variant: {
        name: newProduct.variantName || "Unico",
        sku: newProduct.sku,
        barcode: newProduct.barcode,
        stock: newProduct.stock,
        lowStockAt: newProduct.lowStockAt,
        cost: newProduct.cost,
        price: newProduct.price
      }
    });
    if (!savedProduct) {
      setProductSaveStatus("No se pudo guardar. Revisa la conexion e intenta nuevamente.");
      return;
    }
    setProductSaveStatus("Producto guardado y sincronizado.");
    setNewCategoryName("");
    setNewProduct({
      name: "",
      category: "",
      supplier: "",
      description: "",
      publishable: true,
      imageUrl: "",
      imageUrls: [],
      seoTitle: "",
      seoDescription: "",
      variantName: "Unico",
      sku: "",
      barcode: "",
      stock: 1,
      lowStockAt: 3,
      cost: 0,
      price: 0
    });
    setStockPage("control");
  };
  const uploadNewProductPhotos = async (files?: FileList | null) => {
    if (!files?.length) return;
    setIsUploadingNewProductImages(true);
    setNewProductImageStatus(`Subiendo ${files.length} imagen(es)...`);
    const uploaded: string[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        uploaded.push(await uploadProductImage(`draft-${slugify(newProduct.name || "producto")}`, newProduct.name || "producto", file));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `No se pudo subir ${file.name}.`);
      }
    }
    if (uploaded.length) {
      setNewProduct((current) => ({
        ...current,
        imageUrl: current.imageUrl || uploaded[0],
        imageUrls: [...current.imageUrls, ...uploaded]
      }));
    }
    setNewProductImageStatus(errors.length ? `${uploaded.length} cargada(s). ${errors[0]}` : `${uploaded.length} imagen(es) guardada(s) en la nube.`);
    setIsUploadingNewProductImages(false);
  };

  const submitMovement = () => {
    const result = adjustStock(movement);
    if (result) {
      setMovement((current) => ({ ...current, quantity: 1, reason: "" }));
      setStockPage("historial");
    }
  };
  const submitVariant = () => updateVariant({ variantId: variantDraftId, ...variantDraft });
  const submitNewVariant = async () => {
    setVariantStatus("Guardando variante...");
    const saved = await addVariant(newVariant);
    setVariantStatus(saved ? "Variante agregada y sincronizada." : "No se pudo agregar. Revisa el SKU y los datos.");
    if (saved) {
      setNewVariant((current) => ({ ...current, name: "", sku: "", barcode: "", stock: 0, cost: 0, price: 0 }));
    }
  };
  const submitImport = () => {
    const count = importProducts(parseImportRows(importText));
    setImportedCount(count);
    if (count) {
      setImportText("");
      setStockPage("control");
    }
  };
  const stockTabs: { id: StockPage; label: string; icon: typeof Package }[] = [
    { id: "control", label: "Control de stock", icon: Package },
    { id: "alta", label: "Alta de producto", icon: PlusCircle },
    { id: "movimiento", label: "Movimiento", icon: MinusCircle },
    { id: "variante", label: "Variante", icon: PencilSimple },
    { id: "importacion", label: "Importacion", icon: ListBullets },
    { id: "historial", label: "Historial", icon: ClockCounterClockwise }
  ];

  return (
    <section className="workspace">
      <div className="stock-workspace">
        <div className="stock-topbar" aria-label="Secciones de stock">
          {stockTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={clsx("stock-tab", stockPage === tab.id && "active")} onClick={() => setStockPage(tab.id)}>
                <Icon size={18} weight="duotone" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {stockPage === "control" && (
        <Panel title="Control de stock">
          <label className="search-field">
            <MagnifyingGlass size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por producto, SKU o codigo" />
          </label>
          <div className="stock-list">
            {filteredProducts.map((product) => (
              <article className="stock-item" key={product.id}>
                <img src={product.imageUrl} alt="" onError={(event) => (event.currentTarget.style.visibility = "hidden")} />
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.category}{canSeeSupplier ? ` · ${product.supplier}` : ""}</span>
                  <div className="variant-chips">
                    {product.variants.map((variant) => (
                      <span className={clsx("chip", variant.stock <= variant.lowStockAt && "warning")} key={variant.id}>
                        <Barcode size={14} /> {variant.name}: {variant.stock} · {variant.sku}
                      </span>
                    ))}
                  </div>
                </div>
                <Status status={product.syncStatus} />
              </article>
            ))}
          </div>
        </Panel>
        )}
        {stockPage === "alta" && (
          <Panel title="Alta de producto">
            <div className="form-grid one compact">
              <label>
                Producto
                <input value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} placeholder="Ej: Llavero personalizado" />
              </label>
              <div className={clsx("form-grid", canSeeSupplier ? "two" : "one")}>
                <label>
                  Categoria
                  <select value={newProduct.category} onChange={(event) => setNewProduct({ ...newProduct, category: event.target.value })}>
                    <option value="">Sin categoria</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                    <option value="__new">Agregar nueva categoria</option>
                  </select>
                </label>
                {newProduct.category === "__new" && (
                  <label>
                    Nueva categoria
                    <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Ej: Marroquineria" />
                  </label>
                )}
                {canSeeSupplier && <label>
                  Proveedor
                  <input value={newProduct.supplier} onChange={(event) => setNewProduct({ ...newProduct, supplier: event.target.value })} placeholder="Proveedor" />
                </label>}
              </div>
              <div className="product-photo-uploader">
                <label className="secondary-action">
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => uploadNewProductPhotos(event.target.files)} />
                  <PlusCircle size={18} /> Agregar fotos
                </label>
                <span className="muted-text">{newProductImageStatus || "Podés seleccionar varias imágenes JPG, PNG o WebP."}</span>
                {newProduct.imageUrls.length > 0 && (
                  <div className="new-product-photo-grid">
                    {newProduct.imageUrls.map((url, index) => (
                      <div key={url}>
                        <img src={url} alt={`Foto ${index + 1}`} />
                        <button type="button" title="Quitar foto" onClick={() => setNewProduct((current) => {
                          const next = current.imageUrls.filter((item) => item !== url);
                          return { ...current, imageUrls: next, imageUrl: next[0] ?? "" };
                        })}><Trash size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <label>
                Descripcion publicable
                <input value={newProduct.description} onChange={(event) => setNewProduct({ ...newProduct, description: event.target.value })} placeholder="Texto corto para catalogo" />
              </label>
              <SeoGuidance
                name={newProduct.name}
                description={newProduct.description}
                seoTitle={newProduct.seoTitle}
                seoDescription={newProduct.seoDescription}
                onTitleChange={(seoTitle) => setNewProduct({ ...newProduct, seoTitle })}
                onDescriptionChange={(seoDescription) => setNewProduct({ ...newProduct, seoDescription })}
              />
              <div className="form-grid two">
                <label>
                  Variante
                  <input value={newProduct.variantName} onChange={(event) => setNewProduct({ ...newProduct, variantName: event.target.value })} />
                </label>
                <label>
                  SKU
                  <input value={newProduct.sku} onChange={(event) => setNewProduct({ ...newProduct, sku: event.target.value })} placeholder="SKU interno" />
                </label>
              </div>
              <label>
                Codigo de barra
                <input value={newProduct.barcode} onChange={(event) => setNewProduct({ ...newProduct, barcode: event.target.value })} placeholder="Opcional" />
              </label>
              <div className="form-grid four">
                <label>
                  Stock
                  <input type="number" min={0} value={newProduct.stock} onChange={(event) => setNewProduct({ ...newProduct, stock: Number(event.target.value) })} />
                </label>
                <label>
                  Min.
                  <input type="number" min={0} value={newProduct.lowStockAt} onChange={(event) => setNewProduct({ ...newProduct, lowStockAt: Number(event.target.value) })} />
                </label>
                <label>
                  Costo
                  <input type="number" min={0} value={newProduct.cost} onChange={(event) => setNewProduct({ ...newProduct, cost: Number(event.target.value) })} />
                </label>
                <label>
                  Precio
                  <input type="number" min={0} value={newProduct.price} onChange={(event) => setNewProduct({ ...newProduct, price: Number(event.target.value) })} />
                </label>
              </div>
              <label className="check-row">
                <input type="checkbox" checked={newProduct.publishable} onChange={(event) => setNewProduct({ ...newProduct, publishable: event.target.checked })} />
                Preparar para catalogo online
              </label>
              <button className="primary-action" onClick={submitProduct} disabled={!newProduct.name.trim() || !newProduct.sku.trim() || newProduct.price <= 0 || isUploadingNewProductImages}>
                <PlusCircle size={19} /> Crear producto
              </button>
              {productSaveStatus && <span className="muted-text">{productSaveStatus}</span>}
            </div>
          </Panel>
        )}
        {stockPage === "movimiento" && (
          <Panel title="Movimiento manual">
            <div className="form-grid one compact">
              <label>
                Variante
                <select value={movement.variantId} onChange={(event) => setMovement({ ...movement, variantId: event.target.value })}>
                  {products.flatMap((product) =>
                    product.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {product.name} - {variant.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <div className="form-grid two">
                <label>
                  Tipo
                  <select value={movement.type} onChange={(event) => setMovement({ ...movement, type: event.target.value as typeof movement.type })}>
                    <option value="ingreso">Ingreso</option>
                    <option value="ajuste">Ajuste / baja</option>
                    <option value="devolucion">Devolucion</option>
                    <option value="perdida_rotura">Perdida / rotura</option>
                  </select>
                </label>
                <label>
                  Cantidad
                  <input type="number" min={1} value={movement.quantity} onChange={(event) => setMovement({ ...movement, quantity: Number(event.target.value) })} />
                </label>
              </div>
              <label>
                Motivo
                <input value={movement.reason} onChange={(event) => setMovement({ ...movement, reason: event.target.value })} placeholder="Compra, rotura, conteo..." />
              </label>
              <button className="secondary-action full" onClick={submitMovement} disabled={!movement.variantId || movement.quantity < 1}>
                <MinusCircle size={19} /> Registrar movimiento
              </button>
            </div>
          </Panel>
        )}
        {stockPage === "variante" && (
          <Panel title={variantMode === "editar" ? "Editar variante" : "Agregar variante"}>
            <div className="segmented-control variant-mode-control" aria-label="Modo de variante">
              <button className={clsx(variantMode === "editar" && "active")} onClick={() => setVariantMode("editar")}>Editar existente</button>
              <button className={clsx(variantMode === "crear" && "active")} onClick={() => setVariantMode("crear")}>Agregar nueva</button>
            </div>
            {variantMode === "editar" ? (
            <div className="form-grid one compact">
              <label>
                Variante
                <select value={variantDraftId} onChange={(event) => setVariantDraftId(event.target.value)}>
                  {variantOptions(products)}
                </select>
              </label>
              <div className="form-grid two">
                <label>
                  Nombre
                  <input value={variantDraft.name} onChange={(event) => setVariantDraft({ ...variantDraft, name: event.target.value })} />
                </label>
                <label>
                  SKU
                  <input value={variantDraft.sku} onChange={(event) => setVariantDraft({ ...variantDraft, sku: event.target.value })} />
                </label>
              </div>
              <label>
                Codigo de barra
                <input value={variantDraft.barcode} onChange={(event) => setVariantDraft({ ...variantDraft, barcode: event.target.value })} />
              </label>
              <div className="form-grid three">
                <label>
                  Min.
                  <input type="number" min={0} value={variantDraft.lowStockAt} onChange={(event) => setVariantDraft({ ...variantDraft, lowStockAt: Number(event.target.value) })} />
                </label>
                <label>
                  Costo
                  <input type="number" min={0} value={variantDraft.cost} onChange={(event) => setVariantDraft({ ...variantDraft, cost: Number(event.target.value) })} />
                </label>
                <label>
                  Precio
                  <input type="number" min={0} value={variantDraft.price} onChange={(event) => setVariantDraft({ ...variantDraft, price: Number(event.target.value) })} />
                </label>
              </div>
              <button className="secondary-action full" onClick={submitVariant} disabled={!variantDraftId || !variantDraft.name.trim() || !variantDraft.sku.trim()}>
                <PencilSimple size={18} /> Guardar variante
              </button>
            </div>
            ) : (
              <div className="form-grid one compact">
                <label>
                  Producto
                  <select value={newVariant.productId} onChange={(event) => setNewVariant({ ...newVariant, productId: event.target.value })}>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                </label>
                <div className="form-grid two">
                  <label>Nombre<input value={newVariant.name} onChange={(event) => setNewVariant({ ...newVariant, name: event.target.value })} placeholder="Color, tamaño o modelo" /></label>
                  <label>SKU<input value={newVariant.sku} onChange={(event) => setNewVariant({ ...newVariant, sku: event.target.value })} /></label>
                </div>
                <label>Código de barra<input value={newVariant.barcode} onChange={(event) => setNewVariant({ ...newVariant, barcode: event.target.value })} /></label>
                <div className="form-grid four">
                  <label>Stock<input type="number" min={0} value={newVariant.stock} onChange={(event) => setNewVariant({ ...newVariant, stock: Number(event.target.value) })} /></label>
                  <label>Mínimo<input type="number" min={0} value={newVariant.lowStockAt} onChange={(event) => setNewVariant({ ...newVariant, lowStockAt: Number(event.target.value) })} /></label>
                  <label>Costo<input type="number" min={0} value={newVariant.cost} onChange={(event) => setNewVariant({ ...newVariant, cost: Number(event.target.value) })} /></label>
                  <label>Precio<input type="number" min={0} value={newVariant.price} onChange={(event) => setNewVariant({ ...newVariant, price: Number(event.target.value) })} /></label>
                </div>
                <button className="primary-action" onClick={submitNewVariant} disabled={!newVariant.productId || !newVariant.name.trim() || !newVariant.sku.trim() || newVariant.price <= 0}>
                  <PlusCircle size={18} /> Agregar variante
                </button>
                {variantStatus && <span className="muted-text">{variantStatus}</span>}
              </div>
            )}
          </Panel>
        )}
        {stockPage === "importacion" && (
          <Panel title="Importacion masiva">
            <div className="form-grid one compact">
              <label>
                Productos
                <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Nombre;Categoria;Proveedor;SKU;Precio;Costo;Stock" />
              </label>
              <button className="secondary-action full" onClick={submitImport} disabled={!importText.trim()}>
                <PlusCircle size={18} /> Importar productos
              </button>
              <span className="muted-text">{importedCount ? `${importedCount} producto(s) importado(s).` : "Formato: Nombre;Categoria;Proveedor;SKU;Precio;Costo;Stock"}</span>
            </div>
          </Panel>
        )}
        {stockPage === "historial" && (
      <Panel title="Historial de movimientos">
        <div className="movement-list">
          {movements.slice(0, 8).map((item) => {
            const found = findVariantName(products, item.variantId);
            return (
              <div key={item.id}>
                <div>
                  <strong>{found}</strong>
                  <span>{item.type} · {item.reason} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })}</span>
                </div>
                <strong className={item.quantity > 0 ? "positive" : "negative"}>{item.quantity > 0 ? `+${item.quantity}` : item.quantity}</strong>
              </div>
            );
          })}
        </div>
      </Panel>
        )}
      </div>
    </section>
  );
}

function Purchases() {
  const products = useStore((state) => state.products);
  const suppliers = useStore((state) => state.suppliers);
  const purchaseReceipts = useStore((state) => state.purchaseReceipts);
  const supplierPayments = useStore((state) => state.supplierPayments);
  const addPurchaseReceipt = useStore((state) => state.addPurchaseReceipt);
  const addSupplierPayment = useStore((state) => state.addSupplierPayment);
  const [purchasePage, setPurchasePage] = useState<PurchasePage>("factura");
  const [documentType, setDocumentType] = useState<PurchaseDocumentType>("factura");
  const [documentNumber, setDocumentNumber] = useState("");
  const [supplierChoice, setSupplierChoice] = useState(suppliers[0]?.id ?? "nuevo");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [variantId, setVariantId] = useState(products[0]?.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingNote, setShippingNote] = useState("");
  const [autoCostPulse, setAutoCostPulse] = useState(false);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [paymentSupplier, setPaymentSupplier] = useState(suppliers[0]?.name ?? "");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState("");
  const [aiExpected, setAiExpected] = useState("");
  const [aiSource, setAiSource] = useState("");
  const [aiFileName, setAiFileName] = useState("");
  const [aiDraftLines, setAiDraftLines] = useState<PurchaseLine[]>([]);
  const [aiStatus, setAiStatus] = useState("Esperando comprobante.");
  const selected = findProductVariant(products, variantId);
  useEffect(() => {
    if (!selected) return;
    setUnitCost(selected.variant.cost);
    setAutoCostPulse(true);
    const timer = window.setTimeout(() => setAutoCostPulse(false), 650);
    return () => window.clearTimeout(timer);
  }, [selected?.variant.id]);
  const supplierBalances = suppliers.map((supplier) => {
    const purchasesTotal = purchaseReceipts.filter((receipt) => receipt.supplier === supplier.name).reduce((sum, receipt) => sum + receipt.total, 0);
    const paymentsTotal = supplierPayments.filter((payment) => payment.supplier === supplier.name).reduce((sum, payment) => sum + payment.amount, 0);
    return { supplier: supplier.name, balance: purchasesTotal - paymentsTotal, purchasesTotal, paymentsTotal };
  });

  const addLine = () => {
    if (!selected || quantity < 1 || unitCost < 0) return;
    const next = buildPurchaseLine(selected.product, selected.variant, quantity, unitCost);
    setLines((current) => mergePurchaseLine(current, next));
  };
  const submitReceipt = () => {
    const supplier = resolveSupplierName(suppliers, supplierChoice, newSupplierName);
    const receipt = addPurchaseReceipt({ documentType, documentNumber, supplier, lines, shippingCost, shippingNote });
    if (receipt) {
      setDocumentNumber("");
      setSupplierChoice(suppliers[0]?.id ?? "nuevo");
      setNewSupplierName("");
      setQuantity(1);
      setUnitCost(0);
      setShippingCost(0);
      setShippingNote("");
      setLines([]);
      setPurchasePage("recientes");
    }
  };
  const submitSupplierPayment = () => {
    const payment = addSupplierPayment(paymentSupplier, paymentAmount, paymentNote);
    if (payment) {
      setPaymentAmount(0);
      setPaymentNote("");
      setPurchasePage("cuentas");
    }
  };
  const readAiFile = (file?: File) => {
    if (!file) return;
    setAiFileName(file.name);
    if (file.type.includes("text") || file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = () => setAiSource(String(reader.result ?? ""));
      reader.readAsText(file);
      return;
    }
    setAiSource(`Archivo cargado: ${file.name}. Tipo: ${file.type || "sin tipo detectado"}.`);
  };
  const analyzePurchaseWithAi = async () => {
    setAiStatus("Analizando con OpenAI...");
    const comparison = aiExpected.trim() ? " Pedido esperado y recibido cargados para comparar." : " Sin pedido esperado cargado.";
    const aiResult = await analyzePurchaseWithOpenAi({ expected: aiExpected, received: aiSource, fileName: aiFileName, products });
    const draft = aiResult?.lines.length
      ? aiResult.lines
          .map((line) => {
            const found = products.flatMap((product) => product.variants.map((variant) => ({ product, variant }))).find((item) => item.variant.id === line.variantId);
            return found ? buildPurchaseLine(found.product, found.variant, Math.max(Math.round(line.quantity), 1), Math.max(line.unitCost, 0)) : null;
          })
          .filter((line): line is PurchaseLine => Boolean(line))
      : inferPurchaseDraftFromAi(products, `${aiExpected}\n${aiSource}`, aiFileName);
    setAiDraftLines(draft);
    setAiStatus(
      draft.length
        ? `${draft.length} linea(s) detectada(s).${comparison} ${aiResult?.notes ?? "Revisar antes de aplicar."}`
        : "No se detectaron productos conocidos."
    );
  };
  const applyAiDraft = () => {
    setLines((current) => aiDraftLines.reduce((acc, line) => mergePurchaseLine(acc, line), current));
    if (!documentNumber.trim()) setDocumentNumber(aiFileName ? `IA-${aiFileName.replace(/\.[^.]+$/, "").slice(0, 18)}` : `IA-${new Date().toISOString().slice(0, 10)}`);
    setAiStatus("Precarga aplicada. Falta revisar y registrar la compra.");
    setPurchasePage("factura");
  };
  const purchaseTabs: { id: PurchasePage; label: string; icon: typeof Truck }[] = [
    { id: "factura", label: "Factura o remito", icon: Truck },
    { id: "precarga", label: "Precarga", icon: FileText },
    { id: "recientes", label: "Compras recientes", icon: ClockCounterClockwise },
    { id: "cuentas", label: "Cuenta de proveedores", icon: Users },
    { id: "pago", label: "Registrar pago", icon: Wallet }
  ];

  return (
    <section className="workspace">
      <div className="module-workspace">
        <div className="module-topbar" aria-label="Secciones de compras">
          {purchaseTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={clsx("module-tab", purchasePage === tab.id && "active")} onClick={() => setPurchasePage(tab.id)}>
                <Icon size={18} weight="duotone" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      {purchasePage === "precarga" && (
        <Panel title="Precarga con IA">
          <div className="ai-assistant">
            <div>
              <strong>Subir factura, remito o foto</strong>
              <span>La IA prepara lineas sugeridas y una persona confirma antes de mover stock.</span>
            </div>
            <div className="form-grid two">
              <label>
                Pedido esperado
                <textarea value={aiExpected} onChange={(event) => setAiExpected(event.target.value)} placeholder="Opcional: pegar lo que se pidio al proveedor" />
              </label>
              <label>
                Recibido / comprobante
                <textarea value={aiSource} onChange={(event) => setAiSource(event.target.value)} placeholder="Pegar texto detectado del comprobante o lo que llego" />
              </label>
            </div>
            <div className="form-grid one">
              <label>
                Archivo
                <input type="file" accept="image/*,.pdf,.txt,.csv" onChange={(event) => readAiFile(event.target.files?.[0])} />
              </label>
            </div>
            <div className="edit-actions">
              <button className="secondary-action" onClick={analyzePurchaseWithAi} disabled={!aiSource.trim() && !aiFileName}>
                <FileText size={18} /> Analizar con IA
              </button>
              <button className="primary-action" onClick={applyAiDraft} disabled={!aiDraftLines.length}>
                <CheckCircle size={18} /> Aplicar precarga
              </button>
            </div>
            <span className="muted-text">{aiStatus}</span>
            <PurchaseLines lines={aiDraftLines} onRemove={(variant) => setAiDraftLines((current) => current.filter((line) => line.variantId !== variant))} />
          </div>
        </Panel>
      )}
      {purchasePage === "factura" && (
        <Panel title="Factura o remito de compra">
          <div className="form-grid two">
            <label>
              Proveedor
              <select value={supplierChoice} onChange={(event) => setSupplierChoice(event.target.value)}>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
                <option value="nuevo">Agregar proveedor rapido</option>
              </select>
            </label>
            <label>
              Tipo
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value as PurchaseDocumentType)}>
                <option value="factura">Factura</option>
                <option value="remito">Remito</option>
                <option value="ticket">Ticket</option>
                <option value="otro">Otro</option>
              </select>
            </label>
          </div>
          <label>
            Numero de comprobante
            <input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} placeholder="Ej: A-0001-00012345" />
          </label>
          {supplierChoice === "nuevo" && (
            <div className="inline-notice">
              <label>
                Nuevo proveedor
                <input value={newSupplierName} onChange={(event) => setNewSupplierName(event.target.value)} placeholder="Proveedor mayorista" />
              </label>
              <span>Al registrar la compra quedará guardado automáticamente en Proveedores.</span>
            </div>
          )}
          <div className="line-builder purchase-builder">
            <label>
              Producto
              <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
                {variantOptions(products)}
              </select>
            </label>
            <label>
              Cant.
              <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
            </label>
            <div className={clsx("purchase-cost-field", autoCostPulse && "auto-filled-field")}>
              <label htmlFor="purchase-unit-cost">Costo</label>
              <input id="purchase-unit-cost" type="number" min={0} value={unitCost} onChange={(event) => setUnitCost(Number(event.target.value))} />
              <span>{autoCostPulse ? "Costo anterior precargado" : "Editable para esta compra"}</span>
            </div>
            <button className="secondary-action" onClick={addLine} disabled={!selected || quantity < 1}>
              <PlusCircle size={18} /> Agregar
            </button>
          </div>
          <PurchaseLines lines={lines} onRemove={(variant) => setLines((current) => current.filter((line) => line.variantId !== variant))} />
          <div className="form-grid two purchase-shipping">
            <label>
              Costo de envío
              <input type="number" min={0} value={shippingCost} onChange={(event) => setShippingCost(Number(event.target.value))} />
            </label>
            <label>
              Detalle de envío
              <input value={shippingNote} onChange={(event) => setShippingNote(event.target.value)} placeholder="Transporte, guía o modalidad" />
            </label>
          </div>
          <div className="checkout-row">
            <div>
              <span>Total compra</span>
              <strong>{formatMoney(purchaseLineTotal(lines) + shippingCost)}</strong>
            </div>
            <button className="primary-action" onClick={submitReceipt} disabled={!resolveSupplierName(suppliers, supplierChoice, newSupplierName).trim() || !documentNumber.trim() || !lines.length}>
              <Truck size={19} /> Registrar compra
            </button>
          </div>
        </Panel>
      )}
      {purchasePage === "recientes" && (
        <Panel title="Compras recientes">
          <DataList
            items={purchaseReceipts.map((receipt) => ({
              title: `${receipt.number} · ${receipt.documentType}`,
              meta: `${receipt.supplier} · ${receipt.documentNumber} · ${receipt.lines.length} linea(s)${receipt.shippingCost ? ` · Envío ${formatMoney(receipt.shippingCost)}` : ""}`,
              value: formatMoney(receipt.total)
            }))}
          />
        </Panel>
      )}
      {purchasePage === "cuentas" && (
        <Panel title="Cuenta de proveedores">
          <DataList
            items={supplierBalances.map((item) => ({
              title: item.supplier,
              meta: `Compras ${formatMoney(item.purchasesTotal)} · Pagos ${formatMoney(item.paymentsTotal)}`,
              value: formatMoney(item.balance)
            }))}
          />
        </Panel>
      )}
      {purchasePage === "pago" && (
        <Panel title="Registrar pago a proveedor">
          <div className="form-grid one compact">
            <label>
              Proveedor
              <select value={paymentSupplier} onChange={(event) => setPaymentSupplier(event.target.value)}>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                ))}
              </select>
            </label>
            <label>
              Monto
              <input type="number" min={0} value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.target.value))} />
            </label>
            <label>
              Nota
              <input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Efectivo, transferencia, referencia" />
            </label>
            <button className="primary-action" onClick={submitSupplierPayment} disabled={!paymentSupplier || paymentAmount <= 0}>
              <Wallet size={18} /> Registrar pago
            </button>
          </div>
        </Panel>
      )}
      </div>
    </section>
  );
}

function Customers() {
  const customers = useStore((state) => state.customers);
  const addCustomer = useStore((state) => state.addCustomer);
  const updateCustomer = useStore((state) => state.updateCustomer);
  const deleteCustomer = useStore((state) => state.deleteCustomer);
  const restoreCustomer = useStore((state) => state.restoreCustomer);
  const activeRole = useStore((state) => state.activeRole);
  const isOwner = activeRole === "dueno";
  const [contactPage, setContactPage] = useState<ContactPage>("lista");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", phone: "", email: "", note: "" });
  const activeCustomers = customers.filter((customer) => !customer.deletedAt);
  const deletedCustomers = customers.filter((customer) => customer.deletedAt);

  const submit = () => {
    if (editingId) updateCustomer(editingId, draft);
    else addCustomer(draft);
    setEditingId(null);
    setDraft({ name: "", phone: "", email: "", note: "" });
    setContactPage("lista");
  };
  const edit = (customer: Customer) => {
    setEditingId(customer.id);
    setDraft({ name: customer.name, phone: customer.phone, email: customer.email, note: customer.note });
    setContactPage("editar");
  };
  const startNew = () => {
    setEditingId(null);
    setDraft({ name: "", phone: "", email: "", note: "" });
    setContactPage("nuevo");
  };
  const tabs: { id: ContactPage; label: string; icon: typeof Users }[] = [
    { id: "lista", label: "Clientes", icon: Users },
    { id: "nuevo", label: "Nuevo cliente", icon: PlusCircle },
    { id: "editar", label: "Editar cliente", icon: PencilSimple },
    ...(isOwner ? [{ id: "eliminados" as const, label: "Eliminados", icon: Trash }] : [])
  ];

  return (
    <section className="workspace">
      <div className="module-workspace">
        <div className="module-topbar" aria-label="Secciones de clientes">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const disabled = tab.id === "editar" && !editingId;
            return (
              <button key={tab.id} className={clsx("module-tab", contactPage === tab.id && "active")} onClick={() => (tab.id === "nuevo" ? startNew() : setContactPage(tab.id))} disabled={disabled}>
                <Icon size={18} weight="duotone" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {contactPage === "lista" && (
        <Panel title="Clientes">
          <ContactList contacts={activeCustomers} empty="Sin clientes cargados." onEdit={edit} onDelete={isOwner ? (customer) => deleteCustomer(customer.id, activeRole) : undefined} />
        </Panel>
        )}
        {contactPage === "nuevo" && (
        <Panel title="Nuevo cliente">
          <ContactForm draft={draft} setDraft={setDraft} primaryLabel={editingId ? "Guardar cliente" : "Crear cliente"} onSubmit={submit} />
        </Panel>
        )}
        {contactPage === "editar" && (
        <Panel title="Editar cliente">
          {editingId ? <ContactForm draft={draft} setDraft={setDraft} primaryLabel="Guardar cliente" onSubmit={submit} /> : <div className="empty-lines">Selecciona un cliente desde la lista para editarlo.</div>}
        </Panel>
        )}
        {contactPage === "eliminados" && isOwner && (
        <Panel title="Clientes eliminados">
          <ContactList contacts={deletedCustomers} empty="No hay clientes eliminados." onEdit={edit} restoreLabel="Restaurar" onRestore={(customer) => restoreCustomer(customer.id, activeRole)} />
        </Panel>
        )}
      </div>
    </section>
  );
}

function Suppliers() {
  const suppliers = useStore((state) => state.suppliers);
  const addSupplier = useStore((state) => state.addSupplier);
  const updateSupplier = useStore((state) => state.updateSupplier);
  const [contactPage, setContactPage] = useState<ContactPage>("lista");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", phone: "", email: "", note: "" });

  const submit = () => {
    if (editingId) updateSupplier(editingId, draft);
    else addSupplier(draft);
    setEditingId(null);
    setDraft({ name: "", phone: "", email: "", note: "" });
    setContactPage("lista");
  };
  const edit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setDraft({ name: supplier.name, phone: supplier.phone, email: supplier.email, note: supplier.note });
    setContactPage("editar");
  };
  const startNew = () => {
    setEditingId(null);
    setDraft({ name: "", phone: "", email: "", note: "" });
    setContactPage("nuevo");
  };
  const tabs: { id: ContactPage; label: string; icon: typeof Users }[] = [
    { id: "lista", label: "Proveedores", icon: Truck },
    { id: "nuevo", label: "Nuevo proveedor", icon: PlusCircle },
    { id: "editar", label: "Editar proveedor", icon: PencilSimple }
  ];

  return (
    <section className="workspace">
      <div className="module-workspace">
        <div className="module-topbar" aria-label="Secciones de proveedores">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const disabled = tab.id === "editar" && !editingId;
            return (
              <button key={tab.id} className={clsx("module-tab", contactPage === tab.id && "active")} onClick={() => (tab.id === "nuevo" ? startNew() : setContactPage(tab.id))} disabled={disabled}>
                <Icon size={18} weight="duotone" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {contactPage === "lista" && (
        <Panel title="Proveedores">
          <ContactList contacts={suppliers} empty="Sin proveedores cargados." onEdit={edit} />
        </Panel>
        )}
        {contactPage === "nuevo" && (
        <Panel title="Nuevo proveedor">
          <ContactForm draft={draft} setDraft={setDraft} primaryLabel={editingId ? "Guardar proveedor" : "Crear proveedor"} onSubmit={submit} />
        </Panel>
        )}
        {contactPage === "editar" && (
        <Panel title="Editar proveedor">
          {editingId ? <ContactForm draft={draft} setDraft={setDraft} primaryLabel="Guardar proveedor" onSubmit={submit} /> : <div className="empty-lines">Selecciona un proveedor desde la lista para editarlo.</div>}
        </Panel>
        )}
      </div>
    </section>
  );
}

function Quotes() {
  const products = useStore((state) => state.products);
  const customers = useStore((state) => state.customers);
  const quotes = useStore((state) => state.quotes);
  const addQuote = useStore((state) => state.addQuote);
  const convertQuote = useStore((state) => state.convertQuote);
  const [quotePage, setQuotePage] = useState<QuotePage>("nuevo");
  const [customerChoice, setCustomerChoice] = useState(customers[0]?.id ?? "nuevo");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [variantId, setVariantId] = useState(products[0]?.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const activeCustomers = customers.filter((customer) => !customer.deletedAt);
  const selected = findProductVariant(products, variantId);
  useEffect(() => {
    if (customerChoice !== "nuevo" && !activeCustomers.some((customer) => customer.id === customerChoice)) {
      setCustomerChoice(activeCustomers[0]?.id ?? "nuevo");
    }
  }, [activeCustomers, customerChoice]);
  const addLine = () => {
    if (!selected || quantity < 1) return;
    setLines((current) => mergeLine(current, buildUiSaleLine(selected.product, selected.variant, quantity)));
  };
  const submitQuote = () => {
    const customerName = resolveCustomerName(activeCustomers, customerChoice, newCustomerName);
    const quote = addQuote({ customerName, lines, internalNote: quoteNote });
    if (quote) {
      setCustomerChoice(activeCustomers[0]?.id ?? "nuevo");
      setNewCustomerName("");
      setQuoteNote("");
      setLines([]);
      setQuotePage("lista");
    }
  };
  const tabs: { id: QuotePage; label: string; icon: typeof FileText }[] = [
    { id: "nuevo", label: "Nuevo presupuesto", icon: PlusCircle },
    { id: "lista", label: "Presupuestos", icon: FileText }
  ];

  return (
    <section className="workspace">
      <div className="module-workspace">
        <div className="module-topbar" aria-label="Secciones de presupuestos">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={clsx("module-tab", quotePage === tab.id && "active")} onClick={() => setQuotePage(tab.id)}>
                <Icon size={18} weight="duotone" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {quotePage === "nuevo" && (
        <Panel title="Nuevo presupuesto">
          <div className="form-grid one">
            <label>
              Cliente
              <select value={customerChoice} onChange={(event) => setCustomerChoice(event.target.value)}>
                {activeCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
                <option value="nuevo">Agregar cliente rapido</option>
              </select>
            </label>
            {customerChoice === "nuevo" && (
              <label>
                Nuevo cliente
                <input value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} placeholder="Nombre del cliente o empresa" />
              </label>
            )}
            <label>
              Nota interna
              <input value={quoteNote} onChange={(event) => setQuoteNote(event.target.value)} placeholder="Condiciones, entrega o seguimiento" />
            </label>
            <div className="line-builder">
              <label>
                Producto
                <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
                  {variantOptions(products)}
                </select>
              </label>
              <label>
                Cant.
                <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
              </label>
              <button className="secondary-action" onClick={addLine} disabled={!selected || quantity < 1}>
                <PlusCircle size={18} /> Agregar
              </button>
            </div>
          </div>
          <CartLines lines={lines} onRemove={(variant) => setLines((current) => current.filter((line) => line.variantId !== variant))} />
          <div className="checkout-row">
            <div>
              <span>Total presupuestado</span>
              <strong>{formatMoney(saleLineTotal(lines))}</strong>
            </div>
            <button className="primary-action" onClick={submitQuote} disabled={!resolveCustomerName(activeCustomers, customerChoice, newCustomerName).trim() || !lines.length}>
              <FileText size={19} /> Crear presupuesto
            </button>
          </div>
        </Panel>
        )}
        {quotePage === "lista" && (
        <Panel title="Presupuestos">
          <div className="table">
            {quotes.map((quote) => (
              <div className="table-row" key={quote.id}>
                <div>
                  <strong>{quote.number}</strong>
                  <span>{quote.customerName} · {quote.lines.length} linea(s){quote.internalNote ? ` · ${quote.internalNote}` : ""}</span>
                </div>
                <span>{quote.status}</span>
                <strong>{formatMoney(quote.total)}</strong>
                <button className="secondary-action" disabled={quote.status !== "abierto"} onClick={() => convertQuote(quote.id)}>
                  Convertir
                </button>
              </div>
            ))}
          </div>
        </Panel>
        )}
      </div>
    </section>
  );
}

function Transfers() {
  const sales = useStore((state) => state.sales);
  const quotes = useStore((state) => state.quotes);
  const transfers = useStore((state) => state.transfers);
  const addTransfer = useStore((state) => state.addTransfer);
  const confirmTransfer = useStore((state) => state.confirmTransfer);
  const [transferPage, setTransferPage] = useState<TransferPage>("cargar");
  const [relatedTo, setRelatedTo] = useState<"venta" | "presupuesto">("venta");
  const relatedOptions = relatedTo === "venta" ? sales : quotes;
  const [relatedId, setRelatedId] = useState(relatedOptions[0]?.id ?? "");
  const [amount, setAmount] = useState(0);
  const [sender, setSender] = useState("");
  const [note, setNote] = useState("");

  const submitTransfer = () => {
    const fallbackId = relatedId || relatedOptions[0]?.id;
    if (!fallbackId) return;
    const transfer = addTransfer({ relatedTo, relatedId: fallbackId, amount, sender, note });
    if (transfer) {
      setAmount(0);
      setSender("");
      setNote("");
      setTransferPage("comprobantes");
    }
  };
  const tabs: { id: TransferPage; label: string; icon: typeof CreditCard }[] = [
    { id: "cargar", label: "Cargar transferencia", icon: PlusCircle },
    { id: "comprobantes", label: "Comprobantes", icon: CreditCard }
  ];

  return (
    <section className="workspace">
      <div className="module-workspace">
        <div className="module-topbar" aria-label="Secciones de transferencias">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={clsx("module-tab", transferPage === tab.id && "active")} onClick={() => setTransferPage(tab.id)}>
                <Icon size={18} weight="duotone" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {transferPage === "cargar" && (
        <Panel title="Cargar transferencia">
          <div className="form-grid two">
            <label>
              Asociar a
              <select value={relatedTo} onChange={(event) => {
                const nextType = event.target.value as "venta" | "presupuesto";
                setRelatedTo(nextType);
                setRelatedId((nextType === "venta" ? sales : quotes)[0]?.id ?? "");
              }}>
                <option value="venta">Venta</option>
                <option value="presupuesto">Presupuesto</option>
              </select>
            </label>
            <label>
              Documento
              <select value={relatedId} onChange={(event) => setRelatedId(event.target.value)}>
                {relatedOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {"receiptNumber" in item ? item.receiptNumber : item.number}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid two">
            <label>
              Envia
              <input value={sender} onChange={(event) => setSender(event.target.value)} placeholder="Nombre del cliente" />
            </label>
            <label>
              Monto
              <input type="number" min={0} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
            </label>
          </div>
          <label>
            Nota
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Banco, hora o referencia" />
          </label>
          <div className="checkout-row">
            <span>Queda pendiente hasta que alguien la confirme.</span>
            <button className="primary-action" onClick={submitTransfer} disabled={!sender.trim() || amount <= 0}>
              <CreditCard size={19} /> Guardar transferencia
            </button>
          </div>
        </Panel>
        )}
        {transferPage === "comprobantes" && (
        <Panel title="Comprobantes de transferencia">
          <div className="table">
            {transfers.map((transfer) => (
              <div className="table-row" key={transfer.id}>
                <div>
                  <strong>{transfer.sender}</strong>
                  <span>{transfer.note}</span>
                </div>
                <span>{transfer.status}</span>
                <strong>{formatMoney(transfer.amount)}</strong>
                <button className="secondary-action" disabled={transfer.status === "confirmado"} onClick={() => confirmTransfer(transfer.id)}>
                  Confirmar
                </button>
              </div>
            ))}
          </div>
        </Panel>
        )}
      </div>
    </section>
  );
}

function Expenses() {
  const expenses = useStore((state) => state.expenses);
  const cashClosures = useStore((state) => state.cashClosures);
  const addExpense = useStore((state) => state.addExpense);
  const closeCashDay = useStore((state) => state.closeCashDay);
  const grouped = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
    return acc;
  }, {});
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("Reposicion");
  const [vendor, setVendor] = useState("");
  const [note, setNote] = useState("");
  const [closureNote, setClosureNote] = useState("");
  const [expensePage, setExpensePage] = useState<ExpensePage>("cargar");
  const submitExpense = () => {
    addExpense({ amount, category, vendor, note });
    setAmount(0);
    setVendor("");
    setNote("");
    setExpensePage("recientes");
  };
  const submitClosure = () => {
    closeCashDay(closureNote);
    setClosureNote("");
    setExpensePage("cierre");
  };
  const tabs: { id: ExpensePage; label: string; icon: typeof Wallet }[] = [
    { id: "cargar", label: "Cargar gasto", icon: PlusCircle },
    { id: "recientes", label: "Gastos recientes", icon: Wallet },
    { id: "resumen", label: "Resumen", icon: ChartLineUp },
    { id: "cierre", label: "Cierre diario", icon: Receipt }
  ];

  return (
    <section className="workspace">
      <div className="module-workspace">
        <div className="module-topbar" aria-label="Secciones de gastos">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={clsx("module-tab", expensePage === tab.id && "active")} onClick={() => setExpensePage(tab.id)}>
                <Icon size={18} weight="duotone" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {expensePage === "cargar" && (
        <Panel title="Cargar gasto">
          <div className="form-grid one">
            <label>
              Categoria
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>Reposicion</option>
                <option>Servicios</option>
                <option>Alquiler</option>
                <option>Sueldos</option>
                <option>Otro</option>
              </select>
            </label>
            <label>
              Monto
              <input type="number" min={0} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
            </label>
            <label>
              Proveedor
              <input value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="Nombre o comercio" />
            </label>
            <label>
              Nota
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Detalle corto" />
            </label>
            <button className="primary-action" onClick={submitExpense} disabled={amount <= 0}>
              <Wallet size={19} /> Guardar gasto
            </button>
          </div>
        </Panel>
        )}
        {expensePage === "recientes" && (
        <Panel title="Gastos recientes">
          <DataList items={expenses.map((expense) => ({ title: expense.category, meta: `${expense.vendor} · ${expense.note}`, value: formatMoney(expense.amount) }))} />
        </Panel>
        )}
        {expensePage === "resumen" && (
        <Panel title="Resumen por categoria">
          <div className="category-bars">
            {Object.entries(grouped).map(([category, total]) => (
              <div key={category}>
                <span>{category}</span>
                <strong>{formatMoney(total)}</strong>
              </div>
            ))}
          </div>
        </Panel>
        )}
        {expensePage === "cierre" && (
        <Panel title="Cierre de caja diario">
          <div className="form-grid one compact">
            <label>
              Nota de cierre
              <input value={closureNote} onChange={(event) => setClosureNote(event.target.value)} placeholder="Diferencias, observaciones, responsable" />
            </label>
            <button className="primary-action" onClick={submitClosure}>
              <Receipt size={18} /> Cerrar caja de hoy
            </button>
          </div>
          <DataList
            items={cashClosures.slice(0, 4).map((closure) => ({
              title: closure.number,
              meta: `${closure.date} · Gastos ${formatMoney(closure.expensesTotal)} · ${closure.note || "Sin nota"}`,
              value: formatMoney(closure.cashTotal + closure.transferTotal + closure.cardTotal + closure.otherTotal - closure.expensesTotal)
            }))}
          />
        </Panel>
        )}
      </div>
    </section>
  );
}

function Catalog({ editingProductId, onEditProduct, onBack }: { editingProductId: string | null; onEditProduct: (productId: string) => void; onBack: () => void }) {
  const products = useStore((state) => state.products);
  const suppliers = useStore((state) => state.suppliers);
  const categories = useStore((state) => state.categories);
  const activeRole = useStore((state) => state.activeRole);
  const canSeeSupplier = activeRole === "dueno" || activeRole === "administrador";
  const updateProductDetails = useStore((state) => state.updateProductDetails);
  const deleteProduct = useStore((state) => state.deleteProduct);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [supplierFilter, setSupplierFilter] = useState("todos");
  const [webFilter, setWebFilter] = useState("todos");
  const publishableProducts = products.filter((product) => product.publishable);
  const filteredProducts = products.filter((product) => {
    const text = `${product.name} ${product.category} ${product.supplier} ${product.description}`.toLowerCase();
    return (
      (!query.trim() || text.includes(query.trim().toLowerCase())) &&
      (categoryFilter === "todas" || product.category === categoryFilter) &&
      (supplierFilter === "todos" || product.supplier === supplierFilter) &&
      (webFilter === "todos" || (webFilter === "publicables" ? product.publishable : !product.publishable))
    );
  });
  const editingProduct = products.find((product) => product.id === editingProductId);
  if (editingProduct) {
    return (
      <ProductEditor
        product={editingProduct}
        suppliers={suppliers}
        categories={categories}
        canDelete={activeRole === "dueno" || activeRole === "administrador"}
        canSeeSupplier={canSeeSupplier}
        onSave={updateProductDetails}
        onDelete={(productId) => deleteProduct(productId, activeRole)}
        onBack={onBack}
      />
    );
  }

  return (
    <section className="workspace">
      <div className="metric-grid compact-metrics">
        <Metric label="Productos totales" value={String(products.length)} icon={<Package size={24} />} />
        <Metric label="Publicables" value={String(publishableProducts.length)} icon={<Storefront size={24} />} />
        <Metric label="Ocultos" value={String(products.length - publishableProducts.length)} icon={<FileText size={24} />} />
      </div>
      <div className="catalog-toolbar">
        <div>
          <strong>Productos del catalogo</strong>
          <span>{filteredProducts.length} de {products.length} ficha(s), {publishableProducts.length} visibles en web publica.</span>
        </div>
        <div className="segmented-control" aria-label="Vista de catalogo">
          <button className={clsx(viewMode === "grid" && "active")} onClick={() => setViewMode("grid")}>
            <SquaresFour size={18} /> Cuadricula
          </button>
          <button className={clsx(viewMode === "list" && "active")} onClick={() => setViewMode("list")}>
            <ListBullets size={18} /> Lista
          </button>
        </div>
      </div>
      <div className="filter-row">
        <label className="search-field compact-search">
          <MagnifyingGlass size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en catalogo" />
        </label>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="todas">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        {canSeeSupplier && <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
          <option value="todos">Todos los proveedores</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
          ))}
        </select>}
        <select value={webFilter} onChange={(event) => setWebFilter(event.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="publicables">Web publica</option>
          <option value="internos">Internos</option>
        </select>
      </div>
      <div className={clsx("catalog-grid", viewMode === "list" && "list-view")}>
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onEdit={() => onEditProduct(product.id)} viewMode={viewMode} showSupplier={canSeeSupplier} />
        ))}
      </div>
    </section>
  );
}

function Reports() {
  const { sales, products, expenses, purchaseReceipts } = useStore();
  const [period, setPeriod] = useState("30");
  const days = Number(period);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const inPeriod = (date: string) => new Date(date) >= since;
  const periodSales = sales.filter((sale) => inPeriod(sale.createdAt));
  const periodExpenses = expenses.filter((expense) => inPeriod(expense.createdAt));
  const periodPurchases = purchaseReceipts.filter((receipt) => inPeriod(receipt.createdAt));
  const soldByVariant = new Map<string, { name: string; quantity: number; total: number }>();
  for (const sale of periodSales) {
    for (const line of sale.lines) {
      const current = soldByVariant.get(line.variantId) ?? { name: line.name, quantity: 0, total: 0 };
      soldByVariant.set(line.variantId, { name: line.name, quantity: current.quantity + line.quantity, total: current.total + line.quantity * line.unitPrice });
    }
  }
  const bestSellers = Array.from(soldByVariant.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 6);
  const slowProducts = products
    .flatMap((product) => product.variants.map((variant) => ({ name: `${product.name} - ${variant.name}`, stock: variant.stock, sold: soldByVariant.get(variant.id)?.quantity ?? 0 })))
    .filter((item) => item.stock > 0 && item.sold === 0)
    .slice(0, 6);
  const marginByCategory = products.map((product) => {
    const variantIds = product.variants.map((variant) => variant.id);
    const margin = periodSales.flatMap((sale) => sale.lines).filter((line) => variantIds.includes(line.variantId)).reduce((sum, line) => sum + line.quantity * (line.unitPrice - line.unitCost), 0);
    return { category: product.category, margin };
  }).reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.margin;
    return acc;
  }, {});
  const purchasesBySupplier = periodPurchases.reduce<Record<string, number>>((acc, receipt) => {
    acc[receipt.supplier] = (acc[receipt.supplier] ?? 0) + receipt.total;
    return acc;
  }, {});
  const expensesByCategory = periodExpenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
    return acc;
  }, {});

  return (
    <section className="workspace">
      <div className="catalog-toolbar">
        <div>
          <strong>Reportes por periodo</strong>
          <span>{periodSales.length} venta(s), {periodExpenses.length} gasto(s), {periodPurchases.length} compra(s).</span>
        </div>
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="7">Ultimos 7 dias</option>
          <option value="30">Ultimos 30 dias</option>
          <option value="90">Ultimos 90 dias</option>
        </select>
      </div>
      <div className="metric-grid">
        <Metric label="Ventas" value={formatMoney(periodSales.reduce((sum, sale) => sum + sale.total, 0))} icon={<Receipt size={24} />} />
        <Metric label="Margen" value={formatMoney(periodSales.reduce((sum, sale) => sum + sale.margin, 0))} icon={<TrendUp size={24} />} />
        <Metric label="Gastos" value={formatMoney(periodExpenses.reduce((sum, expense) => sum + expense.amount, 0))} icon={<Wallet size={24} />} />
        <Metric label="Compras" value={formatMoney(periodPurchases.reduce((sum, receipt) => sum + receipt.total, 0))} icon={<Truck size={24} />} />
      </div>
      <div className="split">
        <Panel title="Productos mas vendidos">
          <DataList items={bestSellers.map((item) => ({ title: item.name, meta: `${item.quantity} unidad(es)`, value: formatMoney(item.total) }))} />
        </Panel>
        <Panel title="Productos inmovilizados">
          <DataList items={slowProducts.map((item) => ({ title: item.name, meta: `Stock ${item.stock}`, value: "0 ventas" }))} />
        </Panel>
      </div>
      <div className="split">
        <Panel title="Margen por categoria">
          <DataList items={Object.entries(marginByCategory).map(([category, total]) => ({ title: category, meta: "Margen estimado", value: formatMoney(total) }))} />
        </Panel>
        <Panel title="Compras por proveedor">
          <DataList items={Object.entries(purchasesBySupplier).map(([supplier, total]) => ({ title: supplier, meta: "Compras del periodo", value: formatMoney(total) }))} />
        </Panel>
      </div>
      <Panel title="Gastos por categoria y tendencia">
        <DataList items={Object.entries(expensesByCategory).map(([category, total]) => ({ title: category, meta: `Ultimos ${days} dias`, value: formatMoney(total) }))} />
      </Panel>
    </section>
  );
}

function System() {
  const { products, sales, quotes, transfers, expenses, movements, onlineOrders, purchaseReceipts, customers, suppliers, cashClosures, cashShifts, supplierPayments, businessProfile, categories, rolePermissions, updateRolePermissions, updateBusinessProfile, addCategory, removeCategory, markAllSynced } = useStore();
  const [newCategory, setNewCategory] = useState("");
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("roles");
  const [profileDraft, setProfileDraft] = useState(businessProfile);
  const pendingItems = [
    ...products.map((item) => ({ id: item.id, type: "Producto", title: item.name, syncStatus: item.syncStatus })),
    ...sales.map((item) => ({ id: item.id, type: "Venta", title: item.receiptNumber, syncStatus: item.syncStatus })),
    ...quotes.map((item) => ({ id: item.id, type: "Presupuesto", title: item.number, syncStatus: item.syncStatus })),
    ...transfers.map((item) => ({ id: item.id, type: "Transferencia", title: item.sender, syncStatus: item.syncStatus })),
    ...expenses.map((item) => ({ id: item.id, type: "Gasto", title: item.category, syncStatus: item.syncStatus })),
    ...movements.map((item) => ({ id: item.id, type: "Movimiento", title: item.reason, syncStatus: item.syncStatus })),
    ...onlineOrders.map((item) => ({ id: item.id, type: "Pedido web", title: item.number, syncStatus: item.syncStatus })),
    ...purchaseReceipts.map((item) => ({ id: item.id, type: "Compra", title: item.number, syncStatus: item.syncStatus })),
    ...customers.map((item) => ({ id: item.id, type: "Cliente", title: item.name, syncStatus: item.syncStatus })),
    ...suppliers.map((item) => ({ id: item.id, type: "Proveedor", title: item.name, syncStatus: item.syncStatus })),
    ...cashClosures.map((item) => ({ id: item.id, type: "Cierre", title: item.number, syncStatus: item.syncStatus })),
    ...cashShifts.map((item) => ({ id: item.id, type: "Turno", title: item.number, syncStatus: item.syncStatus })),
    ...supplierPayments.map((item) => ({ id: item.id, type: "Pago proveedor", title: item.supplier, syncStatus: item.syncStatus }))
  ].filter((item) => item.syncStatus !== "sincronizado");
  const permissionOptions = [
    ...sections.map((section) => ({ key: section.id, label: section.label })),
    { key: "descuentos", label: "Descuentos" }
  ] as const;
  const tabs: { id: SettingsPage; label: string; icon: typeof Gear }[] = [
    { id: "roles", label: "Roles y permisos", icon: Users },
    { id: "operativa", label: "Operativa", icon: Gear },
    { id: "categorias", label: "Categorias", icon: ListBullets },
    { id: "sincronizacion", label: "Sincronizacion", icon: ArrowClockwise },
    { id: "atajos", label: "Atajos", icon: Keyboard }
  ];

  return (
    <section className="workspace">
      <div className="module-workspace">
        <div className="module-topbar" aria-label="Secciones de configuracion">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={clsx("module-tab", settingsPage === tab.id && "active")} onClick={() => setSettingsPage(tab.id)}>
                <Icon size={18} weight="duotone" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {settingsPage === "roles" && (
        <Panel title="Roles y permisos">
          <div className="settings-list">
            {Object.entries(rolePermissions).map(([role, allowed]) => (
              <div key={role}>
                <div>
                  <strong>{roleLabels[role as Role]}</strong>
                  <span>{allowed.length} modulo(s) visibles</span>
                </div>
                <div className="settings-chips">
                  {permissionOptions.map((permission) => (
                    <label className="permission-chip" key={permission.key}>
                      <input
                        type="checkbox"
                        checked={allowed.includes(permission.key)}
                        onChange={(event) => {
                          const next = event.target.checked ? [...allowed, permission.key] : allowed.filter((item) => item !== permission.key);
                          updateRolePermissions(role as Role, next);
                        }}
                      />
                      {permission.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        )}
        {settingsPage === "operativa" && (
        <Panel title="Configuracion operativa">
          <div className="form-grid two">
            <label>
              Nombre comercial
              <input value={profileDraft.businessName} onChange={(event) => setProfileDraft({ ...profileDraft, businessName: event.target.value })} />
            </label>
            <label>
              Moneda
              <input value={profileDraft.currency} onChange={(event) => setProfileDraft({ ...profileDraft, currency: event.target.value.toUpperCase() })} />
            </label>
            <label>
              Dominio web
              <input value={profileDraft.publicDomain} onChange={(event) => setProfileDraft({ ...profileDraft, publicDomain: event.target.value })} />
            </label>
            <label>
              Subdominio interno
              <input value={profileDraft.internalDomain} onChange={(event) => setProfileDraft({ ...profileDraft, internalDomain: event.target.value })} />
            </label>
            <label>
              Telefono
              <input value={profileDraft.phone} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value })} placeholder="Telefono o WhatsApp" />
            </label>
            <label>
              Direccion
              <input value={profileDraft.address} onChange={(event) => setProfileDraft({ ...profileDraft, address: event.target.value })} placeholder="Local, ciudad o punto de retiro" />
            </label>
          </div>
          <div className="form-grid one compact">
            <label>
              Leyenda de comprobante interno
              <input value={profileDraft.receiptLegend} onChange={(event) => setProfileDraft({ ...profileDraft, receiptLegend: event.target.value })} />
            </label>
            <label>
              Politica de backups
              <input value={profileDraft.backupSchedule} onChange={(event) => setProfileDraft({ ...profileDraft, backupSchedule: event.target.value })} />
            </label>
            <button className="primary-action" onClick={() => updateBusinessProfile(profileDraft)}>
              <CheckCircle size={19} /> Guardar configuracion
            </button>
          </div>
          <div className="settings-grid">
            <SettingItem title="Perfil del negocio" text="Nombre comercial, datos de contacto, moneda y leyenda de comprobantes internos." />
            <SettingItem title="Catalogo" text="Categorias precargadas, visibilidad web y criterios de publicacion." />
            <SettingItem title="Caja y ventas" text="Medios de pago, descuentos permitidos y comprobante PDF interno." />
            <SettingItem title="Stock" text="Alertas de bajo stock, movimientos permitidos y control de costos." />
            <SettingItem title="Dominio publico" text={businessProfile.publicDomain} />
            <SettingItem title="Sistema interno" text={businessProfile.internalDomain} />
          </div>
          <div className="brand-concepts-panel">
            <div>
              <strong>Marca elegida</strong>
              <span>Fuente maestra: public/brand/regaleria-shop-logo_NEW.af. Exportacion web: public/brand/regaleria-shop-logo.svg.</span>
            </div>
            <img src="/brand/regaleria-shop-logo.svg" alt="Logo Regaleria Shop" />
          </div>
        </Panel>
        )}
        {settingsPage === "categorias" && (
        <Panel title="Categorias">
          <div className="form-grid one compact">
            <label>
              Nueva categoria
              <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Ej: Navidad" />
            </label>
            <button className="secondary-action full" onClick={() => {
              addCategory(newCategory);
              setNewCategory("");
            }} disabled={!newCategory.trim()}>
              <PlusCircle size={18} /> Agregar categoria
            </button>
          </div>
          <div className="settings-chips category-admin">
            {categories.map((category) => (
              <span className="chip" key={category}>
                {category}
                <button title={`Quitar ${category}`} onClick={() => removeCategory(category)}>x</button>
              </span>
            ))}
          </div>
        </Panel>
        )}
        {settingsPage === "atajos" && (
        <Panel title="Atajos de mostrador">
          <div className="settings-grid">
            <SettingItem title="F2" text="Ir directo a Ventas desde cualquier pantalla." />
            <SettingItem title="Ctrl / Cmd + K" text="Enfocar busqueda rapida global." />
          </div>
        </Panel>
        )}
        {settingsPage === "sincronizacion" && (
        <div className="split">
        <Panel title="Base para offline parcial">
          <div className="timeline">
            <Decision tone="calm" title="IDs locales" text="Las ventas, gastos, pedidos y movimientos nuevos usan prefijo local para sincronizar despues." />
            <Decision tone="growth" title="Estados de sincronizacion" text="Cada entidad operativa tiene estado sincronizado, pendiente, conflicto o fallo." />
            <Decision tone="urgent" title="Conflictos de stock" text="Si una operacion futura no puede sincronizar por falta de stock, queda marcada para resolver manualmente." />
          </div>
        </Panel>
        <Panel title="Cola local de sincronizacion">
          <DataList
            items={pendingItems.slice(0, 8).map((item) => ({
              title: `${item.type}: ${item.title}`,
              meta: item.syncStatus,
              value: "pendiente"
            }))}
          />
          <div className="checkout-row">
            <span>{pendingItems.length} elemento(s) en cola.</span>
            <button className="primary-action" onClick={markAllSynced} disabled={!pendingItems.length}>
              <ArrowClockwise size={19} /> Sincronizar demo
            </button>
          </div>
        </Panel>
      </div>
        )}
      </div>
    </section>
  );
}

function PublicShop() {
  const products = useStore((state) => state.products);
  const catalogStatus = useStore((state) => state.catalogStatus);
  const onlineOrders = useStore((state) => state.onlineOrders);
  const emailMessages = useStore((state) => state.emailMessages);
  const addOnlineOrder = useStore((state) => state.addOnlineOrder);
  const publishableProducts = products.filter((product) => product.publishable);
  const categories = Array.from(new Set(publishableProducts.map((product) => product.category))).sort();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [storePage, setStorePage] = useState<"catalog" | "cart">("catalog");
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"retiro" | "envio">("retiro");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [orderMessage, setOrderMessage] = useState("");
  const selectedProduct = publishableProducts.find((product) => product.id === selectedProductId);
  const visibleProducts = publishableProducts.filter((product) => {
    const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
    const search = query.trim().toLowerCase();
    return matchesCategory && (!search || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(search));
  });

  useEffect(() => {
    const title = storePage === "cart"
      ? "Carrito | Regaleria Shop"
      : selectedProduct
      ? selectedProduct.seoTitle || `${selectedProduct.name} | Regaleria Shop`
      : selectedCategory !== "Todos"
        ? `${selectedCategory} | Regaleria Shop`
        : "Regaleria Shop | Regalos, deco y accesorios";
    const description = storePage === "cart"
      ? "Revisá tu compra, elegí retiro o envío y confirmá tu pedido."
      : selectedProduct?.seoDescription || selectedProduct?.description || "Encontrá regalos, deco, bazar y accesorios con stock actualizado.";
    document.title = title;
    setMetaDescription(description);
  }, [selectedCategory, selectedProduct, storePage]);

  const addToCart = (product: Product, variant: Product["variants"][number]) => {
    if (variant.stock < 1) return;
    setCart((current) => mergeLine(current, buildUiSaleLine(product, variant, 1)));
    setOrderMessage(`${product.name} se agregó al carrito.`);
  };
  const updateCartQuantity = (variantId: string, nextQuantity: number) => {
    const product = publishableProducts.find((item) => item.variants.some((variant) => variant.id === variantId));
    const variant = product?.variants.find((item) => item.id === variantId);
    if (!variant) return;
    setCart((current) => current
      .map((line) => line.variantId === variantId ? { ...line, quantity: Math.min(nextQuantity, variant.stock) } : line)
      .filter((line) => line.quantity > 0));
  };
  const submitOrder = async () => {
    setOrderMessage("Registrando pedido...");
    const order = await addOnlineOrder({ customerName, customerContact, customerEmail, deliveryMethod, deliveryAddress, lines: cart });
    if (order) {
      setCustomerName("");
      setCustomerContact("");
      setCustomerEmail("");
      setDeliveryAddress("");
      setCart([]);
      setOrderMessage(`Pedido ${order.number} recibido. Te enviaremos la confirmación por correo.`);
    } else {
      setOrderMessage("No se pudo registrar el pedido. Revisa los datos e intenta nuevamente.");
    }
  };
  const heroProduct = publishableProducts.find((product) => product.imageUrl) ?? publishableProducts[0];

  return (
    <section className="storefront">
      <header className="store-header">
        <button className="store-brand" onClick={() => {
          setStorePage("catalog");
          setSelectedProductId(null);
          setSelectedCategory("Todos");
        }}>
          <BrandMark className="store-brand-mark" />
          <span><strong>Regaleria</strong><small>Shop</small></span>
        </button>
        <label className="store-search">
          <MagnifyingGlass size={20} />
          <input value={query} onChange={(event) => {
            setQuery(event.target.value);
            setStorePage("catalog");
            setSelectedProductId(null);
          }} placeholder="Buscar regalos, deco, bazar y más" />
        </label>
        <button
          className={clsx("store-cart-button", storePage === "cart" && "active")}
          aria-label={`Carrito, ${cart.reduce((sum, line) => sum + line.quantity, 0)} productos`}
          onClick={() => setStorePage("cart")}
        >
          <ShoppingCartSimple size={22} />
          <span>{cart.reduce((sum, line) => sum + line.quantity, 0)}</span>
        </button>
      </header>
      <nav className="store-categories" aria-label="Categorías de la tienda">
        <button className={clsx(selectedCategory === "Todos" && "active")} onClick={() => {
          setStorePage("catalog");
          setSelectedCategory("Todos");
          setSelectedProductId(null);
        }}><House size={17} /> Inicio</button>
        {categories.map((category) => (
          <button key={category} className={clsx(selectedCategory === category && "active")} onClick={() => {
            setStorePage("catalog");
            setSelectedCategory(category);
            setSelectedProductId(null);
          }}>{category}</button>
        ))}
      </nav>
      {storePage === "cart" ? (
        <main className="store-cart-page">
          <button className="store-back-button" onClick={() => setStorePage("catalog")}>
            <ArrowLeft size={18} /> Seguir comprando
          </button>
          <div className="store-cart-title">
            <div>
              <span>Tu compra</span>
              <h1>Carrito</h1>
              <p>{cart.length ? "Revisá los productos y completá los datos para confirmar." : "Todavía no agregaste productos."}</p>
            </div>
            <strong>{formatMoney(saleLineTotal(cart))}</strong>
          </div>
          {cart.length ? (
            <div className="store-cart-layout">
              <section className="store-cart-items" aria-label="Productos del carrito">
                {cart.map((line) => {
                  const product = publishableProducts.find((item) => item.id === line.productId);
                  const variant = product?.variants.find((item) => item.id === line.variantId);
                  return (
                    <article key={line.variantId} className="store-cart-line">
                      <img src={product?.imageUrl} alt="" />
                      <div className="store-cart-line-info">
                        <strong>{line.name}</strong>
                        <span>{variant?.name} · {line.sku}</span>
                        <small>{formatMoney(line.unitPrice)} por unidad</small>
                      </div>
                      <div className="store-quantity-control" aria-label={`Cantidad de ${line.name}`}>
                        <button aria-label={`Quitar una unidad de ${line.name}`} onClick={() => updateCartQuantity(line.variantId, line.quantity - 1)}>
                          <MinusCircle size={20} />
                        </button>
                        <strong>{line.quantity}</strong>
                        <button aria-label={`Agregar una unidad de ${line.name}`} onClick={() => updateCartQuantity(line.variantId, line.quantity + 1)} disabled={line.quantity >= (variant?.stock ?? line.quantity)}>
                          <PlusCircle size={20} />
                        </button>
                      </div>
                      <strong className="store-cart-line-total">{formatMoney(line.quantity * line.unitPrice)}</strong>
                      <button className="icon-button" aria-label={`Eliminar ${line.name} del carrito`} onClick={() => setCart((current) => current.filter((item) => item.variantId !== line.variantId))}>
                        <Trash size={18} />
                      </button>
                    </article>
                  );
                })}
              </section>
              <aside className="store-cart-summary">
                <h2>Datos de la compra</h2>
                <div className="store-checkout-form">
                  <label>
                    Nombre
                    <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nombre y apellido" />
                  </label>
                  <label>
                    Email
                    <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="tu@email.com" />
                  </label>
                  <label>
                    Teléfono
                    <input value={customerContact} onChange={(event) => setCustomerContact(event.target.value)} placeholder="WhatsApp o teléfono" />
                  </label>
                  <div className="segmented-control">
                    <button className={clsx(deliveryMethod === "retiro" && "active")} onClick={() => setDeliveryMethod("retiro")}>Retiro</button>
                    <button className={clsx(deliveryMethod === "envio" && "active")} onClick={() => setDeliveryMethod("envio")}>Envío</button>
                  </div>
                  {deliveryMethod === "envio" && <label>Dirección<input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Calle, número y localidad" /></label>}
                </div>
                <div className="store-cart-total">
                  <span>Total</span>
                  <strong>{formatMoney(saleLineTotal(cart))}</strong>
                </div>
                <button className="store-checkout-button" onClick={submitOrder} disabled={!customerName.trim() || !customerContact.trim() || !customerEmail.includes("@") || (deliveryMethod === "envio" && !deliveryAddress.trim())}>
                  Confirmar pedido
                </button>
                {orderMessage && <p className="store-order-message" aria-live="polite">{orderMessage}</p>}
              </aside>
            </div>
          ) : (
            <div className="store-cart-empty">
              <ShoppingCartSimple size={38} />
              <h2>{orderMessage.startsWith("Pedido ") ? "Pedido confirmado" : "Tu carrito está vacío"}</h2>
              <p>{orderMessage || "Explorá el catálogo y agregá los productos que quieras comprar."}</p>
              <button className="store-primary-button" onClick={() => setStorePage("catalog")}>Ver productos</button>
            </div>
          )}
        </main>
      ) : (
        <>
      {!selectedProduct && selectedCategory === "Todos" && !query.trim() && (
        <section className="store-hero" style={heroProduct ? { backgroundImage: `linear-gradient(90deg, rgba(18,42,33,.92), rgba(18,42,33,.28)), url("${heroProduct.imageUrl}")` } : undefined}>
          <div>
            <span>Regalos para cada momento</span>
            <h1>Encontrá algo especial sin dar mil vueltas</h1>
            <p>Productos con stock actualizado, retiro en el local y opciones de envío.</p>
            <button onClick={() => document.getElementById("store-products")?.scrollIntoView({ behavior: "smooth" })}>Ver productos</button>
          </div>
        </section>
      )}
      <div className="store-benefits">
        <span><Truck size={21} /> Envíos y retiro</span>
        <span><CheckCircle size={21} /> Stock actualizado</span>
        <span><Heart size={21} /> Selección para regalar</span>
      </div>
      {selectedProduct ? (
        <StoreProductDetail product={selectedProduct} onBack={() => setSelectedProductId(null)} onAdd={addToCart} />
      ) : (
        <main className="store-content" id="store-products">
          <div className="store-section-heading">
            <div>
              <span>{selectedCategory === "Todos" ? "Catálogo" : selectedCategory}</span>
              <h2>{query.trim() ? `Resultados para “${query.trim()}”` : selectedCategory === "Todos" ? "Productos destacados" : `Todo en ${selectedCategory}`}</h2>
            </div>
            <strong>{catalogStatus === "cargando" ? "Actualizando..." : `${visibleProducts.length} productos`}</strong>
          </div>
          <div className="store-product-grid">
            {visibleProducts.map((product) => {
              const available = product.variants.filter((variant) => variant.stock > 0);
              const startingPrice = Math.min(...product.variants.map((variant) => variant.price));
              return (
                <article className="store-product-card" key={product.id}>
                  <button className="store-product-image" onClick={() => setSelectedProductId(product.id)}>
                    <img src={product.imageUrl} alt={`${product.name}, ${product.category}`} />
                  </button>
                  <div>
                    <span>{product.category}</span>
                    <button className="store-product-name" onClick={() => setSelectedProductId(product.id)}>{product.name}</button>
                    <strong>{formatMoney(startingPrice)}</strong>
                    <small>{available.length ? `${available.length} opción(es) con stock` : "Sin stock"}</small>
                    <button className="store-primary-button" onClick={() => available[0] && addToCart(product, available[0])} disabled={!available.length}>
                      <ShoppingCartSimple size={18} /> Agregar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!visibleProducts.length && <div className="store-empty">No encontramos productos con esos filtros.</div>}
        </main>
      )}
        </>
      )}
      {!isPublicWebsite() && (
        <section className="store-admin-preview">
          <Panel title="Pedidos y correos generados">
            <DataList
            items={onlineOrders.slice(0, 4).map((order) => ({
              title: order.number,
              meta: `${order.customerName} · ${order.status} · ${order.deliveryMethod}`,
              value: formatMoney(order.total)
            }))}
          />
          <DataList items={emailMessages.slice(0, 4).map((email) => ({ title: email.subject, meta: `${email.to} · ${email.status}`, value: email.kind }))} />
          </Panel>
        </section>
      )}
      <footer className="store-footer">
        <div className="store-brand"><BrandMark className="store-brand-mark" /><span><strong>Regaleria</strong><small>Shop</small></span></div>
        <p>Regalos, deco y accesorios seleccionados con cariño.</p>
        <span><EnvelopeSimple size={17} /> Atención por email y WhatsApp</span>
      </footer>
    </section>
  );
}

function StoreProductDetail({ product, onBack, onAdd }: { product: Product; onBack: () => void; onAdd: (product: Product, variant: Product["variants"][number]) => void }) {
  const gallery = product.imageUrls?.length ? product.imageUrls : [product.imageUrl];
  const [image, setImage] = useState(gallery[0]);
  const [variantId, setVariantId] = useState(product.variants.find((variant) => variant.stock > 0)?.id ?? product.variants[0]?.id ?? "");
  const variant = product.variants.find((item) => item.id === variantId);
  return (
    <main className="store-product-detail">
      <button className="store-back-button" onClick={onBack}>Volver al catálogo</button>
      <div className="store-product-gallery">
        <img src={image} alt={product.name} />
        <div>{gallery.map((url, index) => <button key={url} className={clsx(url === image && "active")} onClick={() => setImage(url)}><img src={url} alt={`${product.name}, vista ${index + 1}`} /></button>)}</div>
      </div>
      <div className="store-product-info">
        <span>{product.category}</span>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <label>Elegí una opción<select value={variantId} onChange={(event) => setVariantId(event.target.value)}>{product.variants.map((item) => <option key={item.id} value={item.id} disabled={item.stock < 1}>{item.name} · {formatMoney(item.price)}{item.stock < 1 ? " · Sin stock" : ""}</option>)}</select></label>
        {variant && <><strong className="store-detail-price">{formatMoney(variant.price)}</strong><small>{variant.stock > 0 ? `${variant.stock} disponible(s)` : "Sin stock"}</small></>}
        <button className="store-primary-button large" onClick={() => variant && onAdd(product, variant)} disabled={!variant || variant.stock < 1}><ShoppingCartSimple size={20} /> Agregar al carrito</button>
      </div>
    </main>
  );
}

function SeoGuidance({
  name,
  description,
  seoTitle,
  seoDescription,
  onTitleChange,
  onDescriptionChange
}: {
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  const titleValue = seoTitle || name;
  const descriptionValue = seoDescription || description;
  const checks = [
    { ok: titleValue.length >= 30 && titleValue.length <= 60, text: "Título entre 30 y 60 caracteres" },
    { ok: descriptionValue.length >= 90 && descriptionValue.length <= 160, text: "Descripción entre 90 y 160 caracteres" },
    { ok: name.trim().length > 3 && titleValue.toLowerCase().includes(name.trim().toLowerCase().split(" ")[0] ?? ""), text: "El título menciona el producto" },
    { ok: description.trim().length >= 40, text: "La ficha explica qué es y para quién sirve" }
  ];
  const score = checks.filter((check) => check.ok).length;
  return (
    <section className="seo-guidance">
      <div className="seo-heading">
        <div><strong>SEO para la web</strong><span>{score}/4 recomendaciones cumplidas</span></div>
        <span className={clsx("seo-score", score >= 3 && "good")}>{score >= 3 ? "Bien preparado" : "A mejorar"}</span>
      </div>
      <label>Título SEO<input value={seoTitle} onChange={(event) => onTitleChange(event.target.value)} placeholder={name ? `${name} | Regaleria Shop` : "Nombre del producto | Regaleria Shop"} /><small>{titleValue.length}/60</small></label>
      <label>Descripción SEO<textarea value={seoDescription} onChange={(event) => onDescriptionChange(event.target.value)} placeholder={description || "Resumen claro del producto, beneficio y ocasión de regalo."} /><small>{descriptionValue.length}/160</small></label>
      <div className="seo-checks">{checks.map((check) => <span className={clsx(check.ok && "complete")} key={check.text}><CheckCircle size={15} /> {check.text}</span>)}</div>
    </section>
  );
}

function ProductCard({ product, onEdit, viewMode, showSupplier }: { product: Product; onEdit: () => void; viewMode: "grid" | "list"; showSupplier: boolean }) {
  const [imageIndex, setImageIndex] = useState(0);
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  const prices = product.variants.map((variant) => variant.price).filter((price) => price > 0);
  const priceFrom = prices.length ? Math.min(...prices) : 0;
  const gallery = product.imageUrls?.length ? product.imageUrls : [product.imageUrl];

  return (
    <article className={clsx("catalog-item", viewMode === "list" && "list-item")}>
      <div className="catalog-image-wrap">
        <img src={gallery[imageIndex] ?? product.imageUrl} alt="" onError={(event) => (event.currentTarget.style.visibility = "hidden")} />
        {gallery.length > 1 && (
          <div className="gallery-dots">
            {gallery.map((url, index) => (
              <button className={clsx(index === imageIndex && "active")} key={url} title={`Foto ${index + 1}`} onClick={() => setImageIndex(index)} />
            ))}
          </div>
        )}
      </div>
      <div className="catalog-summary">
        <div className="catalog-title-row">
          <div>
            <strong>{product.name}</strong>
            <span className="catalog-price">{priceFrom ? formatMoney(priceFrom) : "Sin precio"}</span>
            <p>{product.description}</p>
          </div>
          <button className="secondary-action compact-button" onClick={onEdit}>
            <PencilSimple size={18} /> Editar
          </button>
        </div>
        <div className="catalog-meta">
          <span className="chip">{product.category}</span>
          {showSupplier && <span className="chip">{product.supplier}</span>}
          <span className={clsx("chip", product.publishable && "success")}>{product.publishable ? "Web publica" : "Interno"}</span>
          <span className="chip">Stock {totalStock}</span>
        </div>
      </div>
    </article>
  );
}

function ProductEditor({
  product,
  suppliers,
  categories,
  canDelete,
  canSeeSupplier,
  onSave,
  onDelete,
  onBack
}: {
  product: Product;
  suppliers: Supplier[];
  categories: string[];
  canDelete: boolean;
  canSeeSupplier: boolean;
  onSave: (input: ProductUpdateInput) => Promise<boolean>;
  onDelete: (productId: string) => Promise<boolean>;
  onBack: () => void;
}) {
  const [imageStatus, setImageStatus] = useState("Seleccioná una o varias imágenes JPG, PNG o WebP.");
  const [selectedImage, setSelectedImage] = useState(0);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");
  const [draft, setDraft] = useState({
    name: product.name,
    category: product.category,
    supplier: product.supplier,
    description: product.description,
    imageUrl: product.imageUrl,
    imageUrls: product.imageUrls?.length ? product.imageUrls : [product.imageUrl],
    slug: product.slug ?? slugify(product.name),
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    publishable: product.publishable
  });

  useEffect(() => {
    setDraft({
      name: product.name,
      category: product.category,
      supplier: product.supplier,
      description: product.description,
      imageUrl: product.imageUrl,
      imageUrls: product.imageUrls?.length ? product.imageUrls : [product.imageUrl],
      slug: product.slug ?? slugify(product.name),
      seoTitle: product.seoTitle ?? "",
      seoDescription: product.seoDescription ?? "",
      publishable: product.publishable
    });
    setSelectedImage(0);
  }, [product]);

  const supplierOptions = suppliers.some((supplier) => supplier.name === product.supplier)
    ? suppliers
    : [{ id: "current_supplier", name: product.supplier, phone: "", email: "", note: "", createdAt: "", syncStatus: "sincronizado" as const }, ...suppliers];
  const categoryOptions = categories.includes(product.category) ? categories : [product.category, ...categories];
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  const gallery = draft.imageUrls.filter(Boolean);
  const mainImage = gallery[selectedImage] ?? gallery[0] ?? product.imageUrl;

  const save = async () => {
    const imageUrls = gallery.length ? gallery : [draft.imageUrl].filter(Boolean);
    setSaveStatus("Guardando en la nube...");
    const saved = await onSave({ productId: product.id, ...draft, imageUrl: imageUrls[0] || draft.imageUrl, imageUrls });
    if (saved) {
      onBack();
      return;
    }
    setSaveStatus("No se pudo guardar en la nube. Intenta nuevamente.");
  };
  const addImageUrl = (url: string) => {
    const clean = url.trim();
    if (!clean) return;
    setDraft((current) => {
      const next = [...current.imageUrls, clean];
      setSelectedImage(next.length - 1);
      return { ...current, imageUrl: current.imageUrl || clean, imageUrls: next };
    });
  };
  const removeImage = (index: number) => {
    setDraft((current) => {
      const next = current.imageUrls.filter((_, currentIndex) => currentIndex !== index);
      return { ...current, imageUrl: next[0] ?? "", imageUrls: next };
    });
    setSelectedImage(0);
  };
  const loadProductPhotos = async (files?: FileList | null) => {
    if (!files?.length) return;
    setIsSavingImage(true);
    setImageStatus(`Subiendo ${files.length} imagen(es)...`);
    const uploaded: string[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        uploaded.push(await uploadProductImage(product.id, draft.name || product.name, file));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `No se pudo subir ${file.name}.`);
      }
    }
    if (uploaded.length) {
      setDraft((current) => {
        const next = [...current.imageUrls, ...uploaded];
        setSelectedImage(next.length - 1);
        return { ...current, imageUrl: current.imageUrl || uploaded[0], imageUrls: next };
      });
    }
    setImageStatus(errors.length ? `${uploaded.length} cargada(s). ${errors[0]}` : `${uploaded.length} imagen(es) guardada(s) en la nube. Guarda el producto para confirmar.`);
    setIsSavingImage(false);
  };
  const removeProduct = async () => {
    setDeleteStatus("Eliminando de la nube...");
    const deleted = await onDelete(product.id);
    if (deleted) {
      onBack();
      return;
    }
    setDeleteStatus("No se pudo eliminar el producto. Intenta nuevamente.");
  };

  return (
    <section className="workspace product-editor-page">
      <div className="editor-header">
        <button className="secondary-action" onClick={onBack}>Volver al catalogo</button>
        <div>
          <span>Editar producto</span>
          <h2>{product.name}</h2>
        </div>
        <button className="primary-action" onClick={save} disabled={!draft.name.trim() || isSavingImage}>
          <CheckCircle size={18} /> Guardar producto
        </button>
        {saveStatus && <span className="muted-text">{saveStatus}</span>}
      </div>
      {canDelete && (
        <section className="delete-product-zone" aria-label="Eliminar producto">
          {!isConfirmingDelete ? (
            <>
              <div>
                <strong>Eliminar producto</strong>
                <span>Se quitará del catálogo y de la web. El historial de operaciones se conserva.</span>
              </div>
              <button className="danger-action" onClick={() => setIsConfirmingDelete(true)}>
                <Trash size={18} /> Eliminar
              </button>
            </>
          ) : (
            <>
              <div>
                <strong>¿Eliminar “{product.name}”?</strong>
                <span>Esta acción no se puede deshacer.</span>
                {deleteStatus && <span className="error-text">{deleteStatus}</span>}
              </div>
              <div className="delete-confirm-actions">
                <button className="secondary-action" onClick={() => {
                  setIsConfirmingDelete(false);
                  setDeleteStatus("");
                }}>Cancelar</button>
                <button className="danger-action" onClick={removeProduct} disabled={deleteStatus === "Eliminando de la nube..."}>
                  <Trash size={18} /> Confirmar eliminación
                </button>
              </div>
            </>
          )}
        </section>
      )}
      <div className="product-editor-layout">
        <section className="editor-media">
          <div className="editor-main-image">
            {mainImage ? <img src={mainImage} alt="" /> : <span>Sin imagen</span>}
          </div>
          <div className="image-tile-grid">
            {gallery.map((url, index) => (
              <button className={clsx("image-tile", selectedImage === index && "active")} key={`${url}-${index}`} onClick={() => setSelectedImage(index)} title={`Ver imagen ${index + 1}`}>
                <img src={url} alt="" />
                <span>{index + 1}</span>
              </button>
            ))}
            {Array.from({ length: Math.max(0, 4 - gallery.length) }).map((_, index) => (
              <label className="image-tile add-tile" key={`add-${index}`}>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => loadProductPhotos(event.target.files)} />
                <PlusCircle size={24} />
              </label>
            ))}
          </div>
          <div className="image-actions">
            <label className="secondary-action">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => loadProductPhotos(event.target.files)} />
              <PlusCircle size={18} /> Agregar imagen
            </label>
            <button className="secondary-action" onClick={() => removeImage(selectedImage)} disabled={!gallery.length}>
              <Trash size={18} /> Quitar actual
            </button>
          </div>
          <span className="muted-text">{isSavingImage ? "Guardando imágenes..." : imageStatus}</span>
        </section>

        <section className="editor-details">
          <div className="editor-form-band">
            <label>
              Producto
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </label>
            <div className="form-grid two">
              <label>
                Categoria
                <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              {canSeeSupplier && <label>
                Proveedor
                <select value={draft.supplier} onChange={(event) => setDraft({ ...draft, supplier: event.target.value })}>
                  {supplierOptions.map((supplier) => (
                    <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                  ))}
                </select>
              </label>}
            </div>
            <label>
              Descripcion publicable
              <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Descripcion corta para la web" />
            </label>
            <SeoGuidance
              name={draft.name}
              description={draft.description}
              seoTitle={draft.seoTitle}
              seoDescription={draft.seoDescription}
              onTitleChange={(seoTitle) => setDraft({ ...draft, seoTitle })}
              onDescriptionChange={(seoDescription) => setDraft({ ...draft, seoDescription })}
            />
            <label className="check-row">
              <input type="checkbox" checked={draft.publishable} onChange={(event) => setDraft({ ...draft, publishable: event.target.checked })} />
              Mostrar en web publica
            </label>
          </div>
          <div className="catalog-meta">
            <span className="chip">{draft.category}</span>
            {canSeeSupplier && <span className="chip">{draft.supplier}</span>}
            <span className={clsx("chip", draft.publishable && "success")}>{draft.publishable ? "Web publica" : "Interno"}</span>
          <span className="chip">Stock {totalStock}</span>
          </div>
        </section>
      </div>
    </section>
  );
}

function SettingItem({ title, text }: { title: string; text: string }) {
  return (
    <article>
      <strong>{title}</strong>
      <span>{text}</span>
    </article>
  );
}

function ContactForm({
  draft,
  setDraft,
  primaryLabel,
  onSubmit
}: {
  draft: { name: string; phone: string; email: string; note: string };
  setDraft: (draft: { name: string; phone: string; email: string; note: string }) => void;
  primaryLabel: string;
  onSubmit: () => void;
}) {
  return (
    <div className="form-grid one">
      <label>
        Nombre
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </label>
      <div className="form-grid two">
        <label>
          Telefono
          <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
        </label>
        <label>
          Email
          <input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
        </label>
      </div>
      <label>
        Nota
        <input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
      </label>
      <button className="primary-action" onClick={onSubmit} disabled={!draft.name.trim()}>
        <PlusCircle size={19} /> {primaryLabel}
      </button>
    </div>
  );
}

function ContactList<T extends Customer | Supplier>({
  contacts,
  empty,
  onEdit,
  onDelete,
  onRestore,
  restoreLabel = "Restaurar"
}: {
  contacts: T[];
  empty: string;
  onEdit: (contact: T) => void;
  onDelete?: (contact: T) => void;
  onRestore?: (contact: T) => void;
  restoreLabel?: string;
}) {
  if (!contacts.length) return <div className="empty-lines">{empty}</div>;
  return (
    <div className="table contact-list">
      {contacts.map((contact) => (
        <div className="table-row" key={contact.id}>
          <div>
            <strong>{contact.name}</strong>
            <span>{[contact.phone, contact.email, contact.note].filter(Boolean).join(" · ") || "Sin datos extra"}</span>
          </div>
          <Status status={contact.syncStatus} />
          <div className="contact-actions">
            {onRestore ? (
              <button className="secondary-action" onClick={() => onRestore(contact)}>
                <ArrowClockwise size={17} /> {restoreLabel}
              </button>
            ) : (
              <button className="secondary-action" onClick={() => onEdit(contact)}>
                <PencilSimple size={17} /> Editar
              </button>
            )}
            {onDelete && (
              <button className="secondary-action danger" onClick={() => onDelete(contact)}>
                <Trash size={17} /> Borrar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CartLines({ lines, onRemove }: { lines: SaleLine[]; onRemove: (variantId: string) => void }) {
  if (!lines.length) {
    return <div className="empty-lines">Sin lineas cargadas.</div>;
  }
  return (
    <div className="cart-lines">
      {lines.map((line) => (
        <div key={line.variantId}>
          <div>
            <strong>{line.name}</strong>
            <span>{line.quantity} x {formatMoney(line.unitPrice)} · {line.sku}</span>
          </div>
          <strong>{formatMoney(line.quantity * line.unitPrice)}</strong>
          <button className="icon-button" title="Quitar linea" onClick={() => onRemove(line.variantId)}>
            <Trash size={17} />
          </button>
        </div>
      ))}
    </div>
  );
}

function PurchaseLines({ lines, onRemove }: { lines: PurchaseLine[]; onRemove: (variantId: string) => void }) {
  if (!lines.length) {
    return <div className="empty-lines">Sin productos de compra cargados.</div>;
  }
  return (
    <div className="cart-lines">
      {lines.map((line) => (
        <div key={line.variantId}>
          <div>
            <strong>{line.name}</strong>
            <span>{line.quantity} x {formatMoney(line.unitCost)} · {line.sku}</span>
          </div>
          <strong>{formatMoney(line.subtotal)}</strong>
          <button className="icon-button" title="Quitar linea" onClick={() => onRemove(line.variantId)}>
            <Trash size={17} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="metric">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Decision({ title, text, tone }: { title: string; text: string; tone: "urgent" | "calm" | "growth" }) {
  return (
    <article className={clsx("decision", tone)}>
      <CheckCircle size={20} weight="duotone" />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function DataList({ items }: { items: { title: string; meta: string; value: string }[] }) {
  return (
    <div className="data-list">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`}>
          <div>
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function Status({ status }: { status: Product["syncStatus"] }) {
  return (
    <span className={clsx("status", status)}>
      <ClockCounterClockwise size={14} />
      {status.replace("_", " ")}
    </span>
  );
}

function findProductVariant(products: Product[], variantId: string) {
  return useMemo(() => {
    for (const product of products) {
      const variant = product.variants.find((item) => item.id === variantId);
      if (variant) return { product, variant };
    }
    return null;
  }, [products, variantId]);
}

function findVariantName(products: Product[], variantId: string) {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return `${product.name} - ${variant.name}`;
  }
  return "Variante no encontrada";
}

function variantOptions(products: Product[]) {
  return products.flatMap((product) =>
    product.variants.map((variant) => (
      <option key={variant.id} value={variant.id}>
        {product.name} - {variant.name} ({variant.stock})
      </option>
    ))
  );
}

function buildUiSaleLine(product: Product, variant: Product["variants"][number], quantity: number): SaleLine {
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

function buildPurchaseLine(product: Product, variant: Product["variants"][number], quantity: number, unitCost: number): PurchaseLine {
  return {
    productId: product.id,
    variantId: variant.id,
    name: `${product.name} - ${variant.name}`,
    sku: variant.sku,
    quantity,
    unitCost,
    subtotal: quantity * unitCost
  };
}

function inferPurchaseDraftFromAi(products: Product[], source: string, fileName: string): PurchaseLine[] {
  const normalized = `${source} ${fileName}`.toLowerCase();
  const matches = products.flatMap((product) =>
    product.variants
      .filter((variant) => {
        const tokens = [product.name, product.category, product.supplier, variant.name, variant.sku, variant.barcode].join(" ").toLowerCase();
        return normalized ? tokens.split(/\s+/).some((token) => token.length > 3 && normalized.includes(token)) : false;
      })
      .map((variant) => {
        const quantityMatch = normalized.match(new RegExp(`${variant.sku.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\D+(\\d+)`));
        const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
        return buildPurchaseLine(product, variant, Math.max(quantity, 1), variant.cost);
      })
  );

  if (matches.length) return matches.slice(0, 8);
  return products.slice(0, 3).map((product) => buildPurchaseLine(product, product.variants[0], 1, product.variants[0].cost));
}

function resolveCustomerName(customers: Customer[], choice: string, newCustomerName: string) {
  if (choice === "consumidor_final") return "Consumidor final";
  if (choice === "nuevo") return newCustomerName.trim();
  return customers.find((customer) => customer.id === choice)?.name ?? "";
}

function resolveSupplierName(suppliers: Supplier[], choice: string, newSupplierName: string) {
  if (choice === "nuevo") return newSupplierName.trim();
  return suppliers.find((supplier) => supplier.id === choice)?.name ?? "";
}

function parseImportRows(text: string): ImportProductRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, category, supplier, sku, price, cost, stock] = line.split(";").map((value) => value.trim());
      return {
        name,
        category,
        supplier,
        sku,
        price: Number(price),
        cost: Number(cost),
        stock: Number(stock)
      };
    });
}

function mergeLine(lines: SaleLine[], next: SaleLine) {
  const found = lines.find((line) => line.variantId === next.variantId);
  if (!found) return [...lines, next];
  return lines.map((line) => (line.variantId === next.variantId ? { ...line, quantity: line.quantity + next.quantity } : line));
}

function mergePurchaseLine(lines: PurchaseLine[], next: PurchaseLine) {
  const found = lines.find((line) => line.variantId === next.variantId);
  if (!found) return [...lines, next];
  return lines.map((line) =>
    line.variantId === next.variantId
      ? {
          ...line,
          quantity: line.quantity + next.quantity,
          unitCost: next.unitCost,
          subtotal: (line.quantity + next.quantity) * next.unitCost
        }
      : line
  );
}

function saleLineTotal(lines: SaleLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

function purchaseLineTotal(lines: PurchaseLine[]) {
  return lines.reduce((sum, line) => sum + line.subtotal, 0);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function setMetaDescription(content: string) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content.slice(0, 160));
}
