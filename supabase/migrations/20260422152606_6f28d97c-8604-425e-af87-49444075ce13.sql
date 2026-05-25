DO $$
DECLARE
  med RECORD;
BEGIN
  FOR med IN
    SELECT id
    FROM public.pharmacy_medications
  LOOP
    PERFORM public.recalculate_medication_stock(med.id);
  END LOOP;
END;
$$;