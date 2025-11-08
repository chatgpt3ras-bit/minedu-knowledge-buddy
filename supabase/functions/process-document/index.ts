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

    // Insert chunks into database (sanitize content first)
    const chunksToInsert = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content: sanitizeText(content),
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

function sanitizeText(text: string): string {
  // Remove null bytes and other problematic characters
  let sanitized = text.replace(/\0/g, '');
  
  // Replace problematic Unicode escape sequences
  sanitized = sanitized.replace(/\\u0000/g, '');
  
  // Replace non-printable control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize smart quotes and special characters
  sanitized = sanitized.replace(/[\u2018\u2019]/g, "'"); // Smart single quotes
  sanitized = sanitized.replace(/[\u201C\u201D]/g, '"'); // Smart double quotes
  sanitized = sanitized.replace(/\u2013/g, '-'); // En dash
  sanitized = sanitized.replace(/\u2014/g, '--'); // Em dash
  sanitized = sanitized.replace(/\u2026/g, '...'); // Ellipsis
  
  // Remove any remaining invalid characters for PostgreSQL
  sanitized = sanitized.replace(/[\uFFFE\uFFFF]/g, '');
  
  return sanitized.trim();
}

async function extractText(file: Blob, filename: string): Promise<string> {
  const text = await file.text();
  
  // Simple text extraction - for PDF/DOCX you'd need specialized libraries
  // For now, treating all files as text
  if (filename.endsWith('.txt')) {
    return sanitizeText(text);
  }
  
  // For other formats, return raw text (in production, use proper parsers)
  return sanitizeText(text);
}

function createChunks(text: string, chunkSize: number, overlap: number): string[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  const step = Math.max(chunkSize - overlap, 1);

  if (tokens.length > 0) {
    for (let i = 0; i < tokens.length; i += step) {
      const chunk = tokens.slice(i, i + chunkSize).join(' ').trim();
      if (chunk) {
        if (estimateTokens(chunk) > 8000) {
          chunks.push(...chunkByCharacters(chunk, chunkSize * 4, overlap * 4));
        } else {
          chunks.push(chunk);
        }
      }
    }
  } else if (text.trim()) {
    // Fallback for texts without whitespace (e.g. base64 encoded files)
    chunks.push(...chunkByCharacters(text, chunkSize * 4, overlap * 4));
  }

  return chunks;
}

function chunkByCharacters(text: string, chunkSize: number, overlap: number): string[] {
  const result: string[] = [];
  const effectiveChunkSize = Math.max(chunkSize, 1);
  const step = Math.max(effectiveChunkSize - Math.max(overlap, 0), 1);

  for (let start = 0; start < text.length; start += step) {
    const slice = text.slice(start, Math.min(start + effectiveChunkSize, text.length)).trim();
    if (slice) {
      result.push(slice);
    }
    if (start + effectiveChunkSize >= text.length) {
      break;
    }
  }

  return result;
}

function estimateTokens(text: string): number {
  // Simple token estimation: ~4 chars per token
  return Math.ceil(text.length / 4);
}

function enforceTokenLimit(text: string, maxTokens = 8000): string {
  const maxLength = maxTokens * 4; // Approximate chars per token
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength);
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const safeText = enforceTokenLimit(text);
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: safeText,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
