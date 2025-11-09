import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLatestKPIs, useKPIs } from '@/hooks/useKPIs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Evaluacion() {
  const { data: latestKPIs, isLoading: loadingLatest } = useLatestKPIs();
  const { data: kpisHistory, isLoading: loadingHistory } = useKPIs(30);

  const formatMetric = (value: number | undefined, type: 'time' | 'percentage' | 'count') => {
    if (value === undefined || value === null) return '0';
    
    switch (type) {
      case 'time':
        return value < 1000 ? `${value.toFixed(0)}ms` : `${(value / 1000).toFixed(2)}s`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'count':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const metrics = [
    { 
      label: 'Tiempo de Respuesta', 
      value: formatMetric(latestKPIs?.avg_latency_ms, 'time'), 
      color: 'border-info',
      raw: latestKPIs?.avg_latency_ms || 0
    },
    { 
      label: 'Precisión@k', 
      value: formatMetric(latestKPIs?.precision_at_k_avg, 'percentage'), 
      color: 'border-success',
      raw: latestKPIs?.precision_at_k_avg || 0
    },
    { 
      label: 'Tasa de Reutilización', 
      value: formatMetric(latestKPIs?.reuse_rate, 'percentage'), 
      color: 'border-accent',
      raw: latestKPIs?.reuse_rate || 0
    },
    { 
      label: 'Consultas Totales', 
      value: formatMetric(latestKPIs?.consultas, 'count'), 
      color: 'border-primary',
      raw: latestKPIs?.consultas || 0
    },
  ];

  const chartData = kpisHistory?.map(kpi => ({
    fecha: format(new Date(kpi.fecha), 'dd MMM', { locale: es }),
    consultas: kpi.consultas,
    precision: kpi.precision_at_k_avg,
    latencia: kpi.avg_latency_ms,
  })) || [];

  const hasData = kpisHistory && kpisHistory.length > 0;

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
          <Button variant="outline" disabled={!hasData}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className={`border-l-4 ${metric.color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loadingLatest ? '...' : metric.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Consultas (últimos 30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Cargando datos...</div>
              </div>
            ) : !hasData ? (
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
            ) : (
              <ChartContainer
                config={{
                  consultas: {
                    label: 'Consultas',
                    color: 'hsl(var(--primary))',
                  },
                }}
                className="h-[300px] w-full"
              >
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="fecha" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="consultas"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorConsultas)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
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
