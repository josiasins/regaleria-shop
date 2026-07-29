import { describe, expect, it } from "vitest";
import { createDefaultStorefrontSettings, normalizeStorefrontSettings } from "./storefront";
import { useStore } from "./store";
import type { Product } from "./types";

describe("storefront settings", () => {
  it("preserves configured categories and appends new catalog categories", () => {
    const originalProducts = structuredClone(useStore.getState().products);
    const defaults = createDefaultStorefrontSettings(originalProducts);
    const configuredCategory = {
      ...defaults.categories[0],
      title: "Seleccion curada",
      description: "Texto editorial conservado.",
      imageUrl: "https://example.com/categoria.jpg",
      visible: false
    };
    const newProduct: Product = {
      ...structuredClone(originalProducts[0]),
      id: "product-new-category",
      name: "Producto nueva categoria",
      category: "Temporada especial",
      publishable: true
    };

    const normalized = normalizeStorefrontSettings(
      {
        ...defaults,
        categories: [configuredCategory]
      },
      [...originalProducts, newProduct]
    );

    expect(normalized.categories.find((item) => item.category === configuredCategory.category)).toMatchObject({
      title: "Seleccion curada",
      description: "Texto editorial conservado.",
      imageUrl: "https://example.com/categoria.jpg",
      visible: false
    });
    expect(normalized.categories.find((item) => item.category === "Temporada especial")).toMatchObject({
      title: "Temporada especial",
      visible: true
    });
    expect(useStore.getState().products).toEqual(originalProducts);
  });

  it("adds centered responsive crops to legacy lifestyle settings", () => {
    const products = structuredClone(useStore.getState().products);
    const defaults = createDefaultStorefrontSettings(products);
    const legacyLifestyle = {
      ...defaults.lifestyle,
      imageUrl: "https://example.com/lifestyle.jpg"
    };
    delete (legacyLifestyle as Partial<typeof legacyLifestyle>).imagePositions;

    const normalized = normalizeStorefrontSettings({
      ...defaults,
      lifestyle: legacyLifestyle
    } as typeof defaults, products);

    expect(normalized.lifestyle.imagePositions).toEqual({
      desktop: { x: 50, y: 50 },
      tablet: { x: 50, y: 50 },
      mobile: { x: 50, y: 50 }
    });
  });

  it("preserves and bounds responsive lifestyle crops", () => {
    const products = structuredClone(useStore.getState().products);
    const defaults = createDefaultStorefrontSettings(products);
    const normalized = normalizeStorefrontSettings({
      ...defaults,
      lifestyle: {
        ...defaults.lifestyle,
        imagePositions: {
          desktop: { x: 20, y: 80 },
          tablet: { x: -15, y: 115 },
          mobile: { x: 64, y: 37 }
        }
      }
    }, products);

    expect(normalized.lifestyle.imagePositions).toEqual({
      desktop: { x: 20, y: 80 },
      tablet: { x: 0, y: 100 },
      mobile: { x: 64, y: 37 }
    });
  });
});
