import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3 } from 'lucide-react';

export default function Evaluacion() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Evaluación y Métricas</h1>
            <p className="text-muted-foreground">
              Monitorea el rendimiento del sistema
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Tiempo de Respuesta', value: '0.0s', color: 'border-info' },
            { label: 'Precisión@k', value: '0.0%', color: 'border-success' },
            { label: 'Tasa de Reutilización', value: '0.0%', color: 'border-accent' },
            { label: 'Docs Nuevos/Semana', value: '0', color: 'border-primary' },
          ].map((metric) => (
            <Card key={metric.label} className={`border-l-4 ${metric.color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Sin datos disponibles
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Las métricas aparecerán aquí una vez que comiences a realizar consultas 
                en el sistema.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objetivos de Investigación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-sm mb-2">✓ Captura del conocimiento</h4>
                <p className="text-xs text-muted-foreground">
                  Medido por: Número de documentos indexados y metadatos capturados
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-sm mb-2">✓ Almacenamiento y organización</h4>
                <p className="text-xs text-muted-foreground">
                  Medido por: Taxonomías aplicadas y estructura de chunks
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-sm mb-2">✓ Aplicación y reutilización</h4>
                <p className="text-xs text-muted-foreground">
                  Medido por: Tasa de reutilización (% consultas con clic en fuente)
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-sm mb-2">✓ Evaluación y mejora continua</h4>
                <p className="text-xs text-muted-foreground">
                  Medido por: Tiempo de respuesta, precisión@k, actualización semanal
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
