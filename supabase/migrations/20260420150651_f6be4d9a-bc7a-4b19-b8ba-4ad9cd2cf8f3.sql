-- Agregar campos de archivado a pharmacy_entries
ALTER TABLE public.pharmacy_entries 
ADD COLUMN IF NOT EXISTS archivado BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_archivo TIMESTAMP WITH TIME ZONE;

-- Archivar todas las entradas existentes con la fecha actual
UPDATE public.pharmacy_entries
SET archivado = true,
    fecha_archivo = now()
WHERE archivado = false;

-- Crear índice para mejorar consultas que filtran entradas activas
CREATE INDEX IF NOT EXISTS idx_pharmacy_entries_archivado 
ON public.pharmacy_entries(archivado) 
WHERE archivado = false;