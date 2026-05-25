-- Agregar campos de archivo a pharmacy_medications
ALTER TABLE public.pharmacy_medications
ADD COLUMN IF NOT EXISTS archivo_entrada NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS archivo_salida NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fecha_archivo TIMESTAMP WITH TIME ZONE;

-- Mover los valores actuales de entrada y salida a los campos de archivo
-- y resetear entrada y salida a 0. El stock_actual NO se modifica.
UPDATE public.pharmacy_medications
SET archivo_entrada = COALESCE(archivo_entrada, 0) + COALESCE(entrada, 0),
    archivo_salida = COALESCE(archivo_salida, 0) + COALESCE(salida, 0),
    entrada = 0,
    salida = 0,
    fecha_archivo = now()
WHERE COALESCE(entrada, 0) <> 0 OR COALESCE(salida, 0) <> 0;