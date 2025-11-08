-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  document_type tipo_documento,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    d.id AS document_id,
    d.titulo AS document_title,
    d.tipo AS document_type,
    c.content,
    1 - (e.vector <=> query_embedding) AS similarity
  FROM embeddings e
  JOIN chunks c ON c.id = e.chunk_id
  JOIN documents d ON d.id = c.document_id
  WHERE 1 - (e.vector <=> query_embedding) > match_threshold
    AND (
      d.created_by = auth.uid() 
      OR public.is_admin(auth.uid())
    )
  ORDER BY e.vector <=> query_embedding
  LIMIT match_count;
END;
$$;