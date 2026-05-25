CREATE INDEX IF NOT EXISTS idx_pharmacy_entries_active_medication_id
ON public.pharmacy_entries (medication_id)
WHERE COALESCE(archivado, false) = false;

CREATE OR REPLACE FUNCTION public.recalculate_medication_stock(p_medication_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_entrada INTEGER;
  v_total_salida INTEGER;
  v_stock_inicial INTEGER;
  v_stock_actual INTEGER;
BEGIN
  SELECT COALESCE(stock_inicial, 0)
  INTO v_stock_inicial
  FROM public.pharmacy_medications
  WHERE id = p_medication_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(quantity_received), 0)
  INTO v_total_entrada
  FROM public.pharmacy_entries
  WHERE medication_id = p_medication_id
    AND COALESCE(archivado, false) = false;

  SELECT COALESCE(SUM(quantity), 0)
  INTO v_total_salida
  FROM public.pharmacy_outputs
  WHERE medication_id = p_medication_id;

  v_stock_actual := v_stock_inicial + v_total_entrada - v_total_salida;

  UPDATE public.pharmacy_medications
  SET entrada = v_total_entrada,
      salida = v_total_salida,
      stock_actual = v_stock_actual,
      updated_at = NOW()
  WHERE id = p_medication_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_stock_on_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_medication_stock(OLD.medication_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.medication_id IS DISTINCT FROM NEW.medication_id THEN
    PERFORM public.recalculate_medication_stock(OLD.medication_id);
  END IF;

  PERFORM public.recalculate_medication_stock(NEW.medication_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_stock_on_output()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_medication_stock(OLD.medication_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.medication_id IS DISTINCT FROM NEW.medication_id THEN
    PERFORM public.recalculate_medication_stock(OLD.medication_id);
  END IF;

  PERFORM public.recalculate_medication_stock(NEW.medication_id);
  RETURN NEW;
END;
$$;