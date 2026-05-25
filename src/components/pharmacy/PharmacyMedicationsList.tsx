
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Plus, Search, Trash2, Gift, EyeOff } from "lucide-react";
import { usePharmacyMedications, useDeleteMedication, usePermanentDeleteMedication } from "@/hooks/usePharmacyMedications";
import { EditMedicationDialog } from "./EditMedicationDialog";
import { NewMedicationDialog } from "./NewMedicationDialog";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PharmacyMedicationsListProps {
  initialFilter?: "all" | "low_stock" | "near_expiry";
}

export function PharmacyMedicationsList({ initialFilter = "all" }: PharmacyMedicationsListProps) {
  const [inputValue, setInputValue] = useState("");
  const [filterType, setFilterType] = useState<"all" | "low_stock" | "near_expiry">(initialFilter);
  const [onlyBonificaciones, setOnlyBonificaciones] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const debouncedSearchTerm = useDebounce(inputValue, 400);
  const { toast } = useToast();

  const { data: medications, isLoading } = usePharmacyMedications(
    0,
    debouncedSearchTerm,
    showInactive ? "Inactivo" : "Activo"
  );
  const deleteMutation = useDeleteMedication();
  const permanentDeleteMutation = usePermanentDeleteMedication();
  const { canEditPharmacyProducts } = useUserPermissions();
  const canEdit = canEditPharmacyProducts();

  const getFilteredMedications = () => {
    if (!medications) return [];
    let filtered = medications;

    if (filterType === "low_stock") {
      filtered = filtered.filter(med => med.stock_actual <= (med.min_stock_level || 10));
    } else if (filterType === "near_expiry") {
      const now = new Date();
      filtered = filtered.filter(med => {
        if (!med.fecha_vencimiento) return false;
        const expiryDate = new Date(`${med.fecha_vencimiento}T12:00:00`);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= (med.days_before_expiry_alert || 30) && daysUntilExpiry > 0;
      });
    }

    if (onlyBonificaciones) {
      filtered = filtered.filter(med => med.bonificaciones === true);
    }

    return filtered;
  };

  const filteredMedications = getFilteredMedications();

  // Reset selection when toggling inactive view
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [showInactive, debouncedSearchTerm, filterType, onlyBonificaciones]);

  const allVisibleSelected =
    filteredMedications.length > 0 &&
    filteredMedications.every((m) => selectedIds.has(m.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedications.map((m) => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (id: string) => setDeleteId(id);

  const confirmSoftDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const confirmPermanentDelete = () => {
    if (deleteId) {
      permanentDeleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const confirmBulkPermanentDelete = async () => {
    const ids = Array.from(selectedIds);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await permanentDeleteMutation.mutateAsync(id);
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    toast({
      title: "Eliminación masiva completada",
      description: `${ok} eliminados${fail ? `, ${fail} con error` : ""}.`,
      variant: fail ? "destructive" : "default",
    });
  };

  const handleEditMedication = (medication) => {
    if (!canEdit) return;
    setSelectedMedication(medication);
    setShowEditDialog(true);
  };

  const getStockStatus = (stock, minStock) => {
    if (stock <= 0) return { color: "destructive" as const, text: "Sin Stock" };
    if (stock <= minStock) return { color: "secondary" as const, text: "Stock Bajo" };
    return { color: "default" as const, text: "Disponible" };
  };

  const getExpiryStatus = (expiryDate, alertDays) => {
    const today = new Date();
    const expiry = new Date(expiryDate + 'T00:00:00');
    const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToExpiry <= 0) return { color: "destructive" as const, text: "Vencido" };
    if (daysToExpiry <= alertDays) return { color: "secondary" as const, text: `${daysToExpiry} días` };

    const [year, month] = expiryDate.split('-');
    return { color: "default" as const, text: `${month}/${year}` };
  };

  if (isLoading) {
    return <div>Cargando productos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {showInactive ? "Productos Inactivos" : "Gestión de Productos"}
              <Badge variant={showInactive ? "destructive" : "secondary"} className="text-base">
                {filteredMedications.length} productos
              </Badge>
              {selectedIds.size > 0 && (
                <Badge variant="outline" className="text-base">
                  {selectedIds.size} seleccionados
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {showInactive
                ? "Productos marcados como inactivos. Puede seleccionarlos y eliminarlos definitivamente."
                : "Lista completa de productos registrados en el sistema"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {showInactive && selectedIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={permanentDeleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar definitivamente ({selectedIds.size})
              </Button>
            )}
            {!showInactive && (
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            )}
          </div>
        </div>

        {!showInactive && (
          <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="low_stock">Stock Bajo</TabsTrigger>
              <TabsTrigger value="near_expiry">Por Vencer</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, principio activo o código..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30">
              <Gift className="h-4 w-4 text-purple-600" />
              <Label htmlFor="only-bonificaciones-prod" className="text-sm cursor-pointer">
                Solo Bonificaciones
              </Label>
              <Switch
                id="only-bonificaciones-prod"
                checked={onlyBonificaciones}
                onCheckedChange={setOnlyBonificaciones}
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30">
              <EyeOff className="h-4 w-4 text-destructive" />
              <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
                Mostrar Inactivos
              </Label>
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border relative max-h-[600px] overflow-auto">
          <Table className="relative border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-sm border-b">
              <TableRow className="hover:bg-transparent">
                {showInactive && (
                  <TableHead className="bg-card w-10">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                )}
                <TableHead className="bg-card">Codigo Cesmed</TableHead>
                <TableHead className="bg-card">Código</TableHead>
                <TableHead className="bg-card">Descripción</TableHead>
                <TableHead className="bg-card">Forma Farmacéutica</TableHead>
                <TableHead className="bg-card">Laboratorio</TableHead>
                <TableHead className="bg-card">Lote</TableHead>
                <TableHead className="bg-card">Fecha Vencimiento</TableHead>
                <TableHead className="bg-card">Presentación</TableHead>
                <TableHead className="bg-card">Stock Inicial</TableHead>
                <TableHead className="bg-card">Entrada</TableHead>
                <TableHead className="bg-card">Salida</TableHead>
                <TableHead className="bg-card">Stock Actual</TableHead>
                <TableHead className="bg-card">Precio Venta</TableHead>
                <TableHead className="bg-card">Comentarios</TableHead>
                <TableHead className="bg-card">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedications.map((medication) => {
                const stockStatus = getStockStatus(medication.stock_actual, medication.min_stock_level);
                const expiryStatus = medication.fecha_vencimiento
                  ? getExpiryStatus(medication.fecha_vencimiento, medication.days_before_expiry_alert)
                  : { color: "default" as const, text: "No especificado" };
                const isSelected = selectedIds.has(medication.id);

                return (
                  <TableRow key={medication.id} data-state={isSelected ? "selected" : undefined}>
                    {showInactive && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(medication.id)}
                          aria-label={`Seleccionar ${medication.descripcion}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {showInactive ? (
                        <code className="bg-destructive/10 text-destructive px-2 py-1 rounded text-xs">
                          INACTIVO
                        </code>
                      ) : (
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {medication.nuevo_codigo || "-"}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {medication.codigo || "N/A"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{medication.descripcion}</div>
                    </TableCell>
                    <TableCell>{medication.forma_farmaceutica || "N/A"}</TableCell>
                    <TableCell>{medication.laboratorio || "N/A"}</TableCell>
                    <TableCell>{medication.lote || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={expiryStatus.color}>{expiryStatus.text}</Badge>
                    </TableCell>
                    <TableCell>{medication.presentation || "N/A"}</TableCell>
                    <TableCell>{medication.stock_inicial}</TableCell>
                    <TableCell>{medication.entrada}</TableCell>
                    <TableCell>{medication.salida}</TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.color}>{medication.stock_actual}</Badge>
                    </TableCell>
                    <TableCell>
                      {medication.precio_venta ? `S/ ${medication.precio_venta}` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {medication.comentarios || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!showInactive && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditMedication(medication)}
                                    disabled={!canEdit}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!canEdit && (
                                <TooltipContent>
                                  No tienes permiso para editar productos. Solicítalo al administrador.
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(medication.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredMedications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showInactive ? 16 : 15} className="text-center text-muted-foreground py-8">
                    {showInactive ? "No hay productos inactivos." : "No hay productos para mostrar."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <NewMedicationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
      />

      <EditMedicationDialog
        medication={selectedMedication}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cómo desea eliminar el producto?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                <strong className="text-foreground">Marcar como inactivo:</strong>
                <p className="text-sm">El producto no se mostrará en el inventario pero se mantendrá en el sistema para consultas históricas.</p>
              </div>
              <div>
                <strong className="text-foreground">Eliminar permanentemente:</strong>
                <p className="text-sm text-destructive">Esta acción eliminará el producto de forma permanente del sistema. Esta acción no se puede deshacer.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              onClick={confirmSoftDelete}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Marcar como inactivo
            </Button>
            <AlertDialogAction onClick={confirmPermanentDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selectedIds.size} producto(s) definitivamente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente los productos seleccionados del sistema y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkPermanentDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
