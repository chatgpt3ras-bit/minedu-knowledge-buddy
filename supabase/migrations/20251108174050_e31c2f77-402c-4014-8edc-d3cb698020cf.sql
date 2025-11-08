-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for document storage
CREATE POLICY "Users can upload own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

CREATE POLICY "Admins can delete any document"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND rol = 'admin'
  )
);