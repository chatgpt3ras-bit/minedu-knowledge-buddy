-- Add auto-tagging metadata columns to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS tema text,
ADD COLUMN IF NOT EXISTS subtema text,
ADD COLUMN IF NOT EXISTS area_responsable text,
ADD COLUMN IF NOT EXISTS palabras_clave text[],
ADD COLUMN IF NOT EXISTS proceso_asociado text,
ADD COLUMN IF NOT EXISTS auto_tagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_tagged_at timestamp with time zone;

-- Add index for searching by tags
CREATE INDEX IF NOT EXISTS idx_documents_palabras_clave ON public.documents USING GIN(palabras_clave);
CREATE INDEX IF NOT EXISTS idx_documents_tema ON public.documents(tema);
CREATE INDEX IF NOT EXISTS idx_documents_auto_tagged ON public.documents(auto_tagged);