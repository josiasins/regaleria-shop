import type { Product } from "./types";

export type StorefrontProductRule = "seleccion" | "todos";
export type StorefrontViewport = "desktop" | "tablet" | "mobile";

export interface StorefrontImagePosition {
  x: number;
  y: number;
}

export type StorefrontImagePositions = Record<StorefrontViewport, StorefrontImagePosition>;

export interface StorefrontHero {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  productId: string;
  ctaLabel: string;
  promoTitle: string;
  promoDescription: string;
  promoImageUrl: string;
  promoProductId: string;
  promoCtaLabel: string;
}

export interface StorefrontCategoryCard {
  id: string;
  category: string;
  title: string;
  description: string;
  imageUrl: string;
  visible: boolean;
}

export interface StorefrontSection {
  id: string;
  title: string;
  subtitle: string;
  visible: boolean;
  rule: StorefrontProductRule;
  productIds: string[];
}

export interface StorefrontLifestyle {
  visible: boolean;
  title: string;
  description: string;
  imageUrl: string;
  imagePositions: StorefrontImagePositions;
  ctaLabel: string;
  productIds: string[];
}

export interface StorefrontSettings {
  version: 1;
  announcement: string;
  hero: StorefrontHero;
  categories: StorefrontCategoryCard[];
  sections: StorefrontSection[];
  lifestyle: StorefrontLifestyle;
  updatedAt: string;
}

function categoryId(category: string) {
  return `category-${category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function categoryDescription(category: string) {
  const normalized = category.toLocaleLowerCase();
  if (normalized.includes("mate") || normalized.includes("termo")) return "Para acompañar rituales de todos los días.";
  if (normalized.includes("bazar")) return "Objetos útiles que también quedan lindos.";
  if (normalized.includes("marroquin")) return "Bolsos y accesorios para llevar a todas partes.";
  if (normalized.includes("accesor")) return "Detalles que completan un regalo especial.";
  if (normalized.includes("deco")) return "Pequeños cambios para transformar un ambiente.";
  return "Una selección pensada para regalar y disfrutar.";
}

function firstProductImage(products: readonly Product[], category?: string) {
  return products.find((product) => (!category || product.category === category) && product.imageUrl)?.imageUrl ?? "";
}

function productImage(products: readonly Product[], productId: string) {
  return products.find((product) => product.id === productId)?.imageUrl ?? "";
}

export function createDefaultStorefrontImagePositions(): StorefrontImagePositions {
  return {
    desktop: { x: 50, y: 50 },
    tablet: { x: 50, y: 50 },
    mobile: { x: 50, y: 50 }
  };
}

function normalizePosition(value: Partial<StorefrontImagePosition> | null | undefined): StorefrontImagePosition {
  const clamp = (number: unknown) => Math.min(100, Math.max(0, Number.isFinite(Number(number)) ? Number(number) : 50));
  return { x: clamp(value?.x), y: clamp(value?.y) };
}

function normalizeImagePositions(value: Partial<StorefrontImagePositions> | null | undefined): StorefrontImagePositions {
  const defaults = createDefaultStorefrontImagePositions();
  return {
    desktop: normalizePosition(value?.desktop ?? defaults.desktop),
    tablet: normalizePosition(value?.tablet ?? defaults.tablet),
    mobile: normalizePosition(value?.mobile ?? defaults.mobile)
  };
}

export function createDefaultStorefrontSettings(products: readonly Product[]): StorefrontSettings {
  const publishable = products.filter((product) => product.publishable);
  const categories = Array.from(new Set(publishable.map((product) => product.category).filter(Boolean)));
  const heroProduct = publishable.find((product) => product.imageUrl) ?? publishable[0];
  const promoProduct = publishable.find((product) => product.id !== heroProduct?.id && product.imageUrl) ?? heroProduct;

  return {
    version: 1,
    announcement: "Retiro en el local y envíos coordinados",
    hero: {
      eyebrow: "Regalos que se sienten personales",
      title: "Encontrá eso que querías regalar",
      description: "Ideas para celebrar, agradecer o darte un gusto. Elegí con stock real y comprá sin vueltas.",
      imageUrl: heroProduct?.imageUrl ?? "",
      productId: heroProduct?.id ?? "",
      ctaLabel: "Explorar productos",
      promoTitle: promoProduct?.name ?? "Una selección para sorprender",
      promoDescription: "Combinaciones listas para descubrir.",
      promoImageUrl: promoProduct?.imageUrl ?? "",
      promoProductId: promoProduct?.id ?? "",
      promoCtaLabel: "Ver detalle"
    },
    categories: categories.map((category) => ({
      id: categoryId(category),
      category,
      title: category,
      description: categoryDescription(category),
      imageUrl: firstProductImage(publishable, category),
      visible: true
    })),
    sections: [
      {
        id: "novedades",
        title: "Novedades",
        subtitle: "Lo último que llegó a la tienda",
        visible: true,
        rule: "seleccion",
        productIds: publishable.slice(0, 8).map((product) => product.id)
      },
      {
        id: "favoritos",
        title: "Ideas que siempre funcionan",
        subtitle: "Regalos elegidos para distintas ocasiones",
        visible: true,
        rule: "todos",
        productIds: []
      }
    ],
    lifestyle: {
      visible: false,
      title: "Armá un regalo con intención",
      description: "Combiná piezas que se acompañan y creá una presentación única.",
      imageUrl: "",
      imagePositions: createDefaultStorefrontImagePositions(),
      ctaLabel: "Ver la selección",
      productIds: []
    },
    updatedAt: new Date(0).toISOString()
  };
}

export function normalizeStorefrontSettings(value: Partial<StorefrontSettings> | null | undefined, products: readonly Product[]): StorefrontSettings {
  const defaults = createDefaultStorefrontSettings(products);
  if (!value || value.version !== 1) return defaults;

  const configuredCategories = new Map((value.categories ?? []).map((item) => [item.category.toLocaleLowerCase(), item]));
  const productCategories = Array.from(new Set(products.filter((product) => product.publishable).map((product) => product.category).filter(Boolean)));
  const categories = productCategories.map((category) => {
    const configured = configuredCategories.get(category.toLocaleLowerCase());
    return configured
      ? {
          ...configured,
          id: configured.id || categoryId(category),
          category,
          title: configured.title || category,
          description: configured.description || categoryDescription(category),
          imageUrl: configured.imageUrl || firstProductImage(products, category)
        }
      : {
          id: categoryId(category),
          category,
          title: category,
          description: categoryDescription(category),
          imageUrl: firstProductImage(products, category),
          visible: true
        };
  });

  const knownCategoryKeys = new Set(productCategories.map((category) => category.toLocaleLowerCase()));
  for (const configured of value.categories ?? []) {
    if (!knownCategoryKeys.has(configured.category.toLocaleLowerCase())) categories.push(configured);
  }

  const hero = { ...defaults.hero, ...(value.hero ?? {}) };
  if (!hero.imageUrl && hero.productId) hero.imageUrl = productImage(products, hero.productId);
  if (!hero.promoImageUrl && hero.promoProductId) hero.promoImageUrl = productImage(products, hero.promoProductId);

  return {
    ...defaults,
    ...value,
    version: 1,
    hero,
    categories,
    sections: value.sections?.length ? value.sections : defaults.sections,
    lifestyle: {
      ...defaults.lifestyle,
      ...(value.lifestyle ?? {}),
      imagePositions: normalizeImagePositions(value.lifestyle?.imagePositions)
    },
    updatedAt: value.updatedAt || defaults.updatedAt
  };
}

export function productsForStorefrontSection(section: StorefrontSection, products: readonly Product[]) {
  const publishable = products.filter((product) => product.publishable);
  if (section.rule === "todos") return publishable;
  const productMap = new Map(publishable.map((product) => [product.id, product]));
  return section.productIds.flatMap((id) => {
    const product = productMap.get(id);
    return product ? [product] : [];
  });
}
