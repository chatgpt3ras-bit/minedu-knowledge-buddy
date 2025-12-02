import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Sparkles } from 'lucide-react';

interface DocumentMetadata {
  tema?: string;
  subtema?: string;
  area_responsable?: string;
  palabras_clave?: string[];
  proceso_asociado?: string;
  auto_tagged?: boolean;
  auto_tagged_at?: string;
}

interface DocumentMetadataCardProps {
  metadata: DocumentMetadata;
}

export function DocumentMetadataCard({ metadata }: DocumentMetadataCardProps) {
  const hasMetadata = metadata.tema || metadata.subtema || metadata.area_responsable || 
                      (metadata.palabras_clave && metadata.palabras_clave.length > 0) || 
                      metadata.proceso_asociado;

  if (!hasMetadata) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {metadata.auto_tagged ? (
            <>
              <Sparkles className="h-5 w-5 text-primary" />
              Metadatos Generados por IA
            </>
          ) : (
            <>
              <Tag className="h-5 w-5 text-primary" />
              Metadatos del Documento
            </>
          )}
        </CardTitle>
        {metadata.auto_tagged_at && (
          <p className="text-xs text-muted-foreground">
            Generado: {new Date(metadata.auto_tagged_at).toLocaleString('es-ES')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {metadata.tema && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tema Principal
            </label>
            <p className="text-base font-medium text-foreground">{metadata.tema}</p>
          </div>
        )}

        {metadata.subtema && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Subtema
            </label>
            <p className="text-sm text-foreground">{metadata.subtema}</p>
          </div>
        )}

        {metadata.area_responsable && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Área Responsable
            </label>
            <p className="text-sm text-foreground">{metadata.area_responsable}</p>
          </div>
        )}

        {metadata.proceso_asociado && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Proceso Asociado
            </label>
            <p className="text-sm text-foreground">{metadata.proceso_asociado}</p>
          </div>
        )}

        {metadata.palabras_clave && metadata.palabras_clave.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Palabras Clave
            </label>
            <div className="flex flex-wrap gap-2">
              {metadata.palabras_clave.map((keyword, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20"
                >
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
