import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, EyeOff, Info, Pencil, RefreshCw, Search, TrendingDown, TrendingUp, Wrench } from "lucide-react";
import { useInventoryMovements, useCreateInventoryMovement } from "@/hooks/usePharmacyInventory";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EditMedicationDialog } from "./EditMedicationDialog";

const OMITTED_STORAGE_KEY = "pharmacy_omitted_suspicious_movement_ids";

function loadOmitted(): Set<string> {
  try {
    const raw = localStorage.getItem(OMITTED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveOmitted(ids: Set<string>) {
  try {
    localStorage.setItem(OMITTED_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

// Suspicious movement detector (see previous comment)
function detectSuspicious(movements: any[]) {
  const byMed = new Map<string, any[]>();
  for (const m of movements) {
    const arr = byMed.get(m.medication_id) || [];
    arr.push(m);
    byMed.set(m.medication_id, arr);
  }
  const flagged = new Set<string>();
  for (const [, arr] of byMed) {
    const sorted = [...arr].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i];
      const prev = sorted[i - 1];
      if (
        cur.movement_reason === "Ajuste Manual" &&
        cur.movement_type === "Entrada" &&
        prev.movement_type === "Salida" &&
        (prev.movement_reason || "").toLowerCase().includes("salida") &&
        cur.previous_stock === prev.new_stock &&
        cur.quantity === prev.quantity &&
        new Date(cur.created_at).getTime() - new Date(prev.created_at).getTime() < 86400000
      ) {
        flagged.add(cur.id);
      }
    }
  }
  return flagged;
}

export function PharmacyMedicationsMovementsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [onlySuspicious, setOnlySuspicious] = useState(false);
  const [correctTarget, setCorrectTarget] = useState<any>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [editMedication, setEditMedication] = useState<any>(null);
  const [omittedIds, setOmittedIds] = useState<Set<string>>(() => loadOmitted());
  const { data: movements, isLoading } = useInventoryMovements();
  const createMovement = useCreateInventoryMovement();
  const queryClient = useQueryClient();

  const allSuspicious = useMemo(
    () => detectSuspicious(movements || []),
    [movements]
  );
  const suspiciousIds = useMemo(() => {
    const s = new Set(allSuspicious);
    omittedIds.forEach((id) => s.delete(id));
    return s;
  }, [allSuspicious, omittedIds]);

  useEffect(() => {
    saveOmitted(omittedIds);
  }, [omittedIds]);

  const filtered = (movements || []).filter((mov) => {
    const matchesSearch =
      !searchTerm ||
      mov.medication?.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.medication?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mov.medication as any)?.nuevo_codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.movement_reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.reference_document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mov as any).created_by_user?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mov as any).created_by_user?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || mov.movement_type === filterType;
    const matchesSuspicious = !onlySuspicious || suspiciousIds.has(mov.id);
    return matchesSearch && matchesType && matchesSuspicious;
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    queryClient.invalidateQueries({ queryKey: ["pharmacy-medications"] });
  };

  const closeCorrectDialog = () => {
    setCorrectTarget(null);
    setShowExplanation(false);
  };

  const handleOmit = () => {
    if (!correctTarget) return;
    setOmittedIds((prev) => {
      const next = new Set(prev);
      next.add(correctTarget.id);
      return next;
    });
    toast.success("Movimiento omitido del listado de sospechosos");
    closeCorrectDialog();
  };

  const handleOpenEdit = async () => {
    if (!correctTarget) return;
    // Fetch full medication record for the edit dialog
    try {
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase
        .from("pharmacy_medications")
        .select("*")
        .eq("id", correctTarget.medication_id)
        .single();
      if (error) throw error;
      setEditMedication(data);
      closeCorrectDialog();
    } catch (e: any) {
      toast.error("No se pudo cargar el producto: " + (e?.message || ""));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>Historial de Movimientos</CardTitle>
            <CardDescription>
              Seguimiento de entradas, salidas y ajustes. Los movimientos marcados en
              ámbar revierten una venta previa y probablemente son incorrectos.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {suspiciousIds.size} sospechosos
            </Badge>
            {omittedIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOmittedIds(new Set());
                  toast.success("Se restauraron los movimientos omitidos");
                }}
              >
                Restaurar omitidos ({omittedIds.size})
              </Button>
            )}
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-2">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto, código, motivo, documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Entrada">Entradas</SelectItem>
              <SelectItem value="Salida">Salidas</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={onlySuspicious ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlySuspicious((v) => !v)}
            className={onlySuspicious ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {onlySuspicious ? "Mostrar todos" : "Solo sospechosos"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron movimientos
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Stock Ant.</TableHead>
                  <TableHead className="text-right">Stock Nuevo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((mov) => {
                  const isSusp = suspiciousIds.has(mov.id);
                  return (
                    <TableRow
                      key={mov.id}
                      className={
                        isSusp
                          ? "bg-amber-50 hover:bg-amber-100/70 border-l-4 border-l-amber-500"
                          : ""
                      }
                    >
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(mov as any).created_by_user?.nombre ||
                          (mov as any).created_by_user?.email ||
                          <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            mov.movement_type === "Entrada"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {mov.movement_type === "Entrada" ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {mov.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{mov.medication?.descripcion || "-"}</div>
                        <code className="text-xs text-muted-foreground">
                          {(mov.medication as any)?.nuevo_codigo || mov.medication?.codigo}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          {mov.movement_reason}
                          {isSusp && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  Este ajuste manual revierte una venta previa por la
                                  misma cantidad. Probablemente el stock fue restablecido
                                  por error después de la salida.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={mov.movement_type === "Entrada" ? "text-green-600" : "text-red-600"}>
                          {mov.movement_type === "Entrada" ? "+" : "-"}{mov.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{mov.previous_stock}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{mov.new_stock}</TableCell>
                      <TableCell className="text-sm">{mov.reference_document || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                        {mov.observations || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSusp && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-400 text-amber-700 hover:bg-amber-100"
                            onClick={() => {
                              setCorrectTarget(mov);
                              setShowExplanation(false);
                            }}
                          >
                            <Wrench className="h-3.5 w-3.5 mr-1" />
                            Corregir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-4 text-sm text-muted-foreground">
          Total mostrados: {filtered.length} · Sospechosos detectados: {suspiciousIds.size}
          {omittedIds.size > 0 && ` · Omitidos: ${omittedIds.size}`}
        </div>
      </CardContent>

      <Dialog open={!!correctTarget} onOpenChange={(o) => !o && closeCorrectDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Movimiento sospechoso
            </DialogTitle>
            <DialogDescription>
              <strong>{correctTarget?.medication?.descripcion}</strong>
              {" · "}
              {correctTarget && format(new Date(correctTarget.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              {" · "}
              Cantidad: {correctTarget?.quantity}
            </DialogDescription>
          </DialogHeader>

          {showExplanation && correctTarget && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm space-y-2">
              <p className="font-semibold text-amber-900 flex items-center gap-1">
                <Info className="h-4 w-4" /> Análisis de la sospecha
              </p>
              <p className="text-amber-900">
                Se detectó una <strong>Entrada de tipo "Ajuste Manual"</strong> por{" "}
                <strong>{correctTarget.quantity}</strong> unidad(es) registrada
                inmediatamente después de una <strong>Salida por venta</strong> de la
                misma cantidad, con el mismo stock de referencia y dentro de las 24 horas.
              </p>
              <p className="text-amber-900">
                Esto suele ocurrir cuando un usuario edita el producto después de una
                venta y vuelve a guardar el stock al valor previo, lo que <strong>
                revierte la salida real</strong> y deja inventario inflado.
              </p>
              <ul className="list-disc pl-5 text-amber-900">
                <li>Stock previo del ajuste: <strong>{correctTarget.previous_stock}</strong></li>
                <li>Stock nuevo del ajuste: <strong>{correctTarget.new_stock}</strong></li>
                <li>Usuario: <strong>
                  {(correctTarget as any).created_by_user?.nombre ||
                    (correctTarget as any).created_by_user?.email || "—"}
                </strong></li>
              </ul>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setShowExplanation((v) => !v)}
            >
              <Info className="h-4 w-4 mr-2" />
              {showExplanation ? "Ocultar análisis" : "Explicar el análisis"}
            </Button>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleOmit}>
                <EyeOff className="h-4 w-4 mr-2" />
                Omitir corrección
              </Button>
              <Button onClick={handleOpenEdit} className="bg-primary">
                <Pencil className="h-4 w-4 mr-2" />
                Editar producto
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editMedication && (
        <EditMedicationDialog
          medication={editMedication}
          open={!!editMedication}
          onOpenChange={(o) => !o && setEditMedication(null)}
        />
      )}
    </Card>
  );
}
