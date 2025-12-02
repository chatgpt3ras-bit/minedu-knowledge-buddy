import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, CheckCircle } from 'lucide-react';

interface AutoTaggingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  metadata: {
    tema?: string;
    subtema?: string;
    area_responsable?: string;
    palabras_clave?: string[];
    proceso_asociado?: string;
  } | null;
}

export function AutoTaggingDialog({ open, onOpenChange, loading, metadata }: AutoTaggingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Auto-Tagging con IA
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Generando metadatos...</p>
              <p className="text-sm text-muted-foreground">
                La IA está analizando el documento y extrayendo información relevante
              </p>
            </div>
          </div>
        ) : metadata ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Metadatos generados exitosamente</span>
            </div>

            <div className="space-y-4">
              {metadata.tema && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Tema Principal</label>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="font-medium text-foreground">{metadata.tema}</p>
                  </div>
                </div>
              )}

              {metadata.subtema && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Subtema</label>
                  <div className="p-3 bg-secondary/50 border border-border rounded-lg">
                    <p className="text-foreground">{metadata.subtema}</p>
                  </div>
                </div>
              )}

              {metadata.area_responsable && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Área Responsable</label>
                  <div className="p-3 bg-muted border border-border rounded-lg">
                    <p className="text-foreground">{metadata.area_responsable}</p>
                  </div>
                </div>
              )}

              {metadata.proceso_asociado && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Proceso Asociado</label>
                  <div className="p-3 bg-muted border border-border rounded-lg">
                    <p className="text-foreground">{metadata.proceso_asociado}</p>
                  </div>
                </div>
              )}

              {metadata.palabras_clave && metadata.palabras_clave.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Palabras Clave</label>
                  <div className="flex flex-wrap gap-2">
                    {metadata.palabras_clave.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No se han generado metadatos aún</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
