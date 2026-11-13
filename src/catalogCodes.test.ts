import { describe, expect, it } from "vitest";
import { codeAlreadyUsed } from "./catalogCodes";
import type { Product } from "./types";
const products = [{variants:[{id:"a",sku:" SKU-01 ",barcode:"123"}]}] as Product[];
describe("catalog identifiers",()=>{
  it("rejects SKU duplicates across products ignoring case/whitespace",()=>expect(codeAlreadyUsed(products,"sku-01")).toBe(true));
  it("rejects reused barcodes but permits blank barcodes",()=>{expect(codeAlreadyUsed(products,"new","123")).toBe(true);expect(codeAlreadyUsed(products,"new","")).toBe(false);});
  it("permits a variant to retain its own identifiers",()=>expect(codeAlreadyUsed(products,"sku-01","123","a")).toBe(false));
});
