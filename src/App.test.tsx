import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { resetStore } from "./store";

describe("Regaleria app", () => {
  beforeEach(() => {
    resetStore();
  });

  it("shows the dashboard and operational metrics", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByText("Ventas del periodo")).toBeInTheDocument();
    expect(screen.getByText("Decisiones sugeridas")).toBeInTheDocument();
  });

  it("requires an open shift before creating a quick sale", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Ventas/i }));
    expect(screen.getByRole("button", { name: /Cobrar/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Turnos" }));
    await user.clear(screen.getByLabelText("Efectivo inicial"));
    await user.type(screen.getByLabelText("Efectivo inicial"), "10000");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));

    await user.click(screen.getByRole("button", { name: /Cobrar/i }));
    expect(screen.getByText("CI-000003")).toBeInTheDocument();
    expect(screen.getByText(/Consumidor final/i)).toBeInTheDocument();
    expect(screen.getByText(/Sincronizando/i)).toBeInTheDocument();
    expect(await screen.findByText(/Todo actualizado/i)).toBeInTheDocument();
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

  it("can add a product and register a stock movement", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Stock/i }));
    await user.click(screen.getByRole("button", { name: /Alta de producto/i }));

    await user.type(screen.getByLabelText("Producto"), "Llavero inicial");
    await user.type(screen.getAllByLabelText("SKU")[0], "LLA-INI-001");
    await user.clear(screen.getAllByLabelText("Precio")[0]);
    await user.type(screen.getAllByLabelText("Precio")[0], "2500");
    await user.click(screen.getByRole("button", { name: /Crear producto/i }));

    expect(screen.getByText("Llavero inicial")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Movimiento" }));
    await user.type(screen.getByLabelText("Motivo"), "Conteo de prueba");
    await user.click(screen.getByRole("button", { name: /Registrar movimiento/i }));
    expect(screen.getByText(/Conteo de prueba/i)).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: /Agregar/i }));
    expect((await screen.findAllByText(/MAT-PREM-NEG/i)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Cerrar venta/i }));

    expect((await screen.findAllByText(/Rocio mostrador/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sincronizando/i)).toBeInTheDocument();
  });

  it("can close a shift with the current shift sales detail", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Ventas/i }));
    await user.click(screen.getByRole("button", { name: "Turnos" }));
    await user.clear(screen.getByLabelText("Efectivo inicial"));
    await user.type(screen.getByLabelText("Efectivo inicial"), "10000");
    await user.click(screen.getByRole("button", { name: "Abrir turno" }));

    await user.click(screen.getByRole("button", { name: "Mostrador" }));
    await user.click(screen.getByRole("button", { name: /Cobrar/i }));
    await user.click(screen.getByRole("button", { name: "Turnos" }));
    expect(screen.getByText(/Efectivo esperado/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Cerrar turno/i }));

    expect(screen.getByText(/Ventas del turno TURNO-000001/i)).toBeInTheDocument();
    expect(screen.getByText(/CI-000003/i)).toBeInTheDocument();
    expect(screen.getByText(/Esperado en efectivo/i)).toBeInTheDocument();
  });

  it("can create a quote without closing a sale", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Presupuestos/i }));

    await user.selectOptions(screen.getByLabelText("Cliente"), "nuevo");
    await user.type(screen.getByLabelText("Nuevo cliente"), "Mayorista Sur");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));
    expect(await screen.findByText(/MAT-PREM-NEG/i)).toBeInTheDocument();
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
    await user.clear(screen.getByLabelText("Costo"));
    await user.type(screen.getByLabelText("Costo"), "11500");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));
    await user.click(screen.getByRole("button", { name: /Registrar compra/i }));

    expect(await screen.findByText(/COM-000001/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mayorista regalos/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Stock/i }));
    await user.click(screen.getByRole("button", { name: "Historial" }));
    expect(screen.getByText(/COM-000001/i)).toBeInTheDocument();
  });

  it("can create and edit customers and suppliers", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Clientes/i }));
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre"), "Cliente Mostrador");
    await user.type(screen.getByLabelText("Telefono"), "3511234567");
    await user.click(screen.getByRole("button", { name: /Crear cliente/i }));
    expect(screen.getByText(/Cliente Mostrador/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Proveedores/i }));
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    await user.type(screen.getByLabelText("Nombre"), "Proveedor Nuevo");
    await user.type(screen.getByLabelText("Email"), "proveedor@example.com");
    await user.click(screen.getByRole("button", { name: /Crear proveedor/i }));
    expect(screen.getByText(/Proveedor Nuevo/i)).toBeInTheDocument();
  });

  it("can edit catalog product details", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Catalogo/i }));

    expect(screen.getByRole("button", { name: /Cuadricula/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lista/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Producto")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Editar/i })[0]);
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

  it("allows the owner to delete a product after confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    await user.click(screen.getAllByRole("button", { name: /Editar/i })[0]);

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
    await user.selectOptions(screen.getByLabelText("Rol activo"), "administrador");
    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    await user.click(screen.getAllByRole("button", { name: /Editar/i })[0]);
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();

    unmount();
    resetStore();
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Rol activo"), "encargado");
    await user.click(screen.getByRole("button", { name: /Catalogo/i }));
    await user.click(screen.getAllByRole("button", { name: /Editar/i })[0]);
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("shows a limited menu for the cashier role", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Rol activo"), "cajero");
    expect(screen.getByRole("button", { name: /Ventas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clientes/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Compras/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gastos/i })).not.toBeInTheDocument();
  });

  it("hides suppliers from the employee role", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText("Rol activo"), "encargado");
    expect(screen.queryByRole("button", { name: "Proveedores" })).not.toBeInTheDocument();
  });

  it("can add a new variant to an existing product", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Stock/i }));
    await user.click(screen.getByRole("button", { name: "Variante" }));
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
    await user.click(screen.getByRole("button", { name: /Sincronizar demo/i }));
    expect(screen.getByText("0 elemento(s) en cola.")).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Importacion" }));
    await user.type(screen.getByLabelText("Productos"), "Agenda floral;Libreria;Casa Aroma;AGE-FLO-001;3500;1500;6");
    await user.click(screen.getByRole("button", { name: /Importar productos/i }));
    expect(screen.getByText("Agenda floral")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Variante" }));
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
    expect(screen.getByText(/MAT-PREM-NEG/i)).toBeInTheDocument();

  });
});
