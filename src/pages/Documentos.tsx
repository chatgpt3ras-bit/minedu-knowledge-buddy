import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';

export default function Documentos() {
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
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Subir Documento
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Carga de Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Arrastra archivos aquí
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                o haz clic para seleccionar archivos (PDF, DOCX, TXT - máx. 10MB)
              </p>
              <Button variant="outline">Seleccionar Archivos</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay documentos aún. Sube tu primer documento para comenzar.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
