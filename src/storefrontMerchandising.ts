import type { Product, ProductCommerce, SaleLine } from "./types";

export type GiftBudget = "hasta_25000" | "25000_50000" | "50000_90000" | "mas_90000";

export interface StorefrontBundle {
  id: string;
  title: string;
  tier: "rapido" | "completo" | "inolvidable" | "empresa";
  description: string;
  productIds: string[];
  packPrice: number;
  visible: boolean;
}

export interface StorefrontCommerceSettings {
  whatsapp: string;
  instagram: string;
  address: string;
  mapUrl: string;
  hours: string;
  responseTime: string;
  legalName: string;
  changesPolicy: string;
  privacyUrl: string;
  shippingInfo: string;
  preparationText: string;
  protectionText: string;
  invoiceExcludedFromGift: boolean;
  giftWrapLabel: string;
  giftWrapPrice: number;
  freeShippingThreshold: number;
  installments: number;
  cfteaLabel: string;
  giftFinderEnabled: boolean;
  giftFinderTitle: string;
  giftFinderDescription: string;
  faqs: Array<{ id: string; question: string; answer: string }>;
  bundles: StorefrontBundle[];
}

export interface GiftFinderAnswers {
  recipient: string;
  occasion: string;
  interest: string;
  budget: GiftBudget;
  timing: "hoy" | "esta_semana" | "sin_apuro";
  giftReady: boolean;
}

export interface GiftFinderResult {
  main: Product[];
  economic?: Product;
  premium?: Product;
  bundle?: StorefrontBundle;
}

export function createDefaultProductCommerce(): ProductCommerce {
  return {
    valueProposition: "",
    whatIsIt: "",
    idealFor: "",
    occasions: "",
    includes: [],
    dimensions: "",
    weight: "",
    materials: "",
    colorsOrScents: "",
    care: "",
    presentation: "",
    preparationTime: "",
    changePolicy: "",
    personalizable: false,
    dedicationAvailable: true,
    directDeliveryAvailable: true,
    badge: "",
    crossSellProductIds: [],
    upsellProductIds: [],
    downsellProductIds: [],
    giftProfile: {
      recipients: [],
      occasions: [],
      interests: [],
      budget: "",
      urgentReady: false,
      giftReady: true
    }
  };
}

export function normalizeProductCommerce(value?: Partial<ProductCommerce>): ProductCommerce {
  const defaults = createDefaultProductCommerce();
  return {
    ...defaults,
    ...value,
    includes: Array.isArray(value?.includes) ? value.includes.filter(Boolean).slice(0, 20) : [],
    crossSellProductIds: Array.isArray(value?.crossSellProductIds) ? value.crossSellProductIds.filter(Boolean).slice(0, 3) : [],
    upsellProductIds: Array.isArray(value?.upsellProductIds) ? value.upsellProductIds.filter(Boolean).slice(0, 3) : [],
    downsellProductIds: Array.isArray(value?.downsellProductIds) ? value.downsellProductIds.filter(Boolean).slice(0, 3) : [],
    giftProfile: {
      ...defaults.giftProfile,
      ...(value?.giftProfile ?? {}),
      recipients: Array.isArray(value?.giftProfile?.recipients) ? value.giftProfile.recipients.filter(Boolean).slice(0, 12) : [],
      occasions: Array.isArray(value?.giftProfile?.occasions) ? value.giftProfile.occasions.filter(Boolean).slice(0, 12) : [],
      interests: Array.isArray(value?.giftProfile?.interests) ? value.giftProfile.interests.filter(Boolean).slice(0, 12) : []
    }
  };
}

export function createDefaultStorefrontCommerce(): StorefrontCommerceSettings {
  return {
    whatsapp: "",
    instagram: "",
    address: "",
    mapUrl: "",
    hours: "",
    responseTime: "Respondemos dentro del horario de atención.",
    legalName: "",
    changesPolicy: "Consultá las condiciones de cambio antes de comprar.",
    privacyUrl: "",
    shippingInfo: "Retiro en el local o envío coordinado.",
    preparationText: "Preparación habitual en 24/48 horas.",
    protectionText: "Embalaje protegido para que el regalo llegue bien.",
    invoiceExcludedFromGift: true,
    giftWrapLabel: "Envoltorio para regalo",
    giftWrapPrice: 0,
    freeShippingThreshold: 0,
    installments: 0,
    cfteaLabel: "",
    giftFinderEnabled: true,
    giftFinderTitle: "Encontrá un regalo en pocos pasos",
    giftFinderDescription: "Contanos para quién es y te mostramos opciones con stock real.",
    faqs: [
      { id: "faq-cambios", question: "¿Puedo cambiar un regalo?", answer: "Sí. Coordiná el cambio con el local y conservá el producto en su estado original." },
      { id: "faq-entrega", question: "¿Cómo se coordina la entrega?", answer: "Podés retirar en el local o elegir envío. Confirmamos fecha y costo antes de despachar." },
      { id: "faq-dedicatoria", question: "¿Puedo agregar una dedicatoria?", answer: "Sí. Escribila al confirmar el pedido y la preparamos sin incluir precios dentro del paquete." }
    ],
    bundles: []
  };
}

export function normalizeStorefrontCommerce(value?: Partial<StorefrontCommerceSettings>): StorefrontCommerceSettings {
  const defaults = createDefaultStorefrontCommerce();
  return {
    ...defaults,
    ...value,
    giftWrapPrice: Math.max(0, Number(value?.giftWrapPrice) || 0),
    freeShippingThreshold: Math.max(0, Number(value?.freeShippingThreshold) || 0),
    installments: Math.max(0, Math.min(24, Math.trunc(Number(value?.installments) || 0))),
    faqs: Array.isArray(value?.faqs)
      ? value.faqs.filter((faq) => faq?.question?.trim() && faq?.answer?.trim()).slice(0, 20)
      : defaults.faqs,
    bundles: Array.isArray(value?.bundles)
      ? value.bundles
          .filter((bundle) => bundle?.id && bundle?.title && Array.isArray(bundle.productIds))
          .map((bundle) => ({
            ...bundle,
            productIds: Array.from(new Set(bundle.productIds.filter(Boolean))).slice(0, 6),
            packPrice: Math.max(0, Number(bundle.packPrice) || 0)
          }))
          .slice(0, 30)
      : []
  };
}

export function publicProductPrice(product: Product) {
  const values = product.variants
    .filter((variant) => variant.stock > 0)
    .map((variant) => variant.webPrice ?? variant.price)
    .filter((price) => Number.isFinite(price) && price > 0);
  return values.length ? Math.min(...values) : 0;
}

function productByConfiguredIds(ids: string[], products: Product[]) {
  const byId = new Map(products.filter((product) => product.publishable).map((product) => [product.id, product]));
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

export function relatedProducts(product: Product, products: Product[], kind: "cross" | "up" | "down", limit = 3) {
  const commerce = normalizeProductCommerce(product.commerce);
  const configured = kind === "cross"
    ? commerce.crossSellProductIds
    : kind === "up"
      ? commerce.upsellProductIds
      : commerce.downsellProductIds;
  const explicit = productByConfiguredIds(configured, products).filter((item) => item.id !== product.id && publicProductPrice(item) > 0);
  if (explicit.length) return explicit.slice(0, limit);

  const currentPrice = publicProductPrice(product);
  return products
    .filter((candidate) => candidate.publishable && candidate.id !== product.id && candidate.category === product.category && publicProductPrice(candidate) > 0)
    .filter((candidate) => kind === "up"
      ? publicProductPrice(candidate) > currentPrice
      : kind === "down"
        ? publicProductPrice(candidate) < currentPrice
        : true)
    .sort((a, b) => kind === "down"
      ? publicProductPrice(b) - publicProductPrice(a)
      : publicProductPrice(a) - publicProductPrice(b))
    .slice(0, limit);
}

function budgetRange(budget: GiftBudget) {
  if (budget === "hasta_25000") return [0, 25_000] as const;
  if (budget === "25000_50000") return [25_000, 50_000] as const;
  if (budget === "50000_90000") return [50_000, 90_000] as const;
  return [90_000, Number.POSITIVE_INFINITY] as const;
}

function tokenMatch(values: string[], answer: string) {
  const normalized = answer.trim().toLocaleLowerCase();
  return normalized && values.some((value) => value.toLocaleLowerCase() === normalized);
}

export function findGiftRecommendations(products: Product[], commerce: StorefrontCommerceSettings, answers: GiftFinderAnswers): GiftFinderResult {
  const publishable = products.filter((product) => product.publishable && product.variants.some((variant) => variant.stock > 0));
  const [budgetMin, budgetMax] = budgetRange(answers.budget);
  const scored = publishable.map((product) => {
    const profile = normalizeProductCommerce(product.commerce).giftProfile;
    const price = publicProductPrice(product);
    let score = price >= budgetMin && price <= budgetMax ? 5 : 0;
    if (tokenMatch(profile.recipients, answers.recipient)) score += 4;
    if (tokenMatch(profile.occasions, answers.occasion)) score += 4;
    if (tokenMatch(profile.interests, answers.interest)) score += 3;
    if (answers.timing === "hoy" && profile.urgentReady) score += 3;
    if (answers.giftReady && profile.giftReady) score += 2;
    if (product.description.toLocaleLowerCase().includes(answers.interest.toLocaleLowerCase())) score += 1;
    return { product, price, score };
  }).sort((a, b) => b.score - a.score || Math.abs(a.price - budgetMax) - Math.abs(b.price - budgetMax));

  const main = scored.slice(0, 3).map((item) => item.product);
  const economic = [...scored].sort((a, b) => a.price - b.price).find((item) => !main.some((product) => product.id === item.product.id))?.product;
  const premium = [...scored].sort((a, b) => b.price - a.price).find((item) => !main.some((product) => product.id === item.product.id))?.product;
  const bundle = commerce.bundles.find((item) => item.visible && item.productIds.every((id) => publishable.some((product) => product.id === id)));
  return { main, economic, premium, bundle };
}

export function bundleRegularPrice(bundle: StorefrontBundle, products: Product[]) {
  return bundle.productIds.reduce((sum, productId) => {
    const product = products.find((item) => item.id === productId);
    return sum + (product ? publicProductPrice(product) : 0);
  }, 0);
}

export function bundleLines(bundle: StorefrontBundle, products: Product[]): SaleLine[] {
  const instanceId = crypto.randomUUID();
  return bundle.productIds.flatMap((productId) => {
    const product = products.find((item) => item.id === productId && item.publishable);
    const variant = product?.variants.find((item) => item.stock > 0);
    if (!product || !variant) return [];
    return [{
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      sku: variant.sku,
      quantity: 1,
      unitPrice: variant.webPrice ?? variant.price,
      unitCost: variant.cost,
      bundleId: bundle.id,
      bundleInstanceId: instanceId
    }];
  });
}

export function cartBundleDiscount(lines: SaleLine[], bundles: StorefrontBundle[]) {
  const byInstance = new Map<string, SaleLine[]>();
  for (const line of lines) {
    if (!line.bundleId || !line.bundleInstanceId) continue;
    byInstance.set(line.bundleInstanceId, [...(byInstance.get(line.bundleInstanceId) ?? []), line]);
  }
  let discount = 0;
  for (const instanceLines of byInstance.values()) {
    const bundle = bundles.find((item) => item.id === instanceLines[0]?.bundleId && item.visible);
    if (!bundle) continue;
    const actualIds = instanceLines.map((line) => line.productId).sort().join("|");
    const expectedIds = [...bundle.productIds].sort().join("|");
    if (actualIds !== expectedIds || instanceLines.some((line) => line.quantity !== 1)) continue;
    const regular = instanceLines.reduce((sum, line) => sum + line.unitPrice, 0);
    discount += Math.max(0, regular - bundle.packPrice);
  }
  return discount;
}

export function giftFinderWhatsappUrl(settings: StorefrontCommerceSettings, answers: GiftFinderAnswers, result: GiftFinderResult) {
  const digits = settings.whatsapp.replace(/\D/g, "");
  if (!digits) return "";
  const recommendations = result.main.map((product) => product.name).join(", ");
  const message = [
    "Hola, usé el Buscador de regalos de Regaleria Shop.",
    `Para: ${answers.recipient}. Ocasión: ${answers.occasion}.`,
    `Interés: ${answers.interest}. Presupuesto: ${answers.budget.replace(/_/g, " ")}.`,
    `Lo necesito: ${answers.timing.replace(/_/g, " ")}. Listo para regalar: ${answers.giftReady ? "sí" : "no"}.`,
    recommendations ? `Me recomendó: ${recommendations}.` : "",
    "¿Me ayudan a elegir?"
  ].filter(Boolean).join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
