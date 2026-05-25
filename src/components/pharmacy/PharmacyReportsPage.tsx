import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TrendingUp } from "lucide-react";
import { PharmacyReports } from "./PharmacyReports";
import { PharmacyUtilityReport } from "./PharmacyUtilityReport";

export function PharmacyReportsPage() {
  const [tab, setTab] = useState("general");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-green-700">
          Reportes y Análisis
        </h2>
        <p className="text-muted-foreground">
          Genera reportes detallados del sistema de farmacia
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reportes Generales
          </TabsTrigger>
          <TabsTrigger value="utilidad" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Reporte de Utilidad
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <PharmacyReports />
        </TabsContent>
        <TabsContent value="utilidad" className="mt-6">
          <PharmacyUtilityReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
