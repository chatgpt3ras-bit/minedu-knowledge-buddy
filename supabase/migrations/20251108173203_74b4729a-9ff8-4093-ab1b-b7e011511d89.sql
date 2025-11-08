-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create custom types
CREATE TYPE app_role AS ENUM ('admin', 'analista');
CREATE TYPE tipo_documento AS ENUM ('resolucion', 'oficio', 'manual', 'memorando', 'reporte');
CREATE TYPE tipo_proceso AS ENUM ('asignacion', 'evaluacion', 'capacitacion');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol app_role NOT NULL DEFAULT 'analista',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data, admins can read all
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo tipo_documento NOT NULL,
  proceso tipo_proceso NOT NULL,
  fecha_doc DATE NOT NULL,
  autor TEXT,
  ruta_storage TEXT NOT NULL,
  hash TEXT UNIQUE NOT NULL,
  extra_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Admins can view all documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

CREATE POLICY "Users can create own documents"
  ON public.documents FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can delete any document"
  ON public.documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Chunks table
CREATE TABLE public.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  token_count INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks of accessible documents"
  ON public.chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id 
      AND (d.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.rol = 'admin'
      ))
    )
  );

-- Embeddings table
CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES public.chunks(id) ON DELETE CASCADE,
  vector vector(1536) NOT NULL,
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chunk_id)
);

-- Create index for vector similarity search
CREATE INDEX embeddings_vector_idx ON public.embeddings 
USING ivfflat (vector vector_cosine_ops)
WITH (lists = 100);

ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view embeddings of accessible chunks"
  ON public.embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chunks c
      JOIN public.documents d ON d.id = c.document_id
      WHERE c.id = chunk_id 
      AND (d.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.rol = 'admin'
      ))
    )
  );

-- Queries table
CREATE TABLE public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pregunta TEXT NOT NULL,
  respuesta TEXT,
  latency_ms INT,
  top_k INT DEFAULT 5,
  precision_at_k NUMERIC(3,2),
  clicked_source_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queries"
  ON public.queries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all queries"
  ON public.queries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

CREATE POLICY "Users can create own queries"
  ON public.queries FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Query sources table
CREATE TABLE public.query_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES public.chunks(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  score NUMERIC(5,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.query_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sources of own queries"
  ON public.query_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.queries q
      WHERE q.id = query_id AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all sources"
  ON public.query_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- KPIs daily table
CREATE TABLE public.kpis_daily (
  fecha DATE PRIMARY KEY,
  avg_latency_ms INT NOT NULL DEFAULT 0,
  precision_at_k_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  reuse_rate NUMERIC(3,2) NOT NULL DEFAULT 0,
  docs_nuevos INT NOT NULL DEFAULT 0,
  consultas INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kpis_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analysts can view kpis"
  ON public.kpis_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage kpis"
  ON public.kpis_daily FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Taxonomias table
CREATE TABLE public.taxonomias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  valores TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.taxonomias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view taxonomias"
  ON public.taxonomias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage taxonomias"
  ON public.taxonomias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback of own queries"
  ON public.feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.queries q
      WHERE q.id = query_id AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.queries q
      WHERE q.id = query_id AND q.user_id = auth.uid()
    )
  );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'rol')::app_role, 'analista')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate daily KPIs
CREATE OR REPLACE FUNCTION public.calculate_daily_kpis(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Insert or update KPIs
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
$$;