import { describe, it, expect } from "vitest";
import { calcUtility, round2, IGV_RATE } from "./utilityCalculations";

describe("calcUtility", () => {
  it("AKA-PRED row from reference image", () => {
    // Stock 20, compra sin IGV 25.81, venta sin IGV 50.85 -> venta con IGV ~60.00
    const r = calcUtility({ stock: 20, purchasePriceSinIgv: 25.81, precioVentaConIgv: 50.85 * (1 + IGV_RATE) });
    expect(round2(r.precioUnitCompraConIgv)).toBeCloseTo(30.46, 1);
    expect(round2(r.totalCostoCompraSinIgv)).toBeCloseTo(516.20, 2);
    expect(round2(r.totalCostoCompraConIgv)).toBeCloseTo(609.12, 1);
    expect(round2(r.precioVentaConIgv)).toBeCloseTo(60.00, 1);
    expect(round2(r.totalCostoVentaSinIgv)).toBeCloseTo(1017.00, 0);
    expect(round2(r.totalCostoVentaConIgv)).toBeCloseTo(1200.00, 0);
    expect(round2(r.utilidadSinIgv)).toBeCloseTo(500.75, 0);
    expect(round2(r.utilidadConIgv)).toBeCloseTo(590.88, 0);
  });

  it("returns zeros for zero stock", () => {
    const r = calcUtility({ stock: 0, purchasePriceSinIgv: 10, precioVentaConIgv: 20 });
    expect(r.totalCostoCompraSinIgv).toBe(0);
    expect(r.utilidadConIgv).toBe(0);
  });

  it("handles missing/invalid inputs as 0", () => {
    const r = calcUtility({ stock: NaN as any, purchasePriceSinIgv: NaN as any, precioVentaConIgv: NaN as any });
    expect(r.utilidadSinIgv).toBe(0);
  });

  it("IGV unit price math", () => {
    const r = calcUtility({ stock: 1, purchasePriceSinIgv: 100, precioVentaConIgv: 118 });
    expect(round2(r.precioUnitCompraConIgv)).toBe(118);
    expect(round2(r.precioVentaSinIgv)).toBe(100);
    expect(round2(r.utilidadSinIgv)).toBe(0);
    expect(round2(r.utilidadConIgv)).toBe(0);
  });

  it("utility scales linearly with stock", () => {
    const a = calcUtility({ stock: 1, purchasePriceSinIgv: 10, precioVentaConIgv: 23.6 });
    const b = calcUtility({ stock: 10, purchasePriceSinIgv: 10, precioVentaConIgv: 23.6 });
    expect(round2(b.utilidadSinIgv)).toBeCloseTo(round2(a.utilidadSinIgv * 10), 2);
  });
});
