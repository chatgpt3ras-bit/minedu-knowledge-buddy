import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Send } from 'lucide-react';

export default function Buscador() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Buscador RAG</h1>
          <p className="text-muted-foreground">
            Realiza consultas inteligentes sobre el conocimiento institucional
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chat de Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="min-h-[400px] rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Comienza una conversación
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Haz preguntas sobre los documentos cargados y obtén respuestas 
                    basadas en el conocimiento institucional con citas y referencias.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input 
                  placeholder="Escribe tu consulta aquí..." 
                  className="flex-1"
                />
                <Button>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ejemplos de Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                '¿Cuál es el proceso de evaluación docente?',
                '¿Qué documentos regulan la asignación de plazas?',
                '¿Cuáles son los requisitos para capacitación?',
              ].map((example, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="w-full justify-start text-left"
                >
                  {example}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
