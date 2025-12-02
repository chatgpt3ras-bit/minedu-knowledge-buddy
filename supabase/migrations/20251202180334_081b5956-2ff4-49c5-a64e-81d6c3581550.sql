-- Add new auto-tagging metadata columns to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS resumen_breve text,
ADD COLUMN IF NOT EXISTS nivel_confianza float;

-- Rename tema to tema_principal for clarity (if it doesn't already have data we care about)
-- We'll use the existing 'tema' column as tema_principal
COMMENT ON COLUMN public.documents.tema IS 'Tema principal del documento generado por IA';

-- Add index for nivel_confianza for filtering high-confidence tags
CREATE INDEX IF NOT EXISTS idx_documents_nivel_confianza ON public.documents(nivel_confianza);