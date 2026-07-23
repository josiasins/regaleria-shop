import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { resetStore, salePaidAmount, salePaymentStatus, useStore } from "./store";

describe("Regaleria app", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetStore();
  });

  it("shows the dashboard and operational metrics", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByText("Ventas del periodo")).toBeInTheDocument();
    expect(screen.getByText("Decisiones sugeridas")).toBeInTheDocument();
  });

  it("requires an open shift before registering a sale", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Ventas/i }));
    expect(screen.getByRole("button", { name: /Confirmar venta/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Turnos" }));
    await user.clear(screen.getByLabelText("Efectivo inicial"));
    await user.type(screen.getByLabelText("Efectivo inicial"), "10000");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));

    await user.click(screen.getAllByRole("button", { name: /^Agregar /i })[0]);
    await user.click(screen.getByRole("button", { name: /Confirmar venta/i }));
    expect(screen.getByText("CI-000003")).toBeInTheDocument();
    expect(screen.getByText(/Consumidor final/i)).toBeInTheDocument();
    expect(screen.getByText(/Sincronizando/i)).toBeInTheDocument();
  });

  it("can open a sales shift with declared cash", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Ventas/i }));
    await user.click(screen.getByRole("button", { name: "Turnos" }));

    await user.clear(screen.getByLabelText("Efectivo inicial"));
    await user.type(screen.getByLabelText("Efectivo inicial"), "15000");
    await user.type(screen.getByLabelText("Nota del turno"), "Caja mostrador mañana");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));

    expect(screen.getByText("TURNO-000001")).toBeInTheDocument();
    expect(screen.getAllByText(/Efectivo inicial/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sincronizando/i)).toBeInTheDocument();
  });

  it("can add a product and register a grouped stock operation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Stock/i }));
    await user.click(screen.getByRole("button", { name: /Nuevo producto/i }));

    await user.type(screen.getByLabelText("Producto"), "Llavero inicial");
    await user.type(screen.getAllByLabelText("SKU")[0], "LLA-INI-001");
    await user.clear(screen.getAllByLabelText("Precio")[0]);
    await user.type(screen.getAllByLabelText("Precio")[0], "2500");
    await user.click(screen.getByRole("button", { name: /Crear producto/i }));

    expect(screen.getByText("Llavero inicial")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    await user.clear(screen.getByLabelText("Stock real producto 1"));
    await user.type(screen.getByLabelText("Stock real producto 1"), "99");
    await user.type(screen.getByLabelText("Motivo de la operacion"), "Conteo de prueba");
    await user.click(screen.getByRole("button", { name: /Registrar operacion de stock/i }));
    expect(screen.getByText(/Conteo de prueba/i)).toBeInTheDocument();
  });

  it("groups stock count lines in one operation and preserves an audited void", () => {
    const originalProducts = useStore.getState().products;
    const first = originalProducts[0].variants[0];
    const second = originalProducts[1].variants[0];
    const created = useStore.getState().adjustStockBatch({
      reason: "Conteo general del local",
      lines: [
        { variantId: first.id, actualStock: first.stock + 3 },
        { variantId: second.id, actualStock: Math.max(0, second.stock - 1) }
      ]
    });

    expect(created).toHaveLength(2);
    expect(created?.[0].operationId).toBe(created?.[1].operationId);
    expect(created?.[0].operationNumber).toMatch(/^MOV-/);
    expect(useStore.getState().products[0].variants[0].stock).toBe(first.stock + 3);
    expect(useStore.getState().products[1].variants[0].stock).toBe(second.stock - 1);

    const voided = useStore.getState().voidStockMovementBatch(created?.[0].operationId ?? "", "Conteo cargado por error", "dueno");
    expect(voided).toBe(true);
    expect(useStore.getState().products[0].variants[0].stock).toBe(first.stock);
    expect(useStore.getState().products[1].variants[0].stock).toBe(second.stock);
    expect(useStore.getState().movements.filter((item) => item.operationId === created?.[0].operationId).every((item) => item.voidedAt)).toBe(true);
    expect(useStore.getState().operationAuditEntries[0]).toMatchObject({ entityType: "movimiento", action: "eliminacion" });
  });

  it("shows the complete stock history through filters and progressive loading", async () => {
    const baseMovement = useStore.getState().movements[0];
    useStore.setState({
      movements: Array.from({ length: 25 }, (_, index) => ({
        ...baseMovement,
        id: `history_${index}`,
        reason: `Conteo historico ${index}`,
        createdAt: new Date(Date.now() - index * 60_000).toISOString()
      }))
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Stock/i }));
    await user.click(screen.getByRole("button", { name: "Historial" }));
    expect(screen.getByText("25 movimiento(s)")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 20 de 25 operaciones")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cargar 20 mas" }));
    expect(screen.getByText("Historial completo visible")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar en historial de stock"), "Conteo historico 24");
    expect(screen.getByText("1 movimiento(s)")).toBeInTheDocument();
  });

  it("can create a category while adding a product", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Stock/i }));
    await user.click(screen.getByRole("button", { name: /Nuevo producto/i }));

    await user.type(screen.getByLabelText("Producto"), "Agenda artesanal");
    await user.selectOptions(screen.getByLabelText("Categoria"), "__new");
    await user.type(screen.getByLabelText("Nueva categoria"), "Papeleria");
    await user.type(screen.getAllByLabelText("SKU")[0], "AGE-ART-001");
    await user.clear(screen.getAllByLabelText("Precio")[0]);
    await user.type(screen.getAllByLabelText("Precio")[0], "7200");
    await user.click(screen.getByRole("button", { name: /Crear producto/i }));

    expect(await screen.findByText("Agenda artesanal")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    expect(screen.getByRole("option", { name: "Papeleria" })).toBeInTheDocument();
  });

  it("keeps categories already assigned to catalog products available in product creation", async () => {
    const products = useStore.getState().products;
    useStore.setState({
      products: [{ ...products[0], category: "Marroquineria" }, ...products.slice(1)],
      categories: ["Deco"]
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Stock/i }));
    await user.click(screen.getByRole("button", { name: /Nuevo producto/i }));

    expect(screen.getByRole("option", { name: "Marroquineria" })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "Sin categoria" })).toHaveLength(1);
  });

  it("opens the catalog editor from a product in stock control", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Stock/i }));
    await user.click(screen.getByRole("button", { name: "Editar Set matero premium" }));

    expect(screen.getByText("Editar producto")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Set matero premium" })).toBeInTheDocument();
  });

  it("can create a detailed sale with cart lines", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Ventas/i }));
    await user.click(screen.getByRole("button", { name: "Turnos" }));
    await user.clear(screen.getByLabelText("Efectivo inicial"));
    await user.type(screen.getByLabelText("Efectivo inicial"), "5000");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));

    await user.selectOptions(screen.getByLabelText("Cliente"), "nuevo");
    await user.type(screen.getByLabelText("Nuevo cliente"), "Rocio mostrador");
    await user.click(screen.getAllByRole("button", { name: /^Agregar /i })[0]);
    expect((await screen.findAllByText(/MAT-PREM-NEG/i)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Confirmar venta/i }));

    expect((await screen.findAllByText(/Rocio mostrador/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sincronizando/i)).toBeInTheDocument();
  });

  it("keeps historical sales intact and records later partial collections", () => {
    const historicalSale = useStore.getState().sales[0];
    expect(salePaymentStatus(historicalSale)).toBe("pagada");
    expect(salePaidAmount(historicalSale)).toBe(historicalSale.total);

    const state = useStore.getState();
    const shift = state.openCashShift(2000, "dueno", "Cobro de pendientes");
    const product = state.products[0];
    const variant = product.variants[0];
    const partialSale = useStore.getState().addDetailedSale({
      shiftId: shift?.id ?? "",
      customerName: "Cliente con saldo",
      lines: [{ productId: product.id, variantId: variant.id, name: `${product.name} - ${variant.name}`, sku: variant.sku, quantity: 1, unitPrice: variant.price, unitCost: variant.cost }],
      discount: 0,
      paymentMethod: "efectivo",
      paymentStatus: "parcial",
      initialPaymentAmount: 1000
    });

    expect(partialSale).toMatchObject({ paymentStatus: "parcial", paidAmount: 1000 });
    const completed = useStore.getState().addSalePayment(partialSale?.id ?? "", {
      amount: Math.max((partialSale?.total ?? 0) - 1000, 0),
      paymentMethod: "transferencia",
      shiftId: shift?.id,
      requestedBy: "dueno"
    });
    expect(completed).toMatchObject({ paymentStatus: "pagada", paidAmount: partialSale?.total });
    expect(useStore.getState().salesAuditEntries[0]).toMatchObject({ entityType: "venta", action: "cobro" });
  });

  it("can close a shift with the current shift sales detail", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Ventas/i }));
    await user.click(screen.getByRole("button", { name: "Turnos" }));
    await user.clear(screen.getByLabelText("Efectivo inicial"));
    await user.type(screen.getByLabelText("Efectivo inicial"), "10000");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));

    await user.click(screen.getByRole("button", { name: "Punto de venta" }));
    await user.click(screen.getAllByRole("button", { name: /^Agregar /i })[0]);
    await user.click(screen.getByRole("button", { name: /Confirmar venta/i }));
    await user.click(screen.getByRole("button", { name: "Turnos" }));
    expect(screen.getByText(/Efectivo esperado/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Cerrar turno/i }));

    expect(screen.getByText(/Ventas del turno TURNO-000001/i)).toBeInTheDocument();
    expect(screen.getByText(/CI-000003/i)).toBeInTheDocument();
    expect(screen.getByText(/Esperado en efectivo/i)).toBeInTheDocument();
  });

  it("allows only the owner to audit, void and restore sales", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Ventas/i }));
    await user.click(screen.getByRole("button", { name: "Turnos" }));
    await user.clear(screen.getByLabelText("Efectivo inicial"));
    await user.type(screen.getByLabelText("Efectivo inicial"), "10000");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));
    await user.click(screen.getByRole("button", { name: "Punto de venta" }));
    await user.click(screen.getAllByRole("button", { name: /^Agregar /i })[0]);
    await user.click(screen.getByRole("button", { name: /Confirmar venta/i }));

    await user.click(screen.getByRole("button", { name: "Auditoria" }));
    await user.type(screen.getByLabelText("Motivo"), "Error de carga");
    await user.clear(screen.getByLabelText("Cliente"));
    await user.type(screen.getByLabelText("Cliente"), "Cliente auditado");
    await user.click(screen.getByRole("button", { name: /Guardar correccion/i }));
    expect(screen.getAllByText(/Venta corregida/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/correccion/i).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Motivo"), "Venta duplicada");
    await user.click(screen.getByRole("button", { name: /Anular venta/i }));
    expect(screen.getAllByText(/Venta anulada/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/eliminacion/i).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Motivo"), "Restaurar venta");
    await user.click(screen.getAllByRole("button", { name: /Restaurar/i })[0]);
    expect(screen.getAllByText(/Venta restaurada/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/restauracion/i).length).toBeGreaterThan(0);
  });

  it("hides sales audit from non-owner roles", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Rol de la cuenta"), "administrador");
    await user.click(screen.getByRole("button", { name: /Ventas/i }));
    expect(screen.queryByRole("button", { name: "Auditoria" })).not.toBeInTheDocument();
  });

  it("can create a quote without closing a sale", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Presupuestos/i }));

    await user.selectOptions(screen.getByLabelText("Cliente"), "nuevo");
    await user.type(screen.getByLabelText("Nuevo cliente"), "Mayorista Sur");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));
    expect((await screen.findAllByText(/MAT-PREM-NEG/i)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Crear presupuesto/i }));

    expect((await screen.findAllByText(/Mayorista Sur/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/abierto/i).length).toBeGreaterThan(0);
  });

  it("can register a supplier receipt and add stock", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Compras/i }));

    await user.selectOptions(screen.getAllByLabelText("Proveedor")[0], "nuevo");
    await user.type(screen.getByLabelText("Nuevo proveedor"), "Mayorista regalos");
    await user.type(screen.getByLabelText("Numero de comprobante"), "R-100");
    fireEvent.change(screen.getByLabelText("Fecha de compra"), { target: { value: "2026-05-18" } });
    await user.clear(screen.getByLabelText("Costo por producto"));
    await user.type(screen.getByLabelText("Costo por producto"), "11500");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));
    expect((screen.getByLabelText("Producto") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("Buscar producto") as HTMLInputElement).value).toBe("");
    await user.click(screen.getByRole("button", { name: /Registrar compra/i }));

    expect(await screen.findByText(/COM-000001/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mayorista regalos/i).length).toBeGreaterThan(0);
    expect(useStore.getState().purchaseReceipts[0].createdAt.slice(0, 10)).toBe("2026-05-18");

    await user.click(screen.getByRole("button", { name: /Stock/i }));
    const stockHistoryButtons = screen.getAllByRole("button", { name: "Historial" });
    await user.click(stockHistoryButtons[stockHistoryButtons.length - 1]);
    expect(screen.getByText(/COM-000001/i)).toBeInTheDocument();
  });

  it("links split payments to a supplier receipt", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Compras/i }));
    await user.type(screen.getByLabelText("Numero de comprobante"), "PAGO-100");
    await user.clear(screen.getByLabelText("Costo por producto"));
    await user.type(screen.getByLabelText("Costo por producto"), "10000");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));
    await user.click(screen.getByLabelText("Compra pagada"));
    await user.clear(screen.getByLabelText("Monto del pago 1"));
    await user.type(screen.getByLabelText("Monto del pago 1"), "6000");
    await user.click(screen.getByRole("button", { name: /Agregar otro medio/i }));
    await user.selectOptions(screen.getAllByLabelText("Medio de pago")[1], "transferencia");
    await user.type(screen.getByLabelText("Monto del pago 2"), "4000");
    await user.click(screen.getByRole("button", { name: /Registrar compra/i }));

    const receipt = useStore.getState().purchaseReceipts[0];
    const payments = useStore.getState().supplierPayments.filter((payment) => payment.receiptId === receipt.id);
    expect(payments).toHaveLength(2);
    expect(payments.map((payment) => payment.paymentMethod).sort()).toEqual(["efectivo", "transferencia"]);
  });

  it("registers a later payment against a selected receipt", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Compras/i }));
    await user.type(screen.getByLabelText("Numero de comprobante"), "PAGO-101");
    await user.clear(screen.getByLabelText("Costo por producto"));
    await user.type(screen.getByLabelText("Costo por producto"), "8000");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));
    await user.click(screen.getByRole("button", { name: /Registrar compra/i }));

    const receipt = useStore.getState().purchaseReceipts[0];
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await user.selectOptions(screen.getByLabelText("Factura o remito cargado"), receipt.id);
    await user.type(screen.getByLabelText("Monto del pago 1"), "3000");
    await user.click(screen.getByRole("button", { name: "Confirmar pago de factura" }));

    expect(useStore.getState().supplierPayments).toEqual(expect.arrayContaining([expect.objectContaining({ receiptId: receipt.id, amount: 3000 })]));
  });

  it("restores the current section and an unfinished purchase after a reload", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await user.click(screen.getByRole("button", { name: /Compras/i }));
    await user.type(screen.getByLabelText("Numero de comprobante"), "BORRADOR-2026-01");
    expect(screen.getByText(/Borrador guardado automáticamente/i)).toBeInTheDocument();

    firstRender.unmount();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Compras" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("BORRADOR-2026-01")).toBeInTheDocument();
    expect(screen.getByText(/Borrador guardado automáticamente/i)).toBeInTheDocument();
  });

  it("finds a purchase product by barcode and description", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Compras/i }));
    await user.type(screen.getByLabelText("Buscar producto"), "7790002000011");
    expect(screen.getByRole("option", { name: "Vela aromatica artesanal · Vainilla · VEL-SOJ-VAI · Stock 18" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Buscar producto"));
    await user.type(screen.getByLabelText("Buscar producto"), "vaso de vidrio");
    expect(screen.getByRole("option", { name: "Vela aromatica artesanal · Vainilla · VEL-SOJ-VAI · Stock 18" })).toBeInTheDocument();
  });

  it("discriminates VAT for a purchase registered as Factura A", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Compras/i }));
    await user.selectOptions(screen.getByLabelText("Tipo de comprobante"), "factura_a");
    expect(screen.getByLabelText("Importe ingresado")).toBeInTheDocument();
    expect(screen.getByLabelText("Alícuota IVA")).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Costo por producto \(con IVA\)/i));
    await user.type(screen.getByLabelText(/Costo por producto \(con IVA\)/i), "12100");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));
    await user.type(screen.getByLabelText("Numero de comprobante"), "A-0001-00000001");
    await user.click(screen.getByRole("button", { name: /Registrar compra/i }));

    const receipt = useStore.getState().purchaseReceipts[0];
    expect(receipt.documentType).toBe("factura_a");
    expect(receipt.lines[0]).toMatchObject({ unitCost: 12100, unitNetCost: 10000, vatSubtotal: 2100, vatRate: 21 });
    expect(receipt).toMatchObject({ netTotal: 10000, vatTotal: 2100, total: 12100 });
  });

  it("can create and edit customers and suppliers", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/i }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre"), "Cliente Mostrador");
    await user.type(screen.getByLabelText("Telefono"), "3511234567");
    await user.click(screen.getByRole("button", { name: /Crear cliente/i }));
    expect(screen.getAllByText(/Cliente Mostrador/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Proveedores/i }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await user.type(screen.getByLabelText("Nombre"), "Proveedor Nuevo");
    await user.type(screen.getByLabelText("Email"), "proveedor@example.com");
    await user.click(screen.getByRole("button", { name: /Crear proveedor/i }));
    expect(screen.getByText(/Proveedor Nuevo/i)).toBeInTheDocument();
  });

  it("lets the owner delete and restore customers", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/i }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre"), "Cliente a restaurar");
    await user.click(screen.getByRole("button", { name: /Crear cliente/i }));

    await user.click(screen.getByRole("button", { name: /Mover a eliminados/i }));
    expect(screen.queryByText("Cliente a restaurar")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminados" }));
    expect(screen.getAllByText("Cliente a restaurar").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Restaurar/i }));
    expect(screen.getByText("No hay clientes eliminados.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Volver a clientes/i }));
    expect(screen.getAllByText("Cliente a restaurar").length).toBeGreaterThan(0);
  });

  it("lets administrators delete and restore suppliers with history", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Rol de la cuenta"), "administrador");
    await user.click(screen.getByRole("button", { name: /Proveedores/i }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await user.type(screen.getByLabelText("Nombre"), "Proveedor a borrar");
    await user.click(screen.getByRole("button", { name: /Crear proveedor/i }));

    await user.click(screen.getAllByRole("button", { name: /Borrar/i })[0]);
    expect(screen.queryByText("Proveedor a borrar")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminados" }));
    expect(screen.getByText("Proveedor a borrar")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Restaurar/i }));
    expect(screen.getByText("No hay proveedores eliminados.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Historial" }));
    expect(screen.getByText(/Baja de proveedor/i)).toBeInTheDocument();
    expect(screen.getByText(/Restauracion de proveedor/i)).toBeInTheDocument();
  });

  it("can edit catalog product details", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Catalogo/i }));

    expect(screen.getByRole("button", { name: /Cuadricula/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lista/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Producto")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^Editar$/i })[0]);
    expect(screen.getByText("Editar producto")).toBeInTheDocument();
    const productInputs = screen.getAllByLabelText("Producto");
    await user.clear(productInputs[0]);
    await user.type(productInputs[0], "Set matero premium editado");
    await user.selectOptions(screen.getAllByLabelText("Categoria")[0], "Regalos personalizados");
    await user.click(screen.getByRole("button", { name: /Guardar producto/i }));

    expect(screen.getByText("Set matero premium editado")).toBeInTheDocument();
    expect(screen.getAllByText("Regalos personalizados").length).toBeGreaterThan(0);
    expect(screen.getByText(/Sincronizando/i)).toBeInTheDocument();
  });

  it("reorders product images and keeps the first one as the cover", async () => {
    const user = userEvent.setup();
    const originalProduct = useStore.getState().products[0];
    const originalImages = [...(originalProduct.imageUrls ?? [])];
    expect(originalImages).toHaveLength(2);
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    await user.click(screen.getAllByRole("button", { name: /^Editar$/i })[0]);
    const firstImage = screen.getByRole("button", { name: "Imagen 1 de 2. Arrastrá para ordenar." });
    fireEvent.keyDown(firstImage, { key: "ArrowRight", altKey: true });
    expect(screen.getByText(/Orden actualizado/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Guardar producto/i }));

    const saved = useStore.getState().products.find((product) => product.id === originalProduct.id);
    expect(saved?.imageUrls).toEqual([originalImages[1], originalImages[0]]);
    expect(saved?.imageUrl).toBe(originalImages[1]);
  });

  it("uses dedicated scroll regions for operational product results", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Ventas/i }));
    expect(screen.getByLabelText("Lista desplazable de productos para la venta")).toHaveClass("pos-product-table");

    await user.click(screen.getByRole("button", { name: /Productos y stock/i }));
    expect(screen.getByLabelText("Lista desplazable de productos y stock")).toHaveClass("inventory-table");

    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    expect(screen.getByLabelText("Resultados desplazables del catalogo")).toHaveClass("catalog-results-scroll");
  });

  it("keeps supplier data while saving brand and separate catalog prices", async () => {
    const user = userEvent.setup();
    const originalProduct = useStore.getState().products[0];
    const originalSupplier = originalProduct.supplier;
    const variant = originalProduct.variants[0];
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    await user.click(screen.getAllByRole("button", { name: /^Editar$/i })[0]);
    await user.clear(screen.getByLabelText("Marca"));
    await user.type(screen.getByLabelText("Marca"), "Marca de prueba");
    await user.clear(screen.getByLabelText(`Precio interno - ${variant.name}`));
    await user.type(screen.getByLabelText(`Precio interno - ${variant.name}`), "15400");
    expect(screen.getByLabelText(`Usar precio web - ${variant.name}`)).not.toBeChecked();
    await user.click(screen.getByLabelText(`Usar precio web - ${variant.name}`));
    await user.clear(screen.getByLabelText(`Precio web - ${variant.name}`));
    await user.type(screen.getByLabelText(`Precio web - ${variant.name}`), "14900");
    expect(screen.getByText("Título SEO")).not.toBeVisible();
    await user.click(screen.getByText("SEO para la web"));
    expect(screen.getByText("Título SEO")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Guardar producto/i }));

    const saved = useStore.getState().products.find((product) => product.id === originalProduct.id);
    expect(saved).toMatchObject({ supplier: originalSupplier, brand: "Marca de prueba" });
    expect(saved?.variants.find((item) => item.id === variant.id)).toMatchObject({ price: 15400, webPrice: 14900 });
  });

  it("allows the owner to delete a product after confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    await user.click(screen.getAllByRole("button", { name: /^Editar$/i })[0]);

    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText(/Esta acción no se puede deshacer/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Confirmar eliminación/i }));

    expect(await screen.findByText("Productos del catalogo")).toBeInTheDocument();
    expect(screen.queryByText("Set matero premium")).not.toBeInTheDocument();
    expect(screen.getByText("2 de 2 ficha(s), 1 visibles en web publica.")).toBeInTheDocument();
  });

  it("shows product deletion only to owners and administrators", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.selectOptions(screen.getByLabelText("Rol de la cuenta"), "administrador");
    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    await user.click(screen.getAllByRole("button", { name: /^Editar$/i })[0]);
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();

    unmount();
    resetStore();
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Rol de la cuenta"), "encargado");
    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    await user.click(screen.getAllByRole("button", { name: /^Editar$/i })[0]);
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("shows a limited menu for the cashier role", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Rol de la cuenta"), "cajero");
    expect(screen.getByRole("button", { name: /Ventas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clientes/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Compras/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gastos/i })).not.toBeInTheDocument();
  });

  it("hides suppliers from the employee role", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Rol de la cuenta"), "encargado");
    expect(screen.queryByRole("button", { name: "Proveedores" })).not.toBeInTheDocument();
  });

  it("can add a new variant to an existing product", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Stock/i }));
    await user.click(screen.getByRole("button", { name: "Variantes" }));
    await user.click(screen.getByRole("button", { name: "Agregar nueva" }));
    await user.type(screen.getByLabelText("Nombre"), "Rojo");
    await user.type(screen.getByLabelText("SKU"), "MAT-PREM-ROJ");
    const priceInputs = screen.getAllByLabelText("Precio");
    await user.clear(priceInputs[0]);
    await user.type(priceInputs[0], "19900");
    await user.click(screen.getByRole("button", { name: /Agregar variante/i }));
    expect(await screen.findByText(/Variante agregada y sincronizada/i)).toBeInTheDocument();
  });

  it("can load and confirm a manual transfer", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Transferencias/i }));

    await user.type(screen.getByLabelText("Envia"), "Cliente transferencia");
    await user.clear(screen.getByLabelText("Monto"));
    await user.type(screen.getByLabelText("Monto"), "12000");
    await user.click(screen.getByRole("button", { name: /Guardar transferencia/i }));

    expect(await screen.findByText("Cliente transferencia")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /Confirmar/i })[0]);
    expect(screen.getAllByText(/confirmado/i).length).toBeGreaterThan(0);
  });

  it("can create an online order from the public shop", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Web publica/i }));

    await user.click(screen.getAllByRole("button", { name: "Agregar" })[0]);
    expect(screen.queryByRole("heading", { name: "Carrito" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Carrito, 1 productos/i }));
    expect(screen.getByRole("heading", { name: "Carrito" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nombre"), "Comprador Web");
    await user.type(screen.getByLabelText("Email"), "comprador@example.com");
    await user.type(screen.getByLabelText("Teléfono"), "3515551234");
    await user.click(screen.getByRole("button", { name: /Confirmar pedido/i }));

    expect(await screen.findByText("WEB-000001")).toBeInTheDocument();
    expect(screen.getByText(/Comprador Web/i)).toBeInTheDocument();
  });

  it("can show and clear the offline sync queue", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Gastos/i }));
    await user.clear(screen.getByLabelText("Monto"));
    await user.type(screen.getByLabelText("Monto"), "3000");
    await user.type(screen.getByLabelText("Proveedor"), "Libreria");
    await user.click(screen.getByRole("button", { name: /Guardar gasto/i }));

    await user.click(screen.getByRole("button", { name: /Configuracion/i }));
    await user.click(screen.getByRole("button", { name: "Sincronizacion" }));
    expect(screen.getByText(/elemento\(s\) en cola/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Sincronizar ahora/i }));
    expect(screen.getByText("0 elemento(s) en cola.")).toBeInTheDocument();
  });

  it("can edit, delete and restore recent expenses with history", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Gastos/i }));
    await user.clear(screen.getByLabelText("Monto"));
    await user.type(screen.getByLabelText("Monto"), "4200");
    await user.type(screen.getByLabelText("Proveedor"), "Flete moto");
    await user.type(screen.getByLabelText("Nota"), "Envio centro");
    await user.click(screen.getByRole("button", { name: /Guardar gasto/i }));

    await user.click(screen.getAllByRole("button", { name: /^Editar$/i })[0]);
    await user.clear(screen.getByLabelText("Monto"));
    await user.type(screen.getByLabelText("Monto"), "4500");
    await user.clear(screen.getByLabelText("Nota"));
    await user.type(screen.getByLabelText("Nota"), "Envio centro corregido");
    await user.click(screen.getByRole("button", { name: /Guardar gasto/i }));

    expect(screen.getByText(/4\.500/)).toBeInTheDocument();
    expect(screen.getByText(/Envio centro corregido/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Borrar/i })[0]);
    expect(screen.queryByText(/Envio centro corregido/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminados" }));
    expect(screen.getByText(/Envio centro corregido/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Restaurar/i }));

    const expenseHistoryButtons = screen.getAllByRole("button", { name: "Historial" });
    await user.click(expenseHistoryButtons[expenseHistoryButtons.length - 1]);
    expect(screen.getByText(/Edicion de gasto/i)).toBeInTheDocument();
    expect(screen.getByText(/Baja de gasto/i)).toBeInTheDocument();
    expect(screen.getByText(/Restauracion de gasto/i)).toBeInTheDocument();
  });

  it("shows configuration for roles and operational settings", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Configuracion/i }));

    expect(screen.getByRole("heading", { name: "Roles y permisos" })).toBeInTheDocument();
    expect(screen.getAllByText("Cajero").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Operativa" }));
    expect(screen.getByText("Configuracion operativa")).toBeInTheDocument();
    expect(screen.getByText("Perfil del negocio")).toBeInTheDocument();
  });

  it("can import products and edit a variant", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Stock/i }));

    await user.click(screen.getByRole("button", { name: "Importar" }));
    await user.type(screen.getByLabelText("Productos"), "Agenda floral;Libreria;Casa Aroma;AGE-FLO-001;3500;1500;6");
    await user.click(screen.getByRole("button", { name: /Importar productos/i }));
    expect(screen.getByText("Agenda floral")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Variantes" }));
    await user.clear(screen.getByLabelText("SKU"));
    await user.type(screen.getByLabelText("SKU"), "MAT-EDIT-001");
    await user.click(screen.getByRole("button", { name: /Guardar variante/i }));
    expect(screen.getByDisplayValue("MAT-EDIT-001")).toBeInTheDocument();
  });

  it("shows reports and lets configuration manage categories", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Reportes/i }));
    expect(screen.getByText("Reportes por periodo")).toBeInTheDocument();
    expect(screen.getByText("Productos mas vendidos")).toBeInTheDocument();
    expect(screen.getByText("Compras por proveedor")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Configuracion/i }));
    await user.click(screen.getByRole("button", { name: "Categorias" }));
    await user.type(screen.getByLabelText("Nueva categoria"), "Temporada");
    await user.click(screen.getByRole("button", { name: /Agregar categoria/i }));
    expect(screen.getByText("Temporada")).toBeInTheDocument();
  });

  it("can use the AI assistant for purchase preload", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Compras/i }));
    await user.click(screen.getByRole("button", { name: "Precarga" }));
    await user.type(screen.getByLabelText("Pedido esperado"), "Pedido MAT-PREM-NEG 2 unidades");
    await user.type(screen.getByLabelText("Recibido / comprobante"), "Llegaron MAT-PREM-NEG 2 unidades");
    await user.click(screen.getByRole("button", { name: /Analizar con IA/i }));
    expect(screen.getByText(/linea\(s\) detectada\(s\)/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Aplicar precarga/i }));
    expect(screen.getByText("Factura o remito de compra")).toBeInTheDocument();
    expect(screen.getAllByText(/MAT-PREM-NEG/i).length).toBeGreaterThan(0);

  });
});
