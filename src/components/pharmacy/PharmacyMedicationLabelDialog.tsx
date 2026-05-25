import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { GeneralProductLabelCanvas } from "@/components/optics/catalogo-general/GeneralProductLabelCanvas";

interface PharmacyLabelMedication {
  nuevo_codigo?: string | null;
  descripcion?: string | null;
  precio_venta?: number | null;
  marca?: string | null;
  laboratorio?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nuevoCodigo?: string | null;
  descripcion?: string;
  medication?: PharmacyLabelMedication | null;
}

/**
 * Renderiza la etiqueta del producto de farmacia usando SIEMPRE los datos
 * del propio producto (pharmacy_medications). La plantilla del Catálogo
 * General se reutiliza solo por el diseño (placeholders {CODIGO}, {NOMBRE},
 * {PRECIO}, {MARCA}), pero los valores provienen de farmacia.
 */
export function PharmacyMedicationLabelDialog({
  open,
  onOpenChange,
  nuevoCodigo,
  descripcion,
  medication,
}: Props) {
  const codigo = (medication?.nuevo_codigo ?? nuevoCodigo ?? "").trim();
  const nombre = (medication?.descripcion ?? descripcion ?? "").trim();
  const precio = Number(medication?.precio_venta ?? 0) || 0;
  const marca = (medication?.marca ?? medication?.laboratorio ?? "").toString();

  // Producto sintético con datos reales de farmacia para el canvas de etiqueta
  const labelProduct = {
    codigo,
    nombre,
    precio_venta: precio,
    marca,
    modelo: "",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Etiqueta del Producto</DialogTitle>
          <DialogDescription>
            {nombre ? `${nombre} · ` : ""}
            {codigo || "Sin código asignado"}
          </DialogDescription>
        </DialogHeader>

        {!codigo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <AlertCircle className="h-4 w-4" />
            Este producto no tiene un código Cesmed (nuevo_codigo) asignado.
          </div>
        )}

        {codigo && (
          <GeneralProductLabelCanvas
            key={codigo}
            product={labelProduct}
            showPrintButton
            showQr={false}
            className="flex flex-col items-center"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
