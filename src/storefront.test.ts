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
});
