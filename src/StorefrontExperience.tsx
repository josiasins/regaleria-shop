import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CrosshairSimple,
  Desktop,
  DeviceMobile,
  DeviceTablet,
  Eye,
  Heart,
  House,
  Image,
  ImagesSquare,
  ListMagnifyingGlass,
  MagnifyingGlass,
  Minus,
  Package,
  PencilSimple,
  Plus,
  ShoppingBag,
  ShoppingCartSimple,
  Sparkle,
  SpinnerGap,
  SquaresFour,
  Stack,
  Trash,
  Truck,
  UploadSimple
} from "@phosphor-icons/react";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { loadPublicCatalogSnapshot } from "./catalogCloud";
import { uploadStorefrontImage } from "./fileStorage";
import { formatMoney } from "./receipt";
import {
  createDefaultStorefrontImagePositions,
  createDefaultStorefrontSettings,
  normalizeStorefrontSettings,
  productsForStorefrontSection,
  type StorefrontCategoryCard,
  type StorefrontImagePositions,
  type StorefrontSection,
  type StorefrontSettings,
  type StorefrontViewport
} from "./storefront";
import {
  canEditStorefront,
  generateLifestyleImage,
  loadStorefrontSettings,
  saveStorefrontSettings,
  subscribeToStorefrontSettings
} from "./storefrontCloud";
import { useStore } from "./store";
import type { Product, SaleLine } from "./types";

type StorePage = "home" | "catalog" | "cart";
type StudioPage = "vista" | "portada" | "categorias" | "secciones" | "lifestyle";
type PreviewMode = StorefrontViewport;

const cartStorageKey = "regaleria-public-cart-v1";
const storefrontPreviewStorageKey = "regaleria-storefront-studio-preview-v1";
const storefrontPreviewMessage = "regaleria-storefront-preview";

function loadStudioPreviewPayload() {
  if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("studioPreview") !== "1") return {};
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(storefrontPreviewStorageKey) ?? "null");
    if (parsed?.settings?.version === 1) {
      return {
        settings: parsed.settings as StorefrontSettings,
        products: Array.isArray(parsed.products) ? parsed.products as Product[] : []
      };
    }
    return parsed?.version === 1 ? { settings: parsed as StorefrontSettings, products: [] } : {};
  } catch {
    return {};
  }
}

function publicPrice(variant: Product["variants"][number]) {
  return variant.webPrice ?? variant.price;
}

function firstAvailableVariant(product: Product) {
  return product.variants.find((variant) => variant.stock > 0);
}

function lineTotal(lines: SaleLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

function saleLine(product: Product, variant: Product["variants"][number]): SaleLine {
  return {
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    sku: variant.sku,
    quantity: 1,
    unitPrice: publicPrice(variant),
    unitCost: variant.cost
  };
}

function loadCart() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(cartStorageKey) ?? "[]");
    return Array.isArray(parsed) ? (parsed as SaleLine[]) : [];
  } catch {
    return [];
  }
}

function productSearchText(product: Product) {
  return `${product.name} ${product.category} ${product.brand ?? ""} ${product.description} ${product.variants
    .map((variant) => `${variant.name} ${variant.sku} ${variant.barcode}`)
    .join(" ")}`.toLocaleLowerCase();
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function replaceAt<T>(items: T[], index: number, value: T) {
  return items.map((item, currentIndex) => currentIndex === index ? value : item);
}

function useStorefrontSettings(products: Product[], override?: StorefrontSettings) {
  const signature = products.map((product) => `${product.id}:${product.category}:${product.publishable}`).join("|");
  const [settings, setSettings] = useState(() => override ?? createDefaultStorefrontSettings(products));

  useEffect(() => {
    if (override) {
      setSettings(normalizeStorefrontSettings(override, products));
      return;
    }
    let active = true;
    void loadStorefrontSettings(products).then((loaded) => {
      if (active) setSettings(loaded);
    });
    const unsubscribe = subscribeToStorefrontSettings(products, (nextSettings) => {
      if (active) setSettings(nextSettings);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [override, signature]);

  return settings;
}

function BrandLockup() {
  return (
    <span className="sf-brand-lockup" aria-label="Regaleria Shop">
      <img className="sf-brand-logo" src="/brand/regaleria-shop-gift-mark.svg" alt="" />
      <span className="sf-brand-name">Regaleria<small>SHOP</small></span>
    </span>
  );
}

function ProductTile({ product, onOpen, onAdd }: { product: Product; onOpen: () => void; onAdd: () => void }) {
  const available = firstAvailableVariant(product);
  const prices = product.variants.map(publicPrice).filter(Number.isFinite);
  const price = prices.length ? Math.min(...prices) : 0;
  return (
    <article className="sf-product-card">
      <button className="sf-product-photo" onClick={onOpen} aria-label={`Ver ${product.name}`}>
        {product.imageUrl ? <img src={product.imageUrl} alt={`${product.name}, ${product.category}`} /> : <Package size={34} />}
        {available ? <span>Disponible</span> : <span className="sold-out">Sin stock</span>}
      </button>
      <div className="sf-product-copy">
        <small>{product.category}</small>
        <button className="sf-product-title" onClick={onOpen}>{product.name}</button>
        <strong>{formatMoney(price)}</strong>
        <button className="sf-add-button" onClick={onAdd} disabled={!available}>
          <Plus size={17} weight="bold" /> Agregar
        </button>
      </div>
    </article>
  );
}

function ProductDetail({ product, onBack, onAdd }: { product: Product; onBack: () => void; onAdd: (variant: Product["variants"][number]) => void }) {
  const gallery = (product.imageUrls?.length ? product.imageUrls : [product.imageUrl]).filter(Boolean);
  const [imageUrl, setImageUrl] = useState(gallery[0] ?? "");
  const [variantId, setVariantId] = useState(firstAvailableVariant(product)?.id ?? product.variants[0]?.id ?? "");
  const variant = product.variants.find((item) => item.id === variantId);

  useEffect(() => {
    setImageUrl(gallery[0] ?? "");
    setVariantId(firstAvailableVariant(product)?.id ?? product.variants[0]?.id ?? "");
  }, [product.id]);

  return (
    <main className="sf-detail">
      <button className="sf-text-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      <section className="sf-detail-gallery">
        <div className="sf-detail-main">
          {imageUrl ? <img src={imageUrl} alt={product.name} /> : <Package size={44} />}
        </div>
        {gallery.length > 1 && (
          <div className="sf-detail-thumbs">
            {gallery.map((url, index) => (
              <button className={clsx(url === imageUrl && "active")} key={`${url}-${index}`} onClick={() => setImageUrl(url)}>
                <img src={url} alt={`${product.name}, vista ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="sf-detail-copy">
        <span>{product.category}</span>
        <h1>{product.name}</h1>
        {product.brand && <small>Marca {product.brand}</small>}
        <p>{product.description || "Consultá disponibilidad y elegí la variante que más te guste."}</p>
        <label>
          Opción
          <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
            {product.variants.map((item) => (
              <option key={item.id} value={item.id} disabled={item.stock < 1}>
                {item.name} · {formatMoney(publicPrice(item))}{item.stock < 1 ? " · Sin stock" : ""}
              </option>
            ))}
          </select>
        </label>
        {variant && (
          <div className="sf-detail-price">
            <strong>{formatMoney(publicPrice(variant))}</strong>
            <span>{variant.stock > 0 ? `${variant.stock} disponible(s)` : "Sin stock"}</span>
          </div>
        )}
        <button className="sf-primary" onClick={() => variant && onAdd(variant)} disabled={!variant || variant.stock < 1}>
          <ShoppingBag size={20} /> Agregar al carrito
        </button>
        <div className="sf-detail-service">
          <Truck size={22} />
          <div><strong>Entrega coordinada</strong><span>Retiro en el local o envío a convenir.</span></div>
        </div>
      </section>
    </main>
  );
}

export function StorefrontShop({ settingsOverride, embedded = false }: { settingsOverride?: StorefrontSettings; embedded?: boolean }) {
  const storeProducts = useStore((state) => state.products);
  const addOnlineOrder = useStore((state) => state.addOnlineOrder);
  const studioPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("studioPreview") === "1";
  const initialStudioPreview = useMemo(loadStudioPreviewPayload, []);
  const [studioPreviewSettings, setStudioPreviewSettings] = useState<StorefrontSettings | undefined>(initialStudioPreview.settings);
  const [studioPreviewProducts, setStudioPreviewProducts] = useState<Product[]>(initialStudioPreview.products ?? []);
  const products = studioPreview && studioPreviewProducts.length ? studioPreviewProducts : storeProducts;
  const publishable = useMemo(() => products.filter((product) => product.publishable), [products]);
  const settings = useStorefrontSettings(products, settingsOverride ?? studioPreviewSettings);
  const isEmbedded = embedded || studioPreview;
  const [storePage, setStorePage] = useState<StorePage>("home");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [cart, setCart] = useState<SaleLine[]>(() => isEmbedded ? [] : loadCart());
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"retiro" | "envio">("retiro");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [message, setMessage] = useState("");
  const selectedProduct = publishable.find((product) => product.id === selectedProductId);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const visibleCategories = settings.categories.filter((item) => item.visible);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredProducts = publishable.filter((product) => {
    const matchesCategory = category === "Todos" || product.category === category;
    return matchesCategory && (!normalizedQuery || productSearchText(product).includes(normalizedQuery));
  });

  useEffect(() => {
    if (!studioPreview) return;
    const receivePreview = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== storefrontPreviewMessage || event.data.settings?.version !== 1) return;
      setStudioPreviewSettings(event.data.settings as StorefrontSettings);
      if (Array.isArray(event.data.products)) setStudioPreviewProducts(event.data.products as Product[]);
    };
    window.addEventListener("message", receivePreview);
    return () => window.removeEventListener("message", receivePreview);
  }, [studioPreview]);

  useEffect(() => {
    if (isEmbedded) return;
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {
      // El carrito sigue disponible durante la sesion si el navegador bloquea storage.
    }
  }, [cart, isEmbedded]);

  useEffect(() => {
    if (isEmbedded) return;
    const title = selectedProduct
      ? selectedProduct.seoTitle || `${selectedProduct.name} | Regaleria Shop`
      : storePage === "cart"
        ? "Carrito | Regaleria Shop"
        : category !== "Todos"
          ? `${category} | Regaleria Shop`
          : "Regaleria Shop | Regalos, deco y accesorios";
    document.title = title;
  }, [category, isEmbedded, selectedProduct, storePage]);

  const goHome = () => {
    setStorePage("home");
    setSelectedProductId(null);
    setCategory("Todos");
    setQuery("");
  };

  const openCatalog = (nextCategory = "Todos") => {
    setCategory(nextCategory);
    setStorePage("catalog");
    setSelectedProductId(null);
    requestAnimationFrame(() => document.getElementById("sf-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const openProduct = (productId: string) => {
    setSelectedProductId(productId);
    setStorePage("catalog");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addToCart = (product: Product, variant: Product["variants"][number]) => {
    if (variant.stock < 1) return;
    setCart((current) => {
      const existing = current.find((line) => line.variantId === variant.id);
      if (!existing) return [...current, saleLine(product, variant)];
      if (existing.quantity >= variant.stock) return current;
      return current.map((line) => line.variantId === variant.id ? { ...line, quantity: line.quantity + 1 } : line);
    });
    setMessage(`${product.name} se agregó al carrito.`);
  };

  const setQuantity = (variantId: string, quantity: number) => {
    const product = publishable.find((item) => item.variants.some((variant) => variant.id === variantId));
    const variant = product?.variants.find((item) => item.id === variantId);
    if (!variant) return;
    setCart((current) => current
      .map((line) => line.variantId === variantId ? { ...line, quantity: Math.min(quantity, variant.stock) } : line)
      .filter((line) => line.quantity > 0));
  };

  const submitOrder = async () => {
    if (isEmbedded) {
      setMessage("Esta es una vista previa. Los pedidos reales se confirman en la tienda publicada.");
      return;
    }
    setMessage("Registrando pedido...");
    const order = await addOnlineOrder({
      customerName,
      customerContact,
      customerEmail,
      deliveryMethod,
      deliveryAddress,
      lines: cart
    });
    if (!order) {
      setMessage("No se pudo registrar el pedido. Revisá los datos e intentá nuevamente.");
      return;
    }
    setCart([]);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerContact("");
    setDeliveryAddress("");
    setMessage(`Pedido ${order.number} recibido. Te enviaremos la confirmación por correo.`);
  };

  const heroImage = settings.hero.imageUrl || publishable.find((product) => product.id === settings.hero.productId)?.imageUrl;
  const promoImage = settings.hero.promoImageUrl || publishable.find((product) => product.id === settings.hero.promoProductId)?.imageUrl;
  const lifestyleStyle = {
    "--sf-lifestyle-desktop-x": `${settings.lifestyle.imagePositions.desktop.x}%`,
    "--sf-lifestyle-desktop-y": `${settings.lifestyle.imagePositions.desktop.y}%`,
    "--sf-lifestyle-tablet-x": `${settings.lifestyle.imagePositions.tablet.x}%`,
    "--sf-lifestyle-tablet-y": `${settings.lifestyle.imagePositions.tablet.y}%`,
    "--sf-lifestyle-mobile-x": `${settings.lifestyle.imagePositions.mobile.x}%`,
    "--sf-lifestyle-mobile-y": `${settings.lifestyle.imagePositions.mobile.y}%`
  } as CSSProperties;

  return (
    <section className={clsx("sf-store", embedded && "sf-embedded", studioPreview && "sf-studio-preview")}>
      <div className="sf-announcement">{settings.announcement}</div>
      <header className="sf-header">
        <button className="sf-brand" onClick={goHome}><BrandLockup /></button>
        <label className="sf-search">
          <MagnifyingGlass size={19} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setStorePage("catalog");
              setSelectedProductId(null);
            }}
            placeholder="Buscar productos, categorías o códigos"
          />
        </label>
        <div className="sf-header-actions">
          <button onClick={() => openCatalog()}><ListMagnifyingGlass size={21} /><span>Catálogo</span></button>
          <button className="sf-cart" onClick={() => setStorePage("cart")} aria-label={`Carrito, ${cartCount} productos`}>
            <ShoppingCartSimple size={22} /><span>{cartCount}</span>
          </button>
        </div>
      </header>
      <nav className="sf-nav" aria-label="Categorías principales">
        <button className={clsx(storePage === "home" && "active")} onClick={goHome}>Inicio</button>
        {visibleCategories.map((item) => (
          <button className={clsx(category === item.category && "active")} key={item.id} onClick={() => openCatalog(item.category)}>
            {item.title}
          </button>
        ))}
      </nav>

      {storePage === "cart" ? (
        <main className="sf-cart-page">
          <button className="sf-text-button" onClick={() => setStorePage("catalog")}><ArrowLeft size={18} /> Seguir comprando</button>
          <header className="sf-page-heading">
            <div><span>Tu selección</span><h1>Carrito</h1></div>
            <strong>{formatMoney(lineTotal(cart))}</strong>
          </header>
          {cart.length ? (
            <div className="sf-cart-layout">
              <section className="sf-cart-lines">
                {cart.map((line) => {
                  const product = publishable.find((item) => item.id === line.productId);
                  const variant = product?.variants.find((item) => item.id === line.variantId);
                  return (
                    <article key={line.variantId}>
                      {product?.imageUrl ? <img src={product.imageUrl} alt="" /> : <Package size={28} />}
                      <div><strong>{line.name}</strong><span>{variant?.name} · {line.sku}</span><small>{formatMoney(line.unitPrice)} por unidad</small></div>
                      <div className="sf-quantity">
                        <button onClick={() => setQuantity(line.variantId, line.quantity - 1)} aria-label={`Quitar una unidad de ${line.name}`}><Minus size={16} /></button>
                        <strong>{line.quantity}</strong>
                        <button onClick={() => setQuantity(line.variantId, line.quantity + 1)} disabled={line.quantity >= (variant?.stock ?? 0)} aria-label={`Agregar una unidad de ${line.name}`}><Plus size={16} /></button>
                      </div>
                      <strong>{formatMoney(line.quantity * line.unitPrice)}</strong>
                      <button className="sf-icon-button" onClick={() => setCart((current) => current.filter((item) => item.variantId !== line.variantId))} aria-label={`Eliminar ${line.name}`}><Trash size={18} /></button>
                    </article>
                  );
                })}
              </section>
              <aside className="sf-checkout">
                <h2>Confirmar pedido</h2>
                <label>Nombre<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
                <label>Email<input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></label>
                <label>Teléfono<input value={customerContact} onChange={(event) => setCustomerContact(event.target.value)} /></label>
                <div className="sf-segmented">
                  <button className={clsx(deliveryMethod === "retiro" && "active")} onClick={() => setDeliveryMethod("retiro")}>Retiro</button>
                  <button className={clsx(deliveryMethod === "envio" && "active")} onClick={() => setDeliveryMethod("envio")}>Envío</button>
                </div>
                {deliveryMethod === "envio" && <label>Dirección<input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} /></label>}
                <div className="sf-checkout-total"><span>Total</span><strong>{formatMoney(lineTotal(cart))}</strong></div>
                <button className="sf-primary" onClick={submitOrder} disabled={!customerName.trim() || !customerEmail.includes("@") || !customerContact.trim() || (deliveryMethod === "envio" && !deliveryAddress.trim())}>
                  Confirmar pedido
                </button>
                {message && <p className="sf-message" aria-live="polite">{message}</p>}
              </aside>
            </div>
          ) : (
            <div className="sf-empty">
              <ShoppingCartSimple size={38} />
              <h2>{message.startsWith("Pedido ") ? "Pedido confirmado" : "Tu carrito está vacío"}</h2>
              <p>{message || "Explorá la tienda y agregá los productos que quieras comprar."}</p>
              <button className="sf-primary" onClick={() => openCatalog()}>Ver productos</button>
            </div>
          )}
        </main>
      ) : selectedProduct ? (
        <ProductDetail product={selectedProduct} onBack={() => setSelectedProductId(null)} onAdd={(variant) => addToCart(selectedProduct, variant)} />
      ) : (
        <>
          {storePage === "home" && !query.trim() && (
            <>
              <main className="sf-home">
                <section className="sf-hero">
                  <div className="sf-hero-copy">
                    <span>{settings.hero.eyebrow}</span>
                    <h1>{settings.hero.title}</h1>
                    <p>{settings.hero.description}</p>
                    <button className="sf-primary" onClick={() => openCatalog()}>{settings.hero.ctaLabel} <ArrowRight size={18} /></button>
                  </div>
                  <button className="sf-hero-media" onClick={() => settings.hero.productId ? openProduct(settings.hero.productId) : openCatalog()}>
                    {heroImage ? <img src={heroImage} alt="" /> : <Package size={52} />}
                  </button>
                </section>
                <button className="sf-promo" onClick={() => settings.hero.promoProductId ? openProduct(settings.hero.promoProductId) : openCatalog()}>
                  {promoImage ? <img src={promoImage} alt="" /> : <GiftFallback />}
                  <div><strong>{settings.hero.promoTitle}</strong><span>{settings.hero.promoDescription}</span><b>{settings.hero.promoCtaLabel} <ArrowRight size={16} /></b></div>
                </button>
              </main>

              <section className="sf-category-section">
                <header className="sf-section-heading"><div><h2>Categorías para inspirarte</h2><p>Empezá por el tipo de regalo que estás buscando.</p></div><button onClick={() => openCatalog()}>Ver todas <ArrowRight size={17} /></button></header>
                <div className="sf-category-grid">
                  {visibleCategories.map((item) => (
                    <button key={item.id} className="sf-category-card" onClick={() => openCatalog(item.category)}>
                      <div><strong>{item.title}</strong><span>{item.description}</span><b>Explorar <ArrowRight size={15} /></b></div>
                      {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <GiftFallback />}
                    </button>
                  ))}
                </div>
              </section>

              {settings.sections.filter((section) => section.visible).map((section) => {
                const sectionProducts = productsForStorefrontSection(section, publishable).slice(0, 10);
                if (!sectionProducts.length) return null;
                return (
                  <section className="sf-products-section" key={section.id}>
                    <header className="sf-section-heading"><div><h2>{section.title}</h2><p>{section.subtitle}</p></div><button onClick={() => openCatalog()}>Ver todo <ArrowRight size={17} /></button></header>
                    <div className="sf-product-rail">
                      {sectionProducts.map((product) => (
                        <ProductTile
                          product={product}
                          key={product.id}
                          onOpen={() => openProduct(product.id)}
                          onAdd={() => {
                            const variant = firstAvailableVariant(product);
                            if (variant) addToCart(product, variant);
                          }}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              {settings.lifestyle.visible && settings.lifestyle.imageUrl && (
                <section className="sf-lifestyle" style={lifestyleStyle}>
                  <img src={settings.lifestyle.imageUrl} alt="" />
                  <div><h2>{settings.lifestyle.title}</h2><p>{settings.lifestyle.description}</p><button className="sf-primary" onClick={() => openCatalog()}>{settings.lifestyle.ctaLabel}</button></div>
                </section>
              )}

              <section className="sf-benefits">
                <div><Truck size={25} /><strong>Entrega coordinada</strong><span>Retiro en el local o envío.</span></div>
                <div><Check size={25} /><strong>Stock real</strong><span>Lo publicado está disponible.</span></div>
                <div><Heart size={25} /><strong>Atención cercana</strong><span>Te ayudamos a elegir.</span></div>
              </section>
            </>
          )}

          {(storePage === "catalog" || query.trim()) && (
            <main className="sf-catalog-page" id="sf-catalog">
              <header className="sf-page-heading">
                <div><span>Catálogo</span><h1>{query.trim() ? `Resultados para “${query.trim()}”` : category === "Todos" ? "Todos los productos" : category}</h1></div>
                <strong>{filteredProducts.length} productos</strong>
              </header>
              <div className="sf-catalog-filters">
                <label><MagnifyingGlass size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, descripción o código" /></label>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="Todos">Todas las categorías</option>
                  {visibleCategories.map((item) => <option key={item.id} value={item.category}>{item.title}</option>)}
                </select>
              </div>
              <div className="sf-product-grid">
                {filteredProducts.map((product) => (
                  <ProductTile
                    product={product}
                    key={product.id}
                    onOpen={() => openProduct(product.id)}
                    onAdd={() => {
                      const variant = firstAvailableVariant(product);
                      if (variant) addToCart(product, variant);
                    }}
                  />
                ))}
              </div>
              {!filteredProducts.length && <div className="sf-empty"><MagnifyingGlass size={34} /><h2>No encontramos productos</h2><p>Probá con otra búsqueda o categoría.</p></div>}
            </main>
          )}
        </>
      )}

      <footer className="sf-footer">
        <BrandLockup />
        <p>Regalos, deco y accesorios elegidos para hacer especial cada momento.</p>
        <nav><button onClick={goHome}>Inicio</button><button onClick={() => openCatalog()}>Catálogo</button><button onClick={() => setStorePage("cart")}>Carrito</button></nav>
      </footer>
      <nav className="sf-mobile-nav" aria-label="Navegación móvil">
        <button className={clsx(storePage === "home" && "active")} onClick={goHome}><House size={21} /><span>Inicio</span></button>
        <button className={clsx(storePage === "catalog" && "active")} onClick={() => openCatalog()}><MagnifyingGlass size={21} /><span>Buscar</span></button>
        <button className={clsx(storePage === "cart" && "active")} onClick={() => setStorePage("cart")}><ShoppingCartSimple size={21} /><span>Carrito {cartCount ? `(${cartCount})` : ""}</span></button>
      </nav>
      {message && storePage !== "cart" && <div className="sf-toast" aria-live="polite">{message}</div>}
    </section>
  );
}

function GiftFallback() {
  return <span className="sf-image-fallback"><Image size={32} /></span>;
}

function EditorImageField({
  label,
  imageUrl,
  slot,
  disabled = false,
  onChange
}: {
  label: string;
  imageUrl: string;
  slot: string;
  disabled?: boolean;
  onChange: (url: string) => void;
}) {
  const [status, setStatus] = useState("");
  const upload = async (file?: File) => {
    if (!file) return;
    setStatus("Subiendo...");
    try {
      onChange(await uploadStorefrontImage(slot, file));
      setStatus("Imagen lista para guardar.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    }
  };
  return (
    <div className="sfs-image-field">
      <span>{label}</span>
      <div>
        {imageUrl ? <img src={imageUrl} alt="" /> : <GiftFallback />}
        <label className={clsx("secondary-action", disabled && "disabled")}>
          <UploadSimple size={18} /> Elegir imagen
          <input disabled={disabled} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} />
        </label>
      </div>
      {status && <small>{status}</small>}
    </div>
  );
}

function SectionProductPicker({
  section,
  products,
  disabled = false,
  onChange
}: {
  section: StorefrontSection;
  products: Product[];
  disabled?: boolean;
  onChange: (section: StorefrontSection) => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase();
  const visible = products.filter((product) => product.publishable && (!normalized || productSearchText(product).includes(normalized)));
  return (
    <details className="sfs-picker">
      <summary>{section.rule === "todos" ? "Todos los productos publicados" : `${section.productIds.length} producto(s) elegidos`}</summary>
      <label className="sfs-mini-search"><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto" /></label>
      <div>
        {visible.map((product) => {
          const checked = section.productIds.includes(product.id);
          return (
            <label key={product.id}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || section.rule === "todos"}
                onChange={() => onChange({
                  ...section,
                  productIds: checked ? section.productIds.filter((id) => id !== product.id) : [...section.productIds, product.id]
                })}
              />
              {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <Package size={22} />}
              <span><strong>{product.name}</strong><small>{product.category}</small></span>
            </label>
          );
        })}
      </div>
    </details>
  );
}

const viewportOptions: Array<{ id: PreviewMode; label: string; icon: typeof DeviceMobile }> = [
  { id: "mobile", label: "Móvil", icon: DeviceMobile },
  { id: "tablet", label: "Tablet", icon: DeviceTablet },
  { id: "desktop", label: "PC", icon: Desktop }
];

function DeviceSelector({
  value,
  onChange,
  label
}: {
  value: PreviewMode;
  onChange: (mode: PreviewMode) => void;
  label: string;
}) {
  return (
    <div className="sfs-device-selector" role="group" aria-label={label}>
      {viewportOptions.map(({ id, label: optionLabel, icon: Icon }) => (
        <button type="button" key={id} className={clsx(value === id && "active")} onClick={() => onChange(id)} aria-pressed={value === id}>
          <Icon size={18} />
          <span>{optionLabel}</span>
        </button>
      ))}
    </div>
  );
}

function LifestyleCropEditor({
  imageUrl,
  positions,
  disabled,
  onChange
}: {
  imageUrl: string;
  positions: StorefrontImagePositions;
  disabled: boolean;
  onChange: (positions: StorefrontImagePositions) => void;
}) {
  const [viewport, setViewport] = useState<PreviewMode>("mobile");
  const position = positions[viewport];
  const setPosition = (next: { x: number; y: number }) => {
    onChange({
      ...positions,
      [viewport]: {
        x: Math.max(0, Math.min(100, Math.round(next.x))),
        y: Math.max(0, Math.min(100, Math.round(next.y)))
      }
    });
  };
  const moveFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100
    });
  };
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    moveFromPointer(event);
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) moveFromPointer(event);
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 5 : 1;
    setPosition({
      x: position.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
      y: position.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0)
    });
  };

  return (
    <section className="sfs-crop-editor">
      <header>
        <div>
          <span className="sfs-step-number">3</span>
          <div><h4>Elegí qué parte se muestra</h4><p>Cada dispositivo guarda su propio encuadre.</p></div>
        </div>
        <DeviceSelector value={viewport} onChange={setViewport} label="Dispositivo para ajustar el encuadre" />
      </header>
      {imageUrl ? (
        <div className="sfs-crop-workspace">
          <div
            className={clsx("sfs-crop-frame", `is-${viewport}`, disabled && "disabled")}
            role="application"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Encuadre para ${viewport}. Arrastrá el punto o usá las flechas.`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onKeyDown={handleKeyDown}
          >
            <img src={imageUrl} alt="" draggable={false} style={{ objectPosition: `${position.x}% ${position.y}%` }} />
            <span className="sfs-focus-point" style={{ left: `${position.x}%`, top: `${position.y}%` }}><CrosshairSimple size={24} weight="bold" /></span>
          </div>
          <div className="sfs-crop-controls">
            <label>Horizontal <input type="range" min="0" max="100" value={position.x} disabled={disabled} onChange={(event) => setPosition({ ...position, x: Number(event.target.value) })} /><output>{position.x}%</output></label>
            <label>Vertical <input type="range" min="0" max="100" value={position.y} disabled={disabled} onChange={(event) => setPosition({ ...position, y: Number(event.target.value) })} /><output>{position.y}%</output></label>
            <button type="button" className="secondary-action" disabled={disabled} onClick={() => setPosition({ x: 50, y: 50 })}><CrosshairSimple size={17} /> Centrar</button>
          </div>
        </div>
      ) : (
        <div className="sfs-crop-empty"><ImagesSquare size={30} /><span>Subí o generá una imagen para ajustar el encuadre.</span></div>
      )}
    </section>
  );
}

function StorefrontEditorHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="sfs-editor-header">
      <div><span className="sfs-editor-kicker"><PencilSimple size={15} /> Contenido editable</span><h3>{title}</h3><p>{description}</p></div>
    </header>
  );
}

function StorefrontEditBlock({
  title,
  description,
  children,
  compact = false
}: {
  title: string;
  description: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={clsx("sfs-edit-block", compact && "compact")}>
      <header>
        <span className="sfs-edit-block-icon"><PencilSimple size={17} /></span>
        <div><h4>{title}</h4><p>{description}</p></div>
        <span className="sfs-editable-chip">Editable</span>
      </header>
      <div className="sfs-edit-block-body">{children}</div>
    </section>
  );
}

export function StorefrontStudio() {
  const storeProducts = useStore((state) => state.products);
  const activeRole = useStore((state) => state.activeRole);
  const editable = canEditStorefront(activeRole);
  const [readOnlyCatalog, setReadOnlyCatalog] = useState<Product[]>([]);
  const products = storeProducts.length ? storeProducts : readOnlyCatalog;
  const signature = products.map((product) => `${product.id}:${product.category}:${product.publishable}`).join("|");
  const [studioPage, setStudioPage] = useState<StudioPage>("vista");
  const [draft, setDraft] = useState(() => createDefaultStorefrontSettings(products));
  const [status, setStatus] = useState("Cargando configuración...");
  const [dirty, setDirty] = useState(false);
  const [dragCategory, setDragCategory] = useState<number | null>(null);
  const [dragSection, setDragSection] = useState<number | null>(null);
  const [lifestyleQuery, setLifestyleQuery] = useState("");
  const [lifestyleProductIds, setLifestyleProductIds] = useState<string[]>([]);
  const [lifestyleBrief, setLifestyleBrief] = useState("");
  const [lifestyleScene, setLifestyleScene] = useState<"hogar" | "regalo" | "mesa" | "tienda">("hogar");
  const [lifestyleQuality, setLifestyleQuality] = useState<"low" | "medium">("low");
  const [lifestyleStatus, setLifestyleStatus] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [isGeneratingLifestyle, setIsGeneratingLifestyle] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");
  const previewFrame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (storeProducts.length) return;
    let active = true;
    void loadPublicCatalogSnapshot().then((catalog) => {
      if (active && catalog?.length) setReadOnlyCatalog(catalog);
    });
    return () => {
      active = false;
    };
  }, [storeProducts.length]);

  useEffect(() => {
    let active = true;
    setStatus("Cargando configuración...");
    void loadStorefrontSettings(products).then((loaded) => {
      if (!active) return;
      setDraft(loaded);
      setDirty(false);
      setStatus("Configuración actual cargada.");
    });
    return () => {
      active = false;
    };
  }, [signature]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storefrontPreviewStorageKey, JSON.stringify({ settings: draft, products }));
      previewFrame.current?.contentWindow?.postMessage({ type: storefrontPreviewMessage, settings: draft, products }, window.location.origin);
    } catch {
      // La vista previa sigue disponible con la última versión enviada al iframe.
    }
  }, [draft, signature]);

  useEffect(() => () => {
    window.sessionStorage.removeItem(storefrontPreviewStorageKey);
  }, []);

  const updateDraft = (updater: (current: StorefrontSettings) => StorefrontSettings) => {
    setDraft((current) => updater(current));
    setDirty(true);
    setStatus("Cambios sin guardar.");
  };

  const save = async () => {
    if (!editable) return;
    setStatus("Guardando configuración...");
    const result = await saveStorefrontSettings({ ...draft, updatedAt: new Date().toISOString() });
    if (!result.ok) {
      setStatus(`No se pudo guardar: ${result.message}`);
      return;
    }
    setDraft((current) => ({ ...current, updatedAt: result.updatedAt ?? new Date().toISOString() }));
    setDirty(false);
    setStatus("Tienda publicada y configuración auditada.");
  };

  const generateLifestyle = async () => {
    const selectedProducts = products.filter((product) => lifestyleProductIds.includes(product.id));
    if (selectedProducts.length < 2 || selectedProducts.length > 3) {
      setLifestyleStatus("Elegí dos o tres productos.");
      return;
    }
    setLifestyleStatus("Generando imagen. Puede tardar hasta dos minutos...");
    setIsGeneratingLifestyle(true);
    try {
      const result = await generateLifestyleImage({
        products: selectedProducts.map(({ id, name, imageUrl }) => ({ id, name, imageUrl })),
        brief: lifestyleBrief,
        scene: lifestyleScene,
        quality: lifestyleQuality
      });
      setGeneratedImage(result.imageUrl);
      setLifestyleStatus(`Imagen creada con ${result.model}. Revisala antes de usarla.`);
    } catch (error) {
      setLifestyleStatus(error instanceof Error ? error.message : "No se pudo generar la imagen.");
    } finally {
      setIsGeneratingLifestyle(false);
    }
  };

  const visibleLifestyleProducts = products.filter((product) => {
    if (!product.publishable || !product.imageUrl) return false;
    return !lifestyleQuery.trim() || productSearchText(product).includes(lifestyleQuery.trim().toLocaleLowerCase());
  });

  return (
    <section className="workspace storefront-studio">
      <header className="sfs-command">
        <div><span>Editor de tienda</span><h2>Vidriera pública</h2><p>Ordená contenido, cambiá imágenes y previsualizá antes de publicar.</p></div>
        <div>
          <span className={clsx("sfs-save-state", dirty && "dirty")}>{status}</span>
          <button className="primary-action" onClick={() => void save()} disabled={!editable || !dirty}><Check size={18} /> Guardar y publicar</button>
        </div>
      </header>
      {!editable && <div className="sfs-readonly">Solo dueño y administrador pueden modificar la tienda. La vista previa sigue disponible.</div>}
      <nav className="sfs-navigation" aria-label="Herramientas de la vidriera">
        <button className={clsx("sfs-navigation-preview", studioPage === "vista" && "active")} onClick={() => setStudioPage("vista")}>
          <Eye size={21} />
          <span><strong>Vista previa</strong><small>Revisá la tienda por dispositivo</small></span>
        </button>
        <div className="sfs-navigation-edit">
          <span><PencilSimple size={16} /> Editar contenido</span>
          {([
            ["portada", "Portada", "Textos e imágenes", Image],
            ["categorias", "Categorías", "Orden y presentación", SquaresFour],
            ["secciones", "Colecciones", "Filas de productos", Stack],
            ["lifestyle", "Lifestyle", "Escena y encuadres", Sparkle]
          ] as Array<[StudioPage, string, string, typeof Image]>).map(([id, label, description, Icon]) => (
            <button key={id} className={clsx(studioPage === id && "active")} onClick={() => setStudioPage(id)}>
              <Icon size={19} />
              <span><strong>{label}</strong><small>{description}</small></span>
            </button>
          ))}
        </div>
      </nav>

      {studioPage === "vista" && (
        <section className="sfs-preview-section">
          <header>
            <div><h3>Vista previa</h3><p>La vista móvil se abre primero. Los cambios de este borrador no afectan la web hasta publicar.</p></div>
            <DeviceSelector value={previewMode} onChange={setPreviewMode} label="Tamaño de la vista previa" />
          </header>
          <div className="sfs-preview-stage">
            <div className={clsx("sfs-preview-shell", `is-${previewMode}`)}>
              <div className="sfs-browser-bar"><span /><span /><span /><strong>regaleriashop.com</strong></div>
              <iframe
                ref={previewFrame}
                title={`Vista previa ${previewMode} de la tienda pública`}
                src="/?preview=public&studioPreview=1"
                onLoad={() => previewFrame.current?.contentWindow?.postMessage({ type: storefrontPreviewMessage, settings: draft, products }, window.location.origin)}
              />
            </div>
          </div>
        </section>
      )}

      {studioPage === "portada" && (
        <section className="sfs-editor-pane">
          <StorefrontEditorHeader title="Portada" description="La primera impresión de la tienda en computadora y celular." />
          <StorefrontEditBlock title="Anuncio superior" description="La franja breve que aparece antes del encabezado." compact>
            <label>Texto del anuncio<input value={draft.announcement} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, announcement: event.target.value }))} /></label>
          </StorefrontEditBlock>
          <StorefrontEditBlock title="Presentación principal" description="El mensaje, la imagen y el producto destacado al entrar a la tienda.">
            <div className="sfs-form-grid two">
              <div className="sfs-field-stack">
                <label>Texto breve<input value={draft.hero.eyebrow} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, hero: { ...current.hero, eyebrow: event.target.value } }))} /></label>
                <label>Título principal<textarea value={draft.hero.title} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, hero: { ...current.hero, title: event.target.value } }))} /></label>
                <label>Descripción<textarea value={draft.hero.description} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, hero: { ...current.hero, description: event.target.value } }))} /></label>
                <label>Texto del botón<input value={draft.hero.ctaLabel} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, hero: { ...current.hero, ctaLabel: event.target.value } }))} /></label>
                <label>Producto vinculado<select value={draft.hero.productId} disabled={!editable} onChange={(event) => {
                  const product = products.find((item) => item.id === event.target.value);
                  updateDraft((current) => ({ ...current, hero: { ...current.hero, productId: event.target.value, imageUrl: product?.imageUrl ?? current.hero.imageUrl } }));
                }}><option value="">Sin vínculo</option>{products.filter((product) => product.publishable).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              </div>
              <EditorImageField disabled={!editable} label="Imagen principal" imageUrl={draft.hero.imageUrl} slot="hero-principal" onChange={(imageUrl) => updateDraft((current) => ({ ...current, hero: { ...current.hero, imageUrl } }))} />
            </div>
          </StorefrontEditBlock>
          <StorefrontEditBlock title="Promoción secundaria" description="Una segunda propuesta visible al lado o debajo de la presentación principal.">
            <div className="sfs-form-grid two">
              <div className="sfs-field-stack">
                <label>Título<input value={draft.hero.promoTitle} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, hero: { ...current.hero, promoTitle: event.target.value } }))} /></label>
                <label>Descripción<textarea value={draft.hero.promoDescription} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, hero: { ...current.hero, promoDescription: event.target.value } }))} /></label>
                <label>Texto del botón<input value={draft.hero.promoCtaLabel} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, hero: { ...current.hero, promoCtaLabel: event.target.value } }))} /></label>
                <label>Producto vinculado<select value={draft.hero.promoProductId} disabled={!editable} onChange={(event) => {
                  const product = products.find((item) => item.id === event.target.value);
                  updateDraft((current) => ({ ...current, hero: { ...current.hero, promoProductId: event.target.value, promoImageUrl: product?.imageUrl ?? current.hero.promoImageUrl } }));
                }}><option value="">Sin vínculo</option>{products.filter((product) => product.publishable).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              </div>
              <EditorImageField disabled={!editable} label="Imagen de promoción" imageUrl={draft.hero.promoImageUrl} slot="hero-promocion" onChange={(promoImageUrl) => updateDraft((current) => ({ ...current, hero: { ...current.hero, promoImageUrl } }))} />
            </div>
          </StorefrontEditBlock>
        </section>
      )}

      {studioPage === "categorias" && (
        <section className="sfs-editor-pane">
          <StorefrontEditorHeader title="Categorías visuales" description="Cada categoría del catálogo aparece automáticamente y conserva sus productos." />
          <div className="sfs-sort-list">
            {draft.categories.map((item, index) => (
              <article
                key={item.id}
                draggable={editable}
                onDragStart={() => setDragCategory(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragCategory === null || dragCategory === index) return;
                  updateDraft((current) => {
                    const next = [...current.categories];
                    const [moved] = next.splice(dragCategory, 1);
                    next.splice(index, 0, moved);
                    return { ...current, categories: next };
                  });
                  setDragCategory(null);
                }}
              >
                <div className="sfs-sort-actions">
                  <button disabled={!editable || index === 0} onClick={() => updateDraft((current) => ({ ...current, categories: moveItem(current.categories, index, -1) }))} aria-label={`Subir ${item.title}`}><ArrowUp size={17} /></button>
                  <button disabled={!editable || index === draft.categories.length - 1} onClick={() => updateDraft((current) => ({ ...current, categories: moveItem(current.categories, index, 1) }))} aria-label={`Bajar ${item.title}`}><ArrowDown size={17} /></button>
                </div>
                <EditorImageField disabled={!editable} label={item.category} imageUrl={item.imageUrl} slot={`categoria-${item.category}`} onChange={(imageUrl) => updateDraft((current) => ({ ...current, categories: replaceAt(current.categories, index, { ...item, imageUrl }) }))} />
                <div className="sfs-field-stack">
                  <span className="sfs-item-edit-label"><PencilSimple size={15} /> Editar presentación</span>
                  <label>Nombre visible<input value={item.title} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, categories: replaceAt(current.categories, index, { ...item, title: event.target.value }) }))} /></label>
                  <label>Texto breve<textarea value={item.description} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, categories: replaceAt(current.categories, index, { ...item, description: event.target.value }) }))} /></label>
                  <label className="sfs-check"><input type="checkbox" checked={item.visible} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, categories: replaceAt(current.categories, index, { ...item, visible: event.target.checked }) }))} /> Mostrar en la portada</label>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {studioPage === "secciones" && (
        <section className="sfs-editor-pane">
          <header className="sfs-editor-header">
            <div><h3>Colecciones de productos</h3><p>Creá filas comerciales y ordenalas como en un editor de tienda.</p></div>
            <button className="secondary-action" disabled={!editable} onClick={() => updateDraft((current) => ({
              ...current,
              sections: [...current.sections, {
                id: `section-${crypto.randomUUID()}`,
                title: "Nueva colección",
                subtitle: "Elegí los productos que querés destacar",
                visible: true,
                rule: "seleccion",
                productIds: []
              }]
            }))}><Plus size={18} /> Agregar colección</button>
          </header>
          <div className="sfs-section-list">
            {draft.sections.map((section, index) => (
              <article
                key={section.id}
                draggable={editable}
                onDragStart={() => setDragSection(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragSection === null || dragSection === index) return;
                  updateDraft((current) => {
                    const next = [...current.sections];
                    const [moved] = next.splice(dragSection, 1);
                    next.splice(index, 0, moved);
                    return { ...current, sections: next };
                  });
                  setDragSection(null);
                }}
              >
                <div className="sfs-section-head">
                  <div className="sfs-sort-actions">
                    <button disabled={!editable || index === 0} onClick={() => updateDraft((current) => ({ ...current, sections: moveItem(current.sections, index, -1) }))}><ArrowUp size={17} /></button>
                    <button disabled={!editable || index === draft.sections.length - 1} onClick={() => updateDraft((current) => ({ ...current, sections: moveItem(current.sections, index, 1) }))}><ArrowDown size={17} /></button>
                  </div>
                  <div className="sfs-section-title"><span className="sfs-item-edit-label"><PencilSimple size={15} /> Editable</span><strong>{section.title}</strong></div>
                  <label className="sfs-check"><input type="checkbox" checked={section.visible} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, sections: replaceAt(current.sections, index, { ...section, visible: event.target.checked }) }))} /> Visible</label>
                  <button className="sfs-danger-icon" disabled={!editable} onClick={() => updateDraft((current) => ({ ...current, sections: current.sections.filter((item) => item.id !== section.id) }))} aria-label={`Eliminar ${section.title}`}><Trash size={18} /></button>
                </div>
                <div className="sfs-form-grid three">
                  <label>Título<input value={section.title} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, sections: replaceAt(current.sections, index, { ...section, title: event.target.value }) }))} /></label>
                  <label>Descripción<input value={section.subtitle} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, sections: replaceAt(current.sections, index, { ...section, subtitle: event.target.value }) }))} /></label>
                  <label>Contenido<select value={section.rule} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, sections: replaceAt(current.sections, index, { ...section, rule: event.target.value as StorefrontSection["rule"] }) }))}><option value="seleccion">Selección manual</option><option value="todos">Todos los publicados</option></select></label>
                </div>
                <SectionProductPicker disabled={!editable} section={section} products={products} onChange={(next) => updateDraft((current) => ({ ...current, sections: replaceAt(current.sections, index, next) }))} />
              </article>
            ))}
          </div>
        </section>
      )}

      {studioPage === "lifestyle" && (
        <section className="sfs-editor-pane sfs-lifestyle-tool">
          <StorefrontEditorHeader title="Composición lifestyle" description="Creá o subí la imagen, elegí el encuadre y recién después publicala." />
          <section className="sfs-lifestyle-step">
            <header><span className="sfs-step-number">1</span><div><h4>Elegí 2 o 3 productos</h4><p>La IA usa sus fotos como referencia y conserva sus rasgos principales.</p></div><span className="sfs-editable-chip">Editable</span></header>
            <div className="sfs-lifestyle-layout">
              <div>
              <label className="sfs-mini-search"><MagnifyingGlass size={17} /><input value={lifestyleQuery} onChange={(event) => setLifestyleQuery(event.target.value)} placeholder="Buscar productos con foto" /></label>
              <div className="sfs-lifestyle-products">
                {visibleLifestyleProducts.map((product) => {
                  const selected = lifestyleProductIds.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      className={clsx(selected && "selected")}
                      disabled={!editable || (!selected && lifestyleProductIds.length >= 3)}
                      onClick={() => setLifestyleProductIds((current) => selected ? current.filter((id) => id !== product.id) : [...current, product.id])}
                    >
                      <img src={product.imageUrl} alt="" />
                      <span><strong>{product.name}</strong><small>{product.category}</small></span>
                      {selected && <Check size={18} />}
                    </button>
                  );
                })}
              </div>
              </div>
              <aside className="sfs-selection-summary">
                <strong>{lifestyleProductIds.length}/3 seleccionados</strong>
                <div className="sfs-selected-products">
                  {products.filter((product) => lifestyleProductIds.includes(product.id)).map((product) => <span key={product.id}><img src={product.imageUrl} alt="" />{product.name}</span>)}
                </div>
                {!lifestyleProductIds.length && <p>Seleccioná productos desde la lista.</p>}
              </aside>
            </div>
          </section>

          <section className="sfs-lifestyle-step">
            <header><span className="sfs-step-number">2</span><div><h4>Creá o subí la imagen</h4><p>La imagen generada queda como propuesta. No se publica automáticamente.</p></div><span className="sfs-editable-chip">Editable</span></header>
            <div className="sfs-create-image-grid">
              <div className="sfs-generation-controls">
                <div className="sfs-method-label"><Sparkle size={19} /><span><strong>Generar con IA</strong><small>Usa la clave configurada y consume crédito del proveedor.</small></span></div>
                <label>Escena<select disabled={!editable || isGeneratingLifestyle} value={lifestyleScene} onChange={(event) => setLifestyleScene(event.target.value as typeof lifestyleScene)}><option value="hogar">Hogar luminoso</option><option value="regalo">Presentación de regalo</option><option value="mesa">Mesa editorial</option><option value="tienda">Vidriera de tienda</option></select></label>
                <label>Detalle opcional<textarea disabled={!editable || isGeneratingLifestyle} value={lifestyleBrief} onChange={(event) => setLifestyleBrief(event.target.value)} placeholder="Ej: mañana luminosa, tonos suaves, sin texto ni personas" /></label>
                <label>Calidad<select disabled={!editable || isGeneratingLifestyle} value={lifestyleQuality} onChange={(event) => setLifestyleQuality(event.target.value as typeof lifestyleQuality)}><option value="low">Borrador económico</option><option value="medium">Final</option></select></label>
                <button className="primary-action" onClick={() => void generateLifestyle()} disabled={!editable || isGeneratingLifestyle || lifestyleProductIds.length < 2 || lifestyleProductIds.length > 3}>
                  {isGeneratingLifestyle ? <SpinnerGap className="sfs-spinner" size={18} /> : <Sparkle size={18} />}
                  {isGeneratingLifestyle ? "Generando..." : "Generar escena"}
                </button>
                <p className="muted-text" aria-live="polite">{lifestyleStatus || "Elegí entre 2 y 3 productos para habilitar la generación."}</p>
              </div>
              <div className="sfs-manual-image">
                <div className="sfs-method-label"><UploadSimple size={19} /><span><strong>Usar imagen propia</strong><small>Subí una composición terminada desde tu equipo.</small></span></div>
                <EditorImageField
                  disabled={!editable}
                  label="Imagen lifestyle"
                  imageUrl={draft.lifestyle.imageUrl}
                  slot="lifestyle-manual"
                  onChange={(imageUrl) => updateDraft((current) => ({
                    ...current,
                    lifestyle: { ...current.lifestyle, imageUrl, imagePositions: createDefaultStorefrontImagePositions() }
                  }))}
                />
              </div>
            </div>
            {generatedImage && (
              <div className="sfs-generated-result">
                <img src={generatedImage} alt="Composición lifestyle generada" />
                <div>
                  <span><Check size={18} /> Propuesta lista para revisar</span>
                  <button className="secondary-action" disabled={!editable} onClick={() => updateDraft((current) => ({ ...current, hero: { ...current.hero, imageUrl: generatedImage, productId: "" } }))}>Usar en portada</button>
                  <button className="primary-action" disabled={!editable} onClick={() => updateDraft((current) => ({
                    ...current,
                    lifestyle: {
                      ...current.lifestyle,
                      visible: true,
                      imageUrl: generatedImage,
                      imagePositions: createDefaultStorefrontImagePositions(),
                      productIds: lifestyleProductIds
                    }
                  }))}>Usar en Lifestyle</button>
                </div>
              </div>
            )}
          </section>

          <LifestyleCropEditor
            imageUrl={draft.lifestyle.imageUrl}
            positions={draft.lifestyle.imagePositions}
            disabled={!editable}
            onChange={(imagePositions) => updateDraft((current) => ({ ...current, lifestyle: { ...current.lifestyle, imagePositions } }))}
          />

          <div className="sfs-lifestyle-current">
            <header><div><span className="sfs-item-edit-label"><PencilSimple size={15} /> Editable</span><h4>Textos y publicación</h4><p>Completá el bloque y activalo cuando esté listo.</p></div><label className="sfs-check"><input type="checkbox" checked={draft.lifestyle.visible} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, lifestyle: { ...current.lifestyle, visible: event.target.checked } }))} /> Mostrar en la portada</label></header>
            <div className="sfs-form-grid two">
              <label>Título<input value={draft.lifestyle.title} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, lifestyle: { ...current.lifestyle, title: event.target.value } }))} /></label>
              <label>Botón<input value={draft.lifestyle.ctaLabel} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, lifestyle: { ...current.lifestyle, ctaLabel: event.target.value } }))} /></label>
            </div>
            <label>Descripción<textarea value={draft.lifestyle.description} disabled={!editable} onChange={(event) => updateDraft((current) => ({ ...current, lifestyle: { ...current.lifestyle, description: event.target.value } }))} /></label>
          </div>
        </section>
      )}
    </section>
  );
}
