-- Drop existing match_chunks function
DROP FUNCTION IF EXISTS public.match_chunks(vector, float, integer, uuid, uuid);

-- Create enhanced match_chunks function with filter support
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count integer DEFAULT 5,
  _user_id uuid DEFAULT NULL,
  user_id uuid DEFAULT NULL,
  filter_tipo text DEFAULT NULL,
  filter_proceso text DEFAULT NULL,
  filter_date_from date DEFAULT NULL,
  filter_date_to date DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  document_type text,
  content text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID from auth context
  current_user_id := COALESCE(_user_id, user_id, auth.uid());
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    c.id AS chunk_id,
    d.id AS document_id,
    d.titulo AS document_title,
    d.tipo::text AS document_type,
    c.content,
    (1 - (e.vector <=> query_embedding))::float AS similarity
  FROM 
    public.embeddings e
    JOIN public.chunks c ON c.id = e.chunk_id
    JOIN public.documents d ON d.id = c.document_id
  WHERE 
    -- RLS: user owns document OR user is admin
    (d.created_by = current_user_id OR public.is_admin(current_user_id))
    -- Vector similarity filter
    AND (1 - (e.vector <=> query_embedding)) > match_threshold
    -- Optional document type filter
    AND (filter_tipo IS NULL OR d.tipo::text = filter_tipo)
    -- Optional process filter
    AND (filter_proceso IS NULL OR d.proceso::text = filter_proceso)
    -- Optional date range filters
    AND (filter_date_from IS NULL OR d.fecha_doc >= filter_date_from)
    AND (filter_date_to IS NULL OR d.fecha_doc <= filter_date_to)
  ORDER BY 
    e.vector <=> query_embedding
  LIMIT 
    match_count;
END;
$$;