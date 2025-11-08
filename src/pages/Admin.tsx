import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, RefreshCw, Settings } from 'lucide-react';

export default function Admin() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Administración</h1>
          <p className="text-muted-foreground">
            Panel de control administrativo
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Gestión de Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Administra roles y permisos de usuarios
              </p>
              <Button variant="outline" className="w-full">
                Ver Usuarios
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-5 w-5" />
                Reindexación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Regenera embeddings de documentos
              </p>
              <Button variant="outline" className="w-full">
                Reindexar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-5 w-5" />
                Taxonomías
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configura categorías y procesos
              </p>
              <Button variant="outline" className="w-full">
                Configurar
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas Globales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">0</div>
                <p className="text-sm text-muted-foreground mt-1">Total Usuarios</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">0</div>
                <p className="text-sm text-muted-foreground mt-1">Total Documentos</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">0</div>
                <p className="text-sm text-muted-foreground mt-1">Total Consultas</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-info">0</div>
                <p className="text-sm text-muted-foreground mt-1">Embeddings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <h4 className="font-semibold text-sm">Modelo de Embeddings</h4>
                  <p className="text-xs text-muted-foreground">text-embedding-3-small</p>
                </div>
                <Button variant="outline" size="sm">Cambiar</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <h4 className="font-semibold text-sm">Modelo de Chat</h4>
                  <p className="text-xs text-muted-foreground">google/gemini-2.5-flash</p>
                </div>
                <Button variant="outline" size="sm">Cambiar</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <h4 className="font-semibold text-sm">Top K Resultados</h4>
                  <p className="text-xs text-muted-foreground">5 fragmentos por consulta</p>
                </div>
                <Button variant="outline" size="sm">Ajustar</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
