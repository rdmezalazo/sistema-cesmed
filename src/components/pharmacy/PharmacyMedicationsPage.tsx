import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PharmacyMedicationsList } from "./PharmacyMedicationsList";
import { PharmacyMedicationsMovementsTab } from "./PharmacyMedicationsMovementsTab";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export function PharmacyMedicationsPage() {
  const { canViewPharmacyMovements } = useUserPermissions();
  const showMovements = canViewPharmacyMovements();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-green-700">
          Gestión de Productos
        </h2>
        <p className="text-muted-foreground">
          Administra el catálogo completo de productos
        </p>
      </div>

      <Tabs defaultValue="productos" className="w-full">
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          {showMovements && (
            <TabsTrigger value="movimientos">Historial de Movimientos</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="productos" className="mt-4">
          <PharmacyMedicationsList />
        </TabsContent>
        {showMovements && (
          <TabsContent value="movimientos" className="mt-4">
            <PharmacyMedicationsMovementsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
