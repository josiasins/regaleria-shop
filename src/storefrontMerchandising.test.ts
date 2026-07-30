import { describe, expect, it } from "vitest";
import {
  cartBundleDiscount,
  createDefaultStorefrontCommerce,
  findGiftRecommendations,
  normalizeProductCommerce,
  relatedProducts,
  type StorefrontBundle
} from "./storefrontMerchandising";
import type { Product } from "./types";

function product(id: string, price: number, stock = 1, category = "Bazar"): Product {
  return {
    id,
    name: `Producto ${id}`,
    category,
    supplier: "Proveedor",
    description: "Regalo para deco",
    publishable: true,
    imageUrl: "",
    variants: [{
      id: `variant-${id}`,
      name: "Único",
      sku: id,
      barcode: id,
      stock,
      lowStockAt: 1,
      cost: 10,
      price
    }],
    syncStatus: "sincronizado"
  };
}

describe("storefront merchandising", () => {
  it("limits explicit relationships and keeps old products compatible", () => {
    const normalized = normalizeProductCommerce({
      crossSellProductIds: ["a", "b", "c", "d"]
    });
    expect(normalized.crossSellProductIds).toEqual(["a", "b", "c"]);
    expect(normalized.dedicationAvailable).toBe(true);
  });

  it("returns no more than three relevant alternatives", () => {
    const source = product("source", 50);
    const products = [source, product("a", 60), product("b", 70), product("c", 80), product("d", 90)];
    expect(relatedProducts(source, products, "up")).toHaveLength(3);
  });

  it("never recommends hidden or out-of-stock products", () => {
    const available = product("available", 30);
    available.commerce = {
      ...normalizeProductCommerce(),
      giftProfile: {
        recipients: ["mamá"],
        occasions: ["cumpleaños"],
        interests: ["deco"],
        budget: "medio",
        urgentReady: true,
        giftReady: true
      }
    };
    const outOfStock = product("out", 20, 0);
    const result = findGiftRecommendations([available, outOfStock], createDefaultStorefrontCommerce(), {
      recipient: "mamá",
      occasion: "cumpleaños",
      interest: "deco",
      budget: "25000_50000",
      timing: "hoy",
      giftReady: true
    });
    expect(result.main.map((item) => item.id)).toEqual(["available"]);
  });

  it("applies a pack saving only when the exact configured set is present", () => {
    const bundle: StorefrontBundle = {
      id: "pack",
      title: "Pack",
      tier: "completo",
      description: "",
      productIds: ["a", "b"],
      packPrice: 70,
      visible: true
    };
    const lines = [
      { productId: "a", variantId: "va", name: "A", sku: "a", quantity: 1, unitPrice: 40, unitCost: 1, bundleId: "pack", bundleInstanceId: "one" },
      { productId: "b", variantId: "vb", name: "B", sku: "b", quantity: 1, unitPrice: 50, unitCost: 1, bundleId: "pack", bundleInstanceId: "one" }
    ];
    expect(cartBundleDiscount(lines, [bundle])).toBe(20);
    expect(cartBundleDiscount(lines.slice(0, 1), [bundle])).toBe(0);
  });
});
