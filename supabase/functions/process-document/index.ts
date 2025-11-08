import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessDocumentRequest {
  documentId: string;
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
    
    const { documentId } = await req.json() as ProcessDocumentRequest;
    
    console.log('Processing document:', documentId);

    // Get document metadata
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) throw new Error(`Document not found: ${docError.message}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documentos')
      .download(doc.ruta_storage);

    if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

    // Extract text from file
    const text = await extractText(fileData, doc.ruta_storage);
    console.log(`Extracted ${text.length} characters from document`);

    // Generate chunks
    const chunks = createChunks(text, 1200, 200);
    console.log(`Created ${chunks.length} chunks`);

    // Insert chunks into database
    const chunksToInsert = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content,
      token_count: estimateTokens(content),
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from('chunks')
      .insert(chunksToInsert)
      .select();

    if (chunksError) throw new Error(`Chunks insertion failed: ${chunksError.message}`);

    console.log(`Inserted ${insertedChunks.length} chunks`);

    // Generate embeddings for each chunk
    const embeddingsToInsert = [];
    
    for (const chunk of insertedChunks) {
      const embedding = await generateEmbedding(chunk.content, openaiApiKey);
      embeddingsToInsert.push({
        chunk_id: chunk.id,
        vector: embedding,
        model: 'text-embedding-3-small',
      });
    }

    const { error: embeddingsError } = await supabase
      .from('embeddings')
      .insert(embeddingsToInsert);

    if (embeddingsError) throw new Error(`Embeddings insertion failed: ${embeddingsError.message}`);

    console.log(`Generated ${embeddingsToInsert.length} embeddings`);

    return new Response(
      JSON.stringify({
        success: true,
        chunks: chunks.length,
        embeddings: embeddingsToInsert.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractText(file: Blob, filename: string): Promise<string> {
  const text = await file.text();
  
  // Simple text extraction - for PDF/DOCX you'd need specialized libraries
  // For now, treating all files as text
  if (filename.endsWith('.txt')) {
    return text;
  }
  
  // For other formats, return raw text (in production, use proper parsers)
  return text;
}

function createChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const tokens = text.split(/\s+/);
  
  for (let i = 0; i < tokens.length; i += (chunkSize - overlap)) {
    const chunk = tokens.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

function estimateTokens(text: string): number {
  // Simple token estimation: ~4 chars per token
  return Math.ceil(text.length / 4);
}

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
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
