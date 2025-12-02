import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Tag, CheckCircle, Brain, FileText, Target } from 'lucide-react';

interface AutoTaggingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  metadata: {
    tema_principal?: string;
    subtema?: string;
    proceso_asociado?: string;
    palabras_clave?: string[];
    tipo_documento?: string;
    resumen_breve?: string;
    nivel_confianza?: number;
  } | null;
}

export function AutoTaggingDialog({ open, onOpenChange, loading, metadata }: AutoTaggingDialogProps) {
  const confidencePercentage = metadata?.nivel_confianza 
    ? Math.round(metadata.nivel_confianza * 100) 
    : 0;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Auto-Tagging Inteligente con OpenAI
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-14 w-14 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Analizando documento...</p>
              <p className="text-sm text-muted-foreground">
                OpenAI está extrayendo metadatos inteligentes del contenido
              </p>
            </div>
          </div>
        ) : metadata ? (
          <div className="space-y-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Metadatos generados exitosamente</span>
              </div>
              {metadata.nivel_confianza !== undefined && (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm font-medium ${getConfidenceColor(metadata.nivel_confianza)}`}>
                    {confidencePercentage}% confianza
                  </span>
                </div>
              )}
            </div>

            {metadata.nivel_confianza !== undefined && (
              <div className="space-y-1">
                <Progress value={confidencePercentage} className="h-2" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.tema_principal && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Tema Principal
                  </label>
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="font-medium text-foreground">{metadata.tema_principal}</p>
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

              {metadata.tipo_documento && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Tipo de Documento
                  </label>
                  <div className="p-3 bg-muted border border-border rounded-lg">
                    <p className="text-foreground capitalize">{metadata.tipo_documento}</p>
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
            </div>

            {metadata.resumen_breve && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Resumen Breve</label>
                <div className="p-4 bg-accent/30 border border-border rounded-lg">
                  <p className="text-foreground text-sm leading-relaxed">{metadata.resumen_breve}</p>
                </div>
              </div>
            )}

            {metadata.palabras_clave && metadata.palabras_clave.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Palabras Clave ({metadata.palabras_clave.length})
                </label>
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
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No se han generado metadatos aún</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
