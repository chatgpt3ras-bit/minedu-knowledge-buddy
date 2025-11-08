import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, Loader2, FileText, Clock } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    documentTitle: string;
    documentType: string;
    similarity: number;
  }>;
  timestamp: Date;
}

export default function Buscador() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (question: string) => {
    if (!question.trim() || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('rag-query', {
        body: { question, topK: 5 },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.chunks === 0) {
        toast.info('No se encontraron documentos relevantes para tu consulta');
      } else {
        toast.success(`Respuesta generada usando ${data.chunks} fragmentos de documentos`);
      }
    } catch (error: any) {
      console.error('Error en RAG query:', error);
      toast.error('Error al procesar tu consulta: ' + error.message);
      
      // Remove user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
  };

  const handleSend = () => {
    handleSubmit(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

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
              <ScrollArea className="h-[500px] rounded-lg border border-border bg-muted/30 p-4">
                {messages.length === 0 ? (
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
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Fuentes consultadas:
                              </p>
                              <div className="space-y-1">
                                {message.sources.map((source, idx) => (
                                  <div key={idx} className="text-xs flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {source.documentType}
                                    </Badge>
                                    <span className="truncate flex-1">{source.documentTitle}</span>
                                    <span className="text-muted-foreground">
                                      {(source.similarity * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              <div className="flex gap-2">
                <Input 
                  placeholder="Escribe tu consulta aquí..." 
                  className="flex-1"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <Button onClick={handleSend} disabled={loading || !input.trim()}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
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
                '¿Cómo se realiza la evaluación de desempeño?',
                '¿Qué dice la normativa sobre asignación de recursos?',
              ].map((example, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="w-full justify-start text-left"
                  onClick={() => handleExampleClick(example)}
                  disabled={loading}
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
