import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RagQueryRequest {
  question: string;
  topK?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { question, topK = 5 } = await req.json() as RagQueryRequest;
    
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token || '');
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing RAG query for user ${user.id}: "${question}"`);
    const startTime = Date.now();

    // 1. Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question, openaiApiKey);
    
    // 2. Search for similar chunks using vector similarity
    const { data: similarChunks, error: searchError } = await supabase.rpc(
      'match_chunks',
      {
        query_embedding: questionEmbedding,
        match_threshold: 0.5,
        match_count: topK,
      }
    );

    if (searchError) {
      console.error('Vector search error:', searchError);
      throw new Error(`Vector search failed: ${searchError.message}`);
    }

    if (!similarChunks || similarChunks.length === 0) {
      return new Response(
        JSON.stringify({ 
          answer: 'No encontré información relevante en los documentos para responder tu pregunta.',
          sources: [],
          chunks: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${similarChunks.length} relevant chunks`);

    // 3. Build context from retrieved chunks
    const context = similarChunks
      .map((chunk: any) => `[Documento: ${chunk.document_title}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    // 4. Generate answer using OpenAI
    const answer = await generateAnswer(question, context, openaiApiKey);
    
    const latency = Date.now() - startTime;

    // 5. Save query to database
    const { data: queryRecord, error: queryError } = await supabase
      .from('queries')
      .insert({
        user_id: user.id,
        pregunta: question,
        respuesta: answer,
        latency_ms: latency,
        top_k: topK,
      })
      .select()
      .single();

    if (queryError) {
      console.error('Error saving query:', queryError);
    }

    // 6. Save query sources
    if (queryRecord) {
      const sources = similarChunks.map((chunk: any, index: number) => ({
        query_id: queryRecord.id,
        document_id: chunk.document_id,
        chunk_id: chunk.chunk_id,
        rank: index + 1,
        score: chunk.similarity,
      }));

      const { error: sourcesError } = await supabase
        .from('query_sources')
        .insert(sources);

      if (sourcesError) {
        console.error('Error saving sources:', sourcesError);
      }
    }

    // 7. Return response with sources
    const sourcesInfo = similarChunks.map((chunk: any) => ({
      documentId: chunk.document_id,
      documentTitle: chunk.document_title,
      documentType: chunk.document_type,
      similarity: chunk.similarity,
    }));

    return new Response(
      JSON.stringify({
        answer,
        sources: sourcesInfo,
        chunks: similarChunks.length,
        latencyMs: latency,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in RAG query:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Embeddings API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function generateAnswer(question: string, context: string, apiKey: string): Promise<string> {
  const systemPrompt = `Eres un asistente experto en análisis de documentos institucionales. Tu trabajo es responder preguntas basándote ÚNICAMENTE en el contexto proporcionado.

Instrucciones:
- Responde de forma clara, precisa y concisa
- Usa SOLO la información del contexto proporcionado
- Si la información no está en el contexto, indica que no puedes responder con la información disponible
- Cita el documento fuente cuando sea relevante
- Mantén un tono profesional y objetivo`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Contexto de documentos:\n\n${context}\n\nPregunta: ${question}` 
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Chat API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
