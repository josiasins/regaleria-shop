import type { Product } from "./types";
export function codeAlreadyUsed(products: Product[], sku: string, barcode = "", exceptVariantId?: string) {
  const code = sku.trim().toLocaleLowerCase(); const scan = barcode.trim();
  return products.some(product => product.variants.some(variant => variant.id !== exceptVariantId &&
    ((code !== "" && variant.sku.trim().toLocaleLowerCase() === code) || (scan !== "" && variant.barcode.trim() === scan))));
}
