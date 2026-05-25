import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface PharmacyOutputPaginated {
  id: string;
  date: string;
  medication_id?: string;
  product_code?: string;
  description?: string;
  quantity: number;
  sale_cost_per_unit?: number;
  total?: number;
  comments?: string;
  created_at: string;
  tipo_salida?: string;
  nro_comprobante?: string;
  patient_id?: string;
  supplier_id?: string;
  motivo_ajuste?: string;
  medications?: Json;
  medication?: {
    descripcion: string;
    codigo: string;
    nuevo_codigo?: string | null;
    laboratorio?: string;
  };
  patient?: {
    first_name: string;
    last_name: string;
    dni: string;
  };
  supplier?: {
    name: string;
  };
}

export type FilterType = "all" | "today" | "date" | "month" | "year";

interface PaginatedOutputsParams {
  page: number;
  pageSize: number;
  filterType?: FilterType;
  filterValue?: string;
  searchTerm?: string;
}

interface PaginatedResult {
  data: PharmacyOutputPaginated[];
  totalCount: number;
  totalPages: number;
}

// Get local date string in YYYY-MM-DD format
const getLocalDateString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// Build date filter conditions
const getDateRange = (filterType: FilterType, filterValue?: string): { start: string; end: string } | null => {
  if (filterType === "all") {
    return null;
  }
  
  if (filterType === "today") {
    const localDate = getLocalDateString();
    return { start: localDate, end: localDate };
  }
  
  if (filterType === "date" && filterValue) {
    // Check for range (week filter uses pipe separator)
    if (filterValue.includes("|")) {
      const [start, end] = filterValue.split("|");
      return { start, end };
    }
    return { start: filterValue, end: filterValue };
  }
  
  if (filterType === "month" && filterValue) {
    const [year, month] = filterValue.split("-");
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    };
  }
  
  if (filterType === "year" && filterValue) {
    return {
      start: `${filterValue}-01-01`,
      end: `${filterValue}-12-31`
    };
  }
  
  return null;
};

const getOutputsCount = async (
  filterType: FilterType = "all",
  filterValue?: string,
  searchTerm?: string
): Promise<number> => {
  // When searching, we need to include nuevo_codigo (on joined medication),
  // so fetch matching candidates and filter client-side.
  if (searchTerm && searchTerm.length >= 2) {
    const term = searchTerm.toLowerCase();
    let query: any = (supabase as any)
      .from("pharmacy_outputs")
      .select(`
        id,
        description,
        product_code,
        tipo_salida,
        nro_comprobante,
        medication:pharmacy_medications(nuevo_codigo)
      `)
      .eq("archivado", false);

    const dateRange = getDateRange(filterType, filterValue);
    if (dateRange) {
      query = query.gte("date", dateRange.start).lte("date", dateRange.end);
    }

    query = query.or(
      `description.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%,tipo_salida.ilike.%${searchTerm}%,nro_comprobante.ilike.%${searchTerm}%`
    );

    const { data, error } = await query;
    if (error) throw error;

    // Also include rows whose nuevo_codigo matches (need separate query since OR
    // with joined column isn't supported the same way).
    const { data: byNuevoCodigo, error: err2 } = await (supabase as any)
      .from("pharmacy_outputs")
      .select(`id, medication:pharmacy_medications!inner(nuevo_codigo)`)
      .eq("archivado", false)
      .ilike("medication.nuevo_codigo", `%${searchTerm}%`)
      .gte("date", dateRange?.start ?? "1900-01-01")
      .lte("date", dateRange?.end ?? "2999-12-31");
    if (err2) throw err2;

    const ids = new Set<string>();
    (data || []).forEach((r: any) => ids.add(r.id));
    (byNuevoCodigo || []).forEach((r: any) => ids.add(r.id));
    return ids.size;
  }

  let query: any = (supabase as any)
    .from("pharmacy_outputs")
    .select("*", { count: "exact", head: true })
    .eq("archivado", false);

  const dateRange = getDateRange(filterType, filterValue);
  if (dateRange) {
    query = query.gte("date", dateRange.start).lte("date", dateRange.end);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

const getOutputsPage = async (
  page: number,
  pageSize: number,
  filterType: FilterType = "all",
  filterValue?: string,
  searchTerm?: string
): Promise<PharmacyOutputPaginated[]> => {
  // When searching, include nuevo_codigo in the criteria via client-side filter.
  if (searchTerm && searchTerm.length >= 2) {
    const term = searchTerm.toLowerCase();
    let query: any = (supabase as any)
      .from("pharmacy_outputs")
      .select(`
        *,
        medication:pharmacy_medications(descripcion, codigo, nuevo_codigo, laboratorio),
        patient:patients(first_name, last_name, dni),
        supplier:pharmacy_suppliers(name)
      `)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .eq("archivado", false);

    const dateRange = getDateRange(filterType, filterValue);
    if (dateRange) {
      query = query.gte("date", dateRange.start).lte("date", dateRange.end);
    }

    const { data, error } = await query;
    if (error) throw error;

    const filtered = (data || []).filter((row: any) => {
      const nuevoCodigo = row.medication?.nuevo_codigo?.toLowerCase() || "";
      return (
        row.description?.toLowerCase().includes(term) ||
        row.product_code?.toLowerCase().includes(term) ||
        row.tipo_salida?.toLowerCase().includes(term) ||
        row.nro_comprobante?.toLowerCase().includes(term) ||
        nuevoCodigo.includes(term)
      );
    });

    const from = (page - 1) * pageSize;
    return filtered.slice(from, from + pageSize) as PharmacyOutputPaginated[];
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query: any = (supabase as any)
    .from("pharmacy_outputs")
    .select(`
      *,
      medication:pharmacy_medications(descripcion, codigo, nuevo_codigo, laboratorio),
      patient:patients(first_name, last_name, dni),
      supplier:pharmacy_suppliers(name)
    `)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to)
    .eq("archivado", false);

  const dateRange = getDateRange(filterType, filterValue);
  if (dateRange) {
    query = query.gte("date", dateRange.start).lte("date", dateRange.end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as PharmacyOutputPaginated[];
};

export const usePharmacyOutputsPaginated = ({
  page,
  pageSize,
  filterType = "all",
  filterValue,
  searchTerm
}: PaginatedOutputsParams) => {
  return useQuery({
    queryKey: ["pharmacy-outputs-paginated", page, pageSize, filterType, filterValue, searchTerm],
    queryFn: async (): Promise<PaginatedResult> => {
      const [totalCount, data] = await Promise.all([
        getOutputsCount(filterType, filterValue, searchTerm),
        getOutputsPage(page, pageSize, filterType, filterValue, searchTerm)
      ]);

      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      return {
        data,
        totalCount,
        totalPages
      };
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
};
