import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tag, FileText, Target, Clock } from 'lucide-react';

interface DocumentMetadataCardProps {
  metadata: {
    tema?: string;
    subtema?: string;
    area_responsable?: string;
    palabras_clave?: string[];
    proceso_asociado?: string;
    resumen_breve?: string;
    nivel_confianza?: number;
    auto_tagged_at?: string;
  };
}

export function DocumentMetadataCard({ metadata }: DocumentMetadataCardProps) {
  const confidencePercentage = metadata.nivel_confianza 
    ? Math.round(metadata.nivel_confianza * 100) 
    : null;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const hasMetadata = metadata.tema || metadata.subtema || metadata.area_responsable || 
                      (metadata.palabras_clave && metadata.palabras_clave.length > 0) || 
                      metadata.proceso_asociado;

  if (!hasMetadata) {
    return null;
  }

  return (
    <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-border/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tag className="h-4 w-4" />
          <span className="font-medium">Metadatos IA</span>
        </div>
        <div className="flex items-center gap-3">
          {confidencePercentage !== null && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className={`text-xs font-medium ${getConfidenceColor(metadata.nivel_confianza!)}`}>
                {confidencePercentage}%
              </span>
            </div>
          )}
          {metadata.auto_tagged_at && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(metadata.auto_tagged_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {confidencePercentage !== null && (
        <Progress value={confidencePercentage} className="h-1.5" />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {metadata.tema && (
          <div>
            <p className="text-xs text-muted-foreground">Tema</p>
            <p className="font-medium truncate" title={metadata.tema}>{metadata.tema}</p>
          </div>
        )}
        {metadata.subtema && (
          <div>
            <p className="text-xs text-muted-foreground">Subtema</p>
            <p className="font-medium truncate" title={metadata.subtema}>{metadata.subtema}</p>
          </div>
        )}
        {metadata.area_responsable && (
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Tipo Doc.
            </p>
            <p className="font-medium truncate capitalize" title={metadata.area_responsable}>
              {metadata.area_responsable}
            </p>
          </div>
        )}
        {metadata.proceso_asociado && (
          <div>
            <p className="text-xs text-muted-foreground">Proceso</p>
            <p className="font-medium truncate" title={metadata.proceso_asociado}>{metadata.proceso_asociado}</p>
          </div>
        )}
      </div>

      {metadata.resumen_breve && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Resumen</p>
          <p className="text-sm text-foreground/80 line-clamp-2">{metadata.resumen_breve}</p>
        </div>
      )}

      {metadata.palabras_clave && metadata.palabras_clave.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
          {metadata.palabras_clave.slice(0, 6).map((keyword, index) => (
            <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
              {keyword}
            </Badge>
          ))}
          {metadata.palabras_clave.length > 6 && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              +{metadata.palabras_clave.length - 6}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
