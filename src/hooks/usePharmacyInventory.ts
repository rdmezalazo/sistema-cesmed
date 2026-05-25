
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface InventoryMovement {
  id: string;
  medication_id: string;
  movement_type: "Entrada" | "Salida";
  movement_reason: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_cost?: number;
  total_cost?: number;
  observations?: string;
  reference_document?: string;
  created_at: string;
  medication?: {
    descripcion: string;
    codigo: string;
    barcode?: string;
  };
}

export const useInventoryMovements = (medicationId?: string) => {
  return useQuery({
    queryKey: ["inventory-movements", medicationId],
    queryFn: async () => {
      let query = supabase
        .from("pharmacy_inventory_movements")
        .select(`
          *,
          medication:pharmacy_medications(descripcion, codigo, nuevo_codigo, barcode)
        `)
        .order("created_at", { ascending: false });

      if (medicationId) {
        query = query.eq("medication_id", medicationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with user info (created_by -> usuario.auth_user_id -> personal)
      const userIds = Array.from(
        new Set((data || []).map((m: any) => m.created_by).filter(Boolean))
      );
      let userMap = new Map<string, { email?: string; nombre?: string }>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("usuario")
          .select("auth_user_id, email, personal:personal_id(nombres, apellidos)")
          .in("auth_user_id", userIds);
        (users || []).forEach((u: any) => {
          const p = u.personal;
          const nombre = p ? `${p.nombres || ""} ${p.apellidos || ""}`.trim() : "";
          userMap.set(u.auth_user_id, { email: u.email, nombre });
        });
      }

      return (data || []).map((m: any) => ({
        ...m,
        created_by_user: m.created_by ? userMap.get(m.created_by) || null : null,
      })) as InventoryMovement[];
    },
  });
};

export const useCreateInventoryMovement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (movement: Omit<InventoryMovement, "id" | "created_at" | "medication">) => {
      // Obtener el stock actual solo para registrar en el movimiento
      const { data: medication, error: medicationError } = await supabase
        .from("pharmacy_medications")
        .select("stock_actual")
        .eq("id", movement.medication_id)
        .single();

      if (medicationError) throw medicationError;

      const previousStock = medication.stock_actual;
      let newStock = previousStock;

      if (movement.movement_type === "Entrada") {
        newStock = previousStock + movement.quantity;
      } else {
        newStock = previousStock - movement.quantity;
      }

      // Crear el movimiento - los triggers actualizarán automáticamente el stock
      const { data, error } = await supabase
        .from("pharmacy_inventory_movements")
        .insert([{
          ...movement,
          previous_stock: previousStock,
          new_stock: newStock,
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-medications"] });
      toast({
        title: "Movimiento registrado",
        description: "El movimiento de inventario se ha registrado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo registrar el movimiento.",
        variant: "destructive",
      });
    },
  });
};
