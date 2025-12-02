import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Loader2, Trash2, Sparkles } from 'lucide-react';
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import crypto from 'crypto-js';
import { AutoTaggingDialog } from '@/components/AutoTaggingDialog';
import { DocumentMetadataCard } from '@/components/DocumentMetadataCard';

interface DocumentMetadata {
  titulo: string;
  tipo: 'resolucion' | 'oficio' | 'manual' | 'memorando' | 'reporte';
  proceso: 'asignacion' | 'evaluacion' | 'capacitacion';
  fecha_doc: string;
  autor: string;
}

export default function Documentos() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    titulo: '',
    tipo: 'resolucion',
    proceso: 'asignacion',
    fecha_doc: new Date().toISOString().split('T')[0],
    autor: '',
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoTagDialogOpen, setAutoTagDialogOpen] = useState(false);
  const [autoTagLoading, setAutoTagLoading] = useState(false);
  const [generatedMetadata, setGeneratedMetadata] = useState<any>(null);
  const [selectedDocForTag, setSelectedDocForTag] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast.error('Error cargando documentos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    loadDocuments();
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo es muy grande. Máximo 10 MB.');
        return;
      }
      
      const validTypes = ['.pdf', '.docx', '.txt'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validTypes.includes(fileExt)) {
        toast.error('Tipo de archivo no permitido. Use PDF, DOCX o TXT.');
        return;
      }

      setSelectedFile(file);
      setMetadata(prev => ({ ...prev, titulo: file.name }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast.error('Seleccione un archivo y complete los metadatos');
      return;
    }

    if (!metadata.titulo || !metadata.autor) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    setUploading(true);

    try {
      // Calculate file hash
      const arrayBuffer = await selectedFile.arrayBuffer();
      const wordArray = crypto.lib.WordArray.create(arrayBuffer);
      const hash = crypto.SHA256(wordArray).toString();

      // Check for duplicates
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('hash', hash)
        .single();

      if (existing) {
        toast.error('Este documento ya existe en el sistema');
        setUploading(false);
        return;
      }

      // Upload file to storage
      const filePath = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          titulo: metadata.titulo,
          tipo: metadata.tipo,
          proceso: metadata.proceso,
          fecha_doc: metadata.fecha_doc,
          autor: metadata.autor,
          ruta_storage: filePath,
          hash,
          created_by: user.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      toast.success('Documento subido. Procesando...');

      // Process document (extract text, chunks, embeddings)
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        'process-document',
        { body: { documentId: doc.id } }
      );

      if (processError) {
        console.error('Process error:', processError);
        toast.error('Error procesando documento');
      } else {
        toast.success(
          `Documento procesado: ${processResult.chunks} chunks, ${processResult.embeddings} embeddings`
        );
      }

      // Reset form
      setSelectedFile(null);
      setMetadata({
        titulo: '',
        tipo: 'resolucion',
        proceso: 'asignacion',
        fecha_doc: new Date().toISOString().split('T')[0],
        autor: '',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Reload documents
      loadDocuments();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAutoTag = async (docId: string) => {
    setSelectedDocForTag(docId);
    setAutoTagDialogOpen(true);
    setAutoTagLoading(true);
    setGeneratedMetadata(null);

    try {
      const { data, error } = await supabase.functions.invoke('auto-tag-document', {
        body: { documentId: docId }
      });

      if (error) throw error;

      if (data.error) throw new Error(data.error);

      setGeneratedMetadata(data.metadata);
      toast.success('Metadatos generados exitosamente');
      
      // Reload documents to show updated metadata
      await loadDocuments();
    } catch (error: any) {
      console.error('Auto-tag error:', error);
      toast.error('Error generando metadatos: ' + error.message);
      setAutoTagDialogOpen(false);
    } finally {
      setAutoTagLoading(false);
    }
  };

  const handleDelete = async (docId: string, rutaStorage: string) => {
    if (!confirm('¿Eliminar este documento?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documentos')
        .remove([rutaStorage]);

      if (storageError) throw storageError;

      // Delete from database (cascade will handle chunks/embeddings)
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      toast.success('Documento eliminado');
      loadDocuments();
    } catch (error: any) {
      toast.error('Error eliminando: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Documentos</h1>
            <p className="text-muted-foreground">
              Gestiona los documentos institucionales
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subir Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={metadata.titulo}
                  onChange={(e) => setMetadata({ ...metadata, titulo: e.target.value })}
                  placeholder="Nombre del documento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="autor">Autor *</Label>
                <Input
                  id="autor"
                  value={metadata.autor}
                  onChange={(e) => setMetadata({ ...metadata, autor: e.target.value })}
                  placeholder="Nombre del autor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Documento *</Label>
                <Select
                  value={metadata.tipo}
                  onValueChange={(value: any) => setMetadata({ ...metadata, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolucion">Resolución</SelectItem>
                    <SelectItem value="oficio">Oficio</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="memorando">Memorando</SelectItem>
                    <SelectItem value="reporte">Reporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proceso">Proceso *</Label>
                <Select
                  value={metadata.proceso}
                  onValueChange={(value: any) => setMetadata({ ...metadata, proceso: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asignacion">Asignación</SelectItem>
                    <SelectItem value="evaluacion">Evaluación</SelectItem>
                    <SelectItem value="capacitacion">Capacitación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha del Documento *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={metadata.fecha_doc}
                  onChange={(e) => setMetadata({ ...metadata, fecha_doc: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Archivo (PDF, DOCX, TXT - máx. 10MB) *</Label>
              <Input
                id="file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir y Procesar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay documentos aún. Sube tu primer documento para comenzar.
              </p>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between p-4 bg-card">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{doc.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.tipo} • {doc.proceso} • {new Date(doc.fecha_doc).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAutoTag(doc.id)}
                          disabled={autoTagLoading && selectedDocForTag === doc.id}
                        >
                          {autoTagLoading && selectedDocForTag === doc.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              {doc.auto_tagged ? 'Regenerar Tags' : 'Generar Tags IA'}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id, doc.ruta_storage)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    
                    {doc.auto_tagged && (
                      <div className="p-4 pt-0">
                        <DocumentMetadataCard metadata={doc} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AutoTaggingDialog
        open={autoTagDialogOpen}
        onOpenChange={setAutoTagDialogOpen}
        loading={autoTagLoading}
        metadata={generatedMetadata}
      />
    </Layout>
  );
}
