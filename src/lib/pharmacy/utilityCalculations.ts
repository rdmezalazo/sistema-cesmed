/**
 * Cálculos de utilidad para farmacia.
 * IGV en Perú = 18%.
 *
 * Convención de campos en pharmacy_medications:
 *  - purchase_price        => Precio unitario de COMPRA SIN IGV
 *  - igv_unitario          => purchase_price * 0.18
 *  - importe_unitario      => purchase_price + igv_unitario  (COMPRA CON IGV)
 *  - precio_venta          => Precio unitario de VENTA CON IGV (lo que paga el cliente)
 *
 * El precio de venta SIN IGV = precio_venta / 1.18
 */

export const IGV_RATE = 0.18;

export interface UtilityInput {
  stock: number;
  purchasePriceSinIgv: number; // purchase_price
  precioVentaConIgv: number; // precio_venta
}

export interface UtilityRow {
  stock: number;
  precioUnitCompraSinIgv: number;
  precioUnitCompraConIgv: number;
  totalCostoCompraSinIgv: number;
  totalCostoCompraConIgv: number;
  precioVentaSinIgv: number;
  precioVentaConIgv: number;
  totalCostoVentaSinIgv: number;
  totalCostoVentaConIgv: number;
  utilidadSinIgv: number;
  utilidadConIgv: number;
}

export function calcUtility(input: UtilityInput): UtilityRow {
  const stock = Number(input.stock) || 0;
  const compraSin = Number(input.purchasePriceSinIgv) || 0;
  const ventaCon = Number(input.precioVentaConIgv) || 0;

  const compraCon = compraSin * (1 + IGV_RATE);
  const ventaSin = ventaCon / (1 + IGV_RATE);

  const totalCompraSin = compraSin * stock;
  const totalCompraCon = compraCon * stock;
  const totalVentaSin = ventaSin * stock;
  const totalVentaCon = ventaCon * stock;

  return {
    stock,
    precioUnitCompraSinIgv: compraSin,
    precioUnitCompraConIgv: compraCon,
    totalCostoCompraSinIgv: totalCompraSin,
    totalCostoCompraConIgv: totalCompraCon,
    precioVentaSinIgv: ventaSin,
    precioVentaConIgv: ventaCon,
    totalCostoVentaSinIgv: totalVentaSin,
    totalCostoVentaConIgv: totalVentaCon,
    utilidadSinIgv: totalVentaSin - totalCompraSin,
    utilidadConIgv: totalVentaCon - totalCompraCon,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
