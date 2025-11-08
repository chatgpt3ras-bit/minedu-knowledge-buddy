import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Search, TrendingUp, Clock, Loader2 } from 'lucide-react';

interface DashboardStats {
  totalDocumentos: number;
  consultasHoy: number;
  tiempoPromedio: number;
  precision: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocumentos: 0,
    consultasHoy: 0,
    tiempoPromedio: 0,
    precision: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const today = new Date().toISOString().split('T')[0];

      const [docsCount, queriesCount, kpisToday] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('queries').select('id', { count: 'exact', head: true })
          .gte('created_at', today),
        supabase.from('kpis_daily').select('*').eq('fecha', today).maybeSingle(),
      ]);

      setStats({
        totalDocumentos: docsCount.count || 0,
        consultasHoy: queriesCount.count || 0,
        tiempoPromedio: kpisToday.data?.avg_latency_ms || 0,
        precision: kpisToday.data?.precision_at_k_avg || 0,
      });

      setIsLoading(false);
    }

    loadStats();
  }, []);

  const statCards = [
    {
      title: 'Documentos Totales',
      value: stats.totalDocumentos,
      icon: FileText,
      color: 'text-primary',
    },
    {
      title: 'Consultas Hoy',
      value: stats.consultasHoy,
      icon: Search,
      color: 'text-accent',
    },
    {
      title: 'Tiempo Promedio',
      value: `${(stats.tiempoPromedio / 1000).toFixed(2)}s`,
      icon: Clock,
      color: 'text-info',
    },
    {
      title: 'Precisión@k',
      value: (stats.precision * 100).toFixed(1) + '%',
      icon: TrendingUp,
      color: 'text-success',
    },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Vista general del sistema de gestión del conocimiento
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bienvenido al Sistema de Gestión del Conocimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Este sistema permite capturar, almacenar, organizar y reutilizar el conocimiento 
              institucional del MINEDU mediante tecnología RAG (Retrieval-Augmented Generation).
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-card-foreground mb-2">📚 Documentos</h3>
                <p className="text-sm text-muted-foreground">
                  Sube y gestiona documentos institucionales (resoluciones, oficios, manuales, etc.)
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-card-foreground mb-2">🔍 Buscador RAG</h3>
                <p className="text-sm text-muted-foreground">
                  Realiza consultas inteligentes con respuestas basadas en el conocimiento capturado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
