-- Reactivar productos de farmacia inactivos que aún tienen stock o movimientos vigentes
UPDATE public.pharmacy_medications
SET status = 'Activo'
WHERE status = 'Inactivo'
  AND (
    stock_actual > 0
    OR id IN (SELECT DISTINCT medication_id FROM public.pharmacy_entries WHERE COALESCE(archivado, false) = false AND medication_id IS NOT NULL)
    OR id IN (SELECT DISTINCT medication_id FROM public.pharmacy_outputs WHERE COALESCE(archivado, false) = false AND medication_id IS NOT NULL)
  );