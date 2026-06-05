import jsPDF from "jspdf";
import type { Sale } from "./types";

export function createReceiptPdf(sale: Sale) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Comprobante interno", 18, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Sin validez fiscal. No reemplaza factura AFIP.", 18, 28);
  doc.text(`Numero: ${sale.receiptNumber}`, 18, 38);
  doc.text(`Fecha: ${new Date(sale.createdAt).toLocaleString("es-AR")}`, 18, 45);
  if (sale.customerName) doc.text(`Cliente: ${sale.customerName}`, 18, 52);

  let y = 66;
  doc.setFont("helvetica", "bold");
  doc.text("Producto", 18, y);
  doc.text("Cant.", 128, y);
  doc.text("Precio", 150, y);
  doc.text("Total", 178, y);
  doc.setFont("helvetica", "normal");
  y += 8;
  sale.lines.forEach((line) => {
    doc.text(line.name.slice(0, 48), 18, y);
    doc.text(String(line.quantity), 132, y);
    doc.text(formatMoney(line.unitPrice), 150, y);
    doc.text(formatMoney(line.unitPrice * line.quantity), 178, y);
    y += 8;
  });
  y += 4;
  doc.text(`Descuento: ${formatMoney(sale.discount)}`, 150, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${formatMoney(sale.total)}`, 150, y);
  doc.save(`${sale.receiptNumber}.pdf`);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}
