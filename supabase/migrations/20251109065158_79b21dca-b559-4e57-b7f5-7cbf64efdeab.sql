-- Fix column name in calculate_daily_kpis function
CREATE OR REPLACE FUNCTION public.calculate_daily_kpis(target_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_avg_latency INT;
  v_precision NUMERIC(3,2);
  v_reuse_rate NUMERIC(3,2);
  v_docs_nuevos INT;
  v_consultas INT;
BEGIN
  -- Calculate metrics for target date
  SELECT 
    COALESCE(AVG(latency_ms)::INT, 0),
    COALESCE(AVG(precision_at_k), 0),
    COALESCE(
      (COUNT(*) FILTER (WHERE array_length(clicked_source_ids, 1) > 0)::NUMERIC / 
       NULLIF(COUNT(*), 0)) * 100, 
      0
    ),
    COUNT(*)
  INTO v_avg_latency, v_precision, v_reuse_rate, v_consultas
  FROM public.queries
  WHERE DATE(created_at) = target_date;

  -- Count new documents
  SELECT COUNT(*)
  INTO v_docs_nuevos
  FROM public.documents
  WHERE DATE(created_at) = target_date;

  -- Insert or update KPIs with correct column name
  INSERT INTO public.kpis_daily (
    fecha, avg_latency_ms, precision_at_k_avg, 
    reuse_rate, docs_nuevos, consultas
  )
  VALUES (
    target_date, v_avg_latency, v_precision, 
    v_reuse_rate, v_docs_nuevos, v_consultas
  )
  ON CONFLICT (fecha) DO UPDATE SET
    avg_latency_ms = EXCLUDED.avg_latency_ms,
    precision_at_k_avg = EXCLUDED.precision_at_k_avg,
    reuse_rate = EXCLUDED.reuse_rate,
    docs_nuevos = EXCLUDED.docs_nuevos,
    consultas = EXCLUDED.consultas;
END;
$function$;