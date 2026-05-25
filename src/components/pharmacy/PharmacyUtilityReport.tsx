import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp, Search, FileText, Printer } from "lucide-react";
import { usePharmacyMedications } from "@/hooks/usePharmacyMedications";
import { calcUtility, round2 } from "@/lib/pharmacy/utilityCalculations";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { getLocalDateString } from "@/lib/utils";

const fmt = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type PeriodMode = "all" | "today" | "week" | "month" | "date" | "range";

export function PharmacyUtilityReport() {
  const { data: medications, isLoading } = usePharmacyMedications(0);
  const [search, setSearch] = useState("");
  const [onlyWithStock, setOnlyWithStock] = useState(true);
  const [period, setPeriod] = useState<PeriodMode>("all");
  const [singleDate, setSingleDate] = useState<string>(getLocalDateString());
  const [monthValue, setMonthValue] = useState<string>(format(new Date(), "yyyy-MM"));
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Computa rango [from, to] en YYYY-MM-DD para el filtro
  const dateRange = useMemo<{ from?: string; to?: string }>(() => {
    const today = new Date();
    switch (period) {
      case "today": {
        const t = getLocalDateString();
        return { from: t, to: t };
      }
      case "week": {
        return {
          from: getLocalDateString(startOfWeek(today, { weekStartsOn: 1 })),
          to: getLocalDateString(endOfWeek(today, { weekStartsOn: 1 })),
        };
      }
      case "month": {
        if (!monthValue) return {};
        const [y, m] = monthValue.split("-").map(Number);
        const d = new Date(y, m - 1, 1);
        return {
          from: getLocalDateString(startOfMonth(d)),
          to: getLocalDateString(endOfMonth(d)),
        };
      }
      case "date":
        return singleDate ? { from: singleDate, to: singleDate } : {};
      case "range":
        return { from: dateFrom || undefined, to: dateTo || undefined };
      default:
        return {};
    }
  }, [period, singleDate, monthValue, dateFrom, dateTo]);

  const rangeLabel = useMemo(() => {
    if (period === "all") return "Todos los productos";
    if (!dateRange.from && !dateRange.to) return "Sin filtro de fecha";
    if (dateRange.from === dateRange.to) return `Fecha: ${dateRange.from}`;
    return `Del ${dateRange.from ?? "—"} al ${dateRange.to ?? "—"}`;
  }, [period, dateRange]);

  const rows = useMemo(() => {
    if (!medications) return [];
    return medications
      .filter((m) => (onlyWithStock ? (m.stock_actual ?? 0) > 0 : true))
      .filter((m) => {
        // Filtro por fecha de creación del producto
        if (period === "all") return true;
        if (!m.created_at) return false;
        const created = m.created_at.slice(0, 10); // YYYY-MM-DD
        if (dateRange.from && created < dateRange.from) return false;
        if (dateRange.to && created > dateRange.to) return false;
        return true;
      })
      .filter((m) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          m.descripcion?.toLowerCase().includes(s) ||
          m.codigo?.toLowerCase().includes(s) ||
          m.nuevo_codigo?.toLowerCase().includes(s)
        );
      })
      .map((m) => ({
        med: m,
        calc: calcUtility({
          stock: m.stock_actual ?? 0,
          purchasePriceSinIgv: m.purchase_price ?? 0,
          precioVentaConIgv: m.precio_venta ?? 0,
        }),
      }))
      .sort((a, b) => a.med.descripcion.localeCompare(b.med.descripcion));
  }, [medications, search, onlyWithStock, period, dateRange]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        totalCompraSin: acc.totalCompraSin + r.calc.totalCostoCompraSinIgv,
        totalCompraCon: acc.totalCompraCon + r.calc.totalCostoCompraConIgv,
        totalVentaSin: acc.totalVentaSin + r.calc.totalCostoVentaSinIgv,
        totalVentaCon: acc.totalVentaCon + r.calc.totalCostoVentaConIgv,
        utilSin: acc.utilSin + r.calc.utilidadSinIgv,
        utilCon: acc.utilCon + r.calc.utilidadConIgv,
      }),
      { totalCompraSin: 0, totalCompraCon: 0, totalVentaSin: 0, totalVentaCon: 0, utilSin: 0, utilCon: 0 }
    );
  }, [rows]);

  const handleExport = () => {
    const headers = [
      "Descripción",
      "Stock Actual",
      "Precio Unit Compra Sin IGV",
      "Precio Unit Compra Con IGV",
      "Total Costo Compra Sin IGV",
      "Total Costo Compra Con IGV",
      "Precio Venta Sin IGV",
      "Precio Venta Con IGV",
      "Total Costo Venta Sin IGV",
      "Total Costo Venta Con IGV",
      "Utilidad Sin IGV",
      "Utilidad Con IGV",
    ];
    const data = [
      [`Reporte de Utilidad - ${rangeLabel}`],
      [],
      headers,
      ...rows.map((r) => [
        r.med.descripcion,
        r.calc.stock,
        round2(r.calc.precioUnitCompraSinIgv),
        round2(r.calc.precioUnitCompraConIgv),
        round2(r.calc.totalCostoCompraSinIgv),
        round2(r.calc.totalCostoCompraConIgv),
        round2(r.calc.precioVentaSinIgv),
        round2(r.calc.precioVentaConIgv),
        round2(r.calc.totalCostoVentaSinIgv),
        round2(r.calc.totalCostoVentaConIgv),
        round2(r.calc.utilidadSinIgv),
        round2(r.calc.utilidadConIgv),
      ]),
      [
        "TOTAL",
        "",
        "",
        "",
        round2(totals.totalCompraSin),
        round2(totals.totalCompraCon),
        "",
        "",
        round2(totals.totalVentaSin),
        round2(totals.totalVentaCon),
        round2(totals.utilSin),
        round2(totals.utilCon),
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte de Utilidad");
    XLSX.writeFile(wb, `Reporte_Utilidad_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
  };

  const buildPdf = (): jsPDF => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const PURPLE: [number, number, number] = [75, 0, 130];
    const GREEN: [number, number, number] = [76, 175, 80];

    doc.setFillColor(PURPLE[0], PURPLE[1], PURPLE[2]);
    doc.rect(0, 0, pageWidth, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CESMED", 10, 10);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema de Farmacia", 10, 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Reporte de Utilidad", pageWidth - 10, 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 10, 17, { align: "right" });

    doc.setFillColor(245, 245, 250);
    doc.rect(0, 22, pageWidth, 10, "F");
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.text(`Periodo: ${rangeLabel}`, 10, 28);
    doc.text(
      `Productos: ${rows.length}  |  ${onlyWithStock ? "Solo con stock" : "Todos"}${search ? `  |  Búsqueda: "${search}"` : ""}`,
      pageWidth - 10,
      28,
      { align: "right" }
    );

    const summaryY = 36;
    const cards: { label: string; value: string; color: [number, number, number] }[] = [
      { label: "Costo Compra (S/IGV)", value: fmt(totals.totalCompraSin), color: [254, 226, 226] },
      { label: "Costo Venta (S/IGV)", value: fmt(totals.totalVentaSin), color: [254, 243, 199] },
      { label: "Utilidad Sin IGV", value: fmt(totals.utilSin), color: [209, 250, 229] },
      { label: "Utilidad Con IGV", value: fmt(totals.utilCon), color: [209, 250, 229] },
    ];
    const cardW = (pageWidth - 20 - 9) / 4;
    cards.forEach((c, i) => {
      const x = 10 + i * (cardW + 3);
      doc.setFillColor(c.color[0], c.color[1], c.color[2]);
      doc.roundedRect(x, summaryY, cardW, 14, 1.5, 1.5, "F");
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(c.label, x + 3, summaryY + 5);
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(c.value, x + 3, summaryY + 11);
    });

    const head = [[
      "Descripción",
      "Stock",
      "P.U. Compra S/IGV",
      "P.U. Compra C/IGV",
      "Total Compra S/IGV",
      "Total Compra C/IGV",
      "P. Venta S/IGV",
      "P. Venta C/IGV",
      "Total Venta S/IGV",
      "Total Venta C/IGV",
      "Utilidad S/IGV",
      "Utilidad C/IGV",
    ]];
    const body = rows.map((r) => [
      `${r.med.descripcion}\n${r.med.nuevo_codigo || r.med.codigo || ""}`,
      String(r.calc.stock),
      fmt(r.calc.precioUnitCompraSinIgv),
      fmt(r.calc.precioUnitCompraConIgv),
      fmt(r.calc.totalCostoCompraSinIgv),
      fmt(r.calc.totalCostoCompraConIgv),
      fmt(r.calc.precioVentaSinIgv),
      fmt(r.calc.precioVentaConIgv),
      fmt(r.calc.totalCostoVentaSinIgv),
      fmt(r.calc.totalCostoVentaConIgv),
      fmt(r.calc.utilidadSinIgv),
      fmt(r.calc.utilidadConIgv),
    ]);
    const foot = [[
      "TOTAL",
      "",
      "",
      "",
      fmt(totals.totalCompraSin),
      fmt(totals.totalCompraCon),
      "",
      "",
      fmt(totals.totalVentaSin),
      fmt(totals.totalVentaCon),
      fmt(totals.utilSin),
      fmt(totals.utilCon),
    ]];

    autoTable(doc, {
      head,
      body,
      foot,
      startY: 54,
      margin: { left: 10, right: 10, bottom: 14 },
      styles: { fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak", lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: PURPLE, textColor: 255, fontStyle: "bold", fontSize: 7.5, halign: "center" },
      footStyles: { fillColor: [240, 240, 245], textColor: [20, 20, 20], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: 50, halign: "left" },
        1: { halign: "right", cellWidth: 14 },
        2: { halign: "right", fillColor: [254, 242, 242] },
        3: { halign: "right", fillColor: [254, 242, 242] },
        4: { halign: "right", fillColor: [254, 242, 242] },
        5: { halign: "right", fillColor: [254, 242, 242] },
        6: { halign: "right", fillColor: [255, 251, 235] },
        7: { halign: "right", fillColor: [255, 251, 235] },
        8: { halign: "right", fillColor: [255, 251, 235] },
        9: { halign: "right", fillColor: [255, 251, 235] },
        10: { halign: "right", fillColor: [236, 253, 245], fontStyle: "bold" },
        11: { halign: "right", fillColor: [236, 253, 245], fontStyle: "bold" },
      },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageNum = doc.getNumberOfPages();
        doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]);
        doc.setLineWidth(0.6);
        doc.line(10, pageHeight - 10, pageWidth - 10, pageHeight - 10);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text("CESMED — Reporte confidencial", 10, pageHeight - 5);
        doc.text(`Página ${pageNum}`, pageWidth - 10, pageHeight - 5, { align: "right" });
      },
    });
    return doc;
  };

  const handleExportPDF = () => {
    const doc = buildPdf();
    doc.save(`Reporte_Utilidad_${format(new Date(), "dd-MM-yyyy")}.pdf`);
  };

  const handlePrint = () => {
    const doc = buildPdf();
    doc.autoPrint();
    const blobUrl = doc.output("bloburl") as unknown as string;
    const w = window.open(blobUrl, "_blank");
    if (!w) window.location.href = blobUrl;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-700" />
              Reporte de Utilidad
            </CardTitle>
            <CardDescription>
              Cálculo de utilidad por producto basado en stock actual, precio de compra y precio de venta. IGV 18%.
              Filtra los productos por la fecha en que fueron registrados.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="border-purple-700 text-purple-700 hover:bg-purple-50">
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button onClick={handleExport} className="bg-green-700 hover:bg-green-800">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros de fecha */}
        <div className="grid gap-3 md:grid-cols-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Periodo</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Por mes</SelectItem>
                <SelectItem value="date">Fecha específica</SelectItem>
                <SelectItem value="range">Rango de fechas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "date" && (
            <div className="space-y-1">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
            </div>
          )}

          {period === "month" && (
            <div className="space-y-1">
              <Label className="text-xs">Mes</Label>
              <Input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
            </div>
          )}

          {period === "range" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </>
          )}

          <div className="md:col-span-1 text-xs text-muted-foreground">
            <span className="font-medium">Vista:</span> {rangeLabel}
            <div className="mt-1">
              <span className="font-medium">{rows.length}</span> producto(s)
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyWithStock}
              onChange={(e) => setOnlyWithStock(e.target.checked)}
            />
            Solo productos con stock
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SummaryCard label="Total Costo Compra Sin IGV" value={fmt(totals.totalCompraSin)} tone="rose" />
          <SummaryCard label="Total Costo Compra Con IGV" value={fmt(totals.totalCompraCon)} tone="rose" />
          <SummaryCard label="Total Costo Venta Sin IGV" value={fmt(totals.totalVentaSin)} tone="amber" />
          <SummaryCard label="Total Costo Venta Con IGV" value={fmt(totals.totalVentaCon)} tone="amber" />
          <SummaryCard label="Utilidad Sin IGV" value={fmt(totals.utilSin)} tone="emerald" />
          <SummaryCard label="Utilidad Con IGV" value={fmt(totals.utilCon)} tone="emerald" />
        </div>

        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[260px]">Descripción</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right bg-rose-50">P.U. Compra Sin IGV</TableHead>
                <TableHead className="text-right bg-rose-50">P.U. Compra Con IGV</TableHead>
                <TableHead className="text-right bg-rose-50">Total Compra Sin IGV</TableHead>
                <TableHead className="text-right bg-rose-50">Total Compra Con IGV</TableHead>
                <TableHead className="text-right bg-amber-50">P. Venta Sin IGV</TableHead>
                <TableHead className="text-right bg-amber-50">P. Venta Con IGV</TableHead>
                <TableHead className="text-right bg-amber-50">Total Venta Sin IGV</TableHead>
                <TableHead className="text-right bg-amber-50">Total Venta Con IGV</TableHead>
                <TableHead className="text-right bg-emerald-50">Utilidad Sin IGV</TableHead>
                <TableHead className="text-right bg-emerald-50">Utilidad Con IGV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-6">
                    Cargando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-6">
                    No hay productos para mostrar.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ med, calc }) => (
                <TableRow key={med.id}>
                  <TableCell>
                    <div className="font-medium">{med.descripcion}</div>
                    <div className="text-xs text-muted-foreground">
                      {med.nuevo_codigo || med.codigo}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{calc.stock}</TableCell>
                  <TableCell className="text-right bg-rose-50/40">{fmt(calc.precioUnitCompraSinIgv)}</TableCell>
                  <TableCell className="text-right bg-rose-50/40">{fmt(calc.precioUnitCompraConIgv)}</TableCell>
                  <TableCell className="text-right bg-rose-50/40">{fmt(calc.totalCostoCompraSinIgv)}</TableCell>
                  <TableCell className="text-right bg-rose-50/40">{fmt(calc.totalCostoCompraConIgv)}</TableCell>
                  <TableCell className="text-right bg-amber-50/40">{fmt(calc.precioVentaSinIgv)}</TableCell>
                  <TableCell className="text-right bg-amber-50/40">{fmt(calc.precioVentaConIgv)}</TableCell>
                  <TableCell className="text-right bg-amber-50/40">{fmt(calc.totalCostoVentaSinIgv)}</TableCell>
                  <TableCell className="text-right bg-amber-50/40">{fmt(calc.totalCostoVentaConIgv)}</TableCell>
                  <TableCell className="text-right bg-emerald-50/40 font-medium">{fmt(calc.utilidadSinIgv)}</TableCell>
                  <TableCell className="text-right bg-emerald-50/40 font-medium">{fmt(calc.utilidadConIgv)}</TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow className="bg-muted font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{fmt(totals.totalCompraSin)}</TableCell>
                  <TableCell className="text-right">{fmt(totals.totalCompraCon)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{fmt(totals.totalVentaSin)}</TableCell>
                  <TableCell className="text-right">{fmt(totals.totalVentaCon)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{fmt(totals.utilSin)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{fmt(totals.utilCon)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: "rose" | "amber" | "emerald" }) {
  const colors: Record<string, string> = {
    rose: "bg-rose-50 border-rose-200 text-rose-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
  };
  return (
    <div className={`rounded-md border p-3 ${colors[tone]}`}>
      <div className="text-xs">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
