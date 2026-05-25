ALTER TABLE public.pharmacy_medications
ADD COLUMN IF NOT EXISTS nuevo_codigo TEXT;

CREATE INDEX IF NOT EXISTS idx_pharmacy_medications_nuevo_codigo
  ON public.pharmacy_medications (nuevo_codigo);