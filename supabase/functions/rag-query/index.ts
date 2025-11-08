import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RagQueryRequest {
  question: string;
  topK?: number;
  documentType?: string;
  proceso?: string;
  dateFrom?: string;
  dateTo?: string;
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
    
    const { question, topK = 5, documentType, proceso, dateFrom, dateTo } = await req.json() as RagQueryRequest;
    
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
    
    // 2. Build RPC parameters with filters
    const rpcParams: any = {
      query_embedding: questionEmbedding,
      match_threshold: 0.5,
      match_count: topK,
      _user_id: user.id,
      user_id: user.id,
    };

    if (documentType) rpcParams.filter_tipo = documentType;
    if (proceso) rpcParams.filter_proceso = proceso;
    if (dateFrom) rpcParams.filter_date_from = dateFrom;
    if (dateTo) rpcParams.filter_date_to = dateTo;

    // 3. Search for similar chunks using vector similarity
    const { data: similarChunks, error: searchError } = await supabase.rpc(
      'match_chunks',
      rpcParams
    );

    if (searchError) {
      console.error('Vector search error:', searchError);
      throw new Error(`Vector search failed: ${searchError.message}`);
    }

    let useWebSearch = false;
    if (!similarChunks || similarChunks.length === 0) {
      console.log('No relevant chunks found, using web search as fallback');
      useWebSearch = true;
    }

    let context = '';
    let answer = '';

    if (useWebSearch) {
      // Use web search mode
      answer = await generateAnswerWithWebSearch(question, openaiApiKey);
    } else {
      console.log(`Found ${similarChunks.length} relevant chunks`);

      // 4. Build context from retrieved chunks
      context = similarChunks
        .map((chunk: any) => `[Documento: ${chunk.document_title}]\n${chunk.content}`)
        .join('\n\n---\n\n');

      // 5. Generate answer using OpenAI with document context
      answer = await generateAnswer(question, context, openaiApiKey);
    }
    
    const latency = Date.now() - startTime;

    // 6. Save query to database
    const { data: queryRecord, error: queryError } = await supabase
      .from('queries')
      .insert({
        user_id: user.id,
        pregunta: question,
        respuesta: answer,
        latency_ms: latency,
        top_k: useWebSearch ? 0 : topK,
      })
      .select()
      .single();

    if (queryError) {
      console.error('Error saving query:', queryError);
    }

    // 7. Save query sources
    if (queryRecord && !useWebSearch) {
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

    // 8. Return response with sources
    const sourcesInfo = useWebSearch ? [] : similarChunks.map((chunk: any) => ({
      documentId: chunk.document_id,
      documentTitle: chunk.document_title,
      documentType: chunk.document_type,
      similarity: chunk.similarity,
    }));

    return new Response(
      JSON.stringify({
        answer,
        sources: sourcesInfo,
        chunks: useWebSearch ? 0 : similarChunks.length,
        latencyMs: latency,
        queryId: queryRecord?.id,
        usedWebSearch: useWebSearch,
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

async function generateAnswerWithWebSearch(question: string, apiKey: string): Promise<string> {
  const systemPrompt = `Eres un asistente experto que puede buscar información en internet cuando no hay documentos institucionales disponibles.

Instrucciones:
- Responde de forma clara, precisa y concisa
- Usa información actualizada y verificable de internet
- Indica que la información proviene de fuentes externas (no de documentos institucionales)
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
          content: `Pregunta: ${question}\n\nNOTA: No hay documentos institucionales disponibles para esta consulta. Proporciona información general basada en tu conocimiento.` 
        },
      ],
      temperature: 0.5,
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
