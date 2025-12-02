import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoTagRequest {
  documentId: string;
  content?: string;
}

interface GeneratedMetadata {
  tema_principal: string;
  subtema: string;
  proceso_asociado: string;
  palabras_clave: string[];
  tipo_documento: string;
  resumen_breve: string;
  nivel_confianza: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { documentId, content } = await req.json() as AutoTagRequest;
    
    console.log('Auto-tagging document with OpenAI:', documentId);

    // Get document metadata
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('titulo, autor, tipo, proceso')
      .eq('id', documentId)
      .single();

    if (docError) throw new Error(`Documento no encontrado: ${docError.message}`);

    // Get document content from chunks
    let documentContent = content || '';
    if (!documentContent) {
      const { data: chunks, error: chunksError } = await supabase
        .from('chunks')
        .select('content')
        .eq('document_id', documentId)
        .order('chunk_index', { ascending: true })
        .limit(10);

      if (!chunksError && chunks && chunks.length > 0) {
        documentContent = chunks.map(c => c.content).join('\n\n');
      }
    }

    if (!documentContent) {
      throw new Error('No se encontró contenido del documento para analizar');
    }

    // Construct the prompt for OpenAI
    const systemPrompt = `Eres un sistema experto en análisis documental del sector público.
Recibirás el texto completo de un documento institucional (oficio, informe, resolución, memorando, etc.).

Analízalo y genera metadatos profesionales para gestión documental.

Devuelve exclusivamente un JSON con los siguientes campos:

- tema_principal: El tema general del documento
- subtema: Un subtema más específico
- proceso_asociado: El proceso institucional relacionado
- palabras_clave: Lista de 5 a 10 palabras clave relevantes
- tipo_documento: Tipo de documento (oficio, informe, resolución, normativa, memorando, manual, reporte, etc.)
- resumen_breve: Resumen del documento en máximo 3 líneas
- nivel_confianza: Número de 0 a 1 indicando qué tan seguro estás de tu análisis

No incluyas nada más fuera del JSON. Solo responde con el JSON válido.`;

    const userPrompt = `Analiza el siguiente documento institucional:

Título: ${doc.titulo}
Autor: ${doc.autor || 'No especificado'}
Tipo registrado: ${doc.tipo}
Proceso registrado: ${doc.proceso}

Contenido del documento:
${documentContent.substring(0, 8000)}`;

    console.log('Calling OpenAI API...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Límite de velocidad excedido en OpenAI. Intenta de nuevo más tarde.');
      }
      if (response.status === 401) {
        throw new Error('API Key de OpenAI inválida o expirada.');
      }
      
      throw new Error(`Error en API de OpenAI: ${response.status}`);
    }

    const aiData = await response.json();
    const generatedText = aiData.choices[0].message.content;
    
    console.log('OpenAI generated text:', generatedText);

    // Parse the JSON response
    let metadata: GeneratedMetadata;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      } else {
        metadata = JSON.parse(generatedText);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', generatedText);
      throw new Error('No se pudo parsear la respuesta de OpenAI');
    }

    // Validate and normalize palabras_clave
    let palabrasClave: string[] = [];
    const rawKeywords = metadata.palabras_clave as unknown;
    if (typeof rawKeywords === 'string') {
      palabrasClave = rawKeywords.split(',').map((k: string) => k.trim());
    } else if (Array.isArray(rawKeywords)) {
      palabrasClave = rawKeywords;
    }

    // Validate nivel_confianza
    const nivelConfianza = Math.min(1, Math.max(0, metadata.nivel_confianza || 0.8));

    // Update document with generated metadata
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        tema: metadata.tema_principal || null,
        subtema: metadata.subtema || null,
        area_responsable: metadata.tipo_documento || null,
        palabras_clave: palabrasClave.length > 0 ? palabrasClave : null,
        proceso_asociado: metadata.proceso_asociado || null,
        resumen_breve: metadata.resumen_breve || null,
        nivel_confianza: nivelConfianza,
        auto_tagged: true,
        auto_tagged_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) throw new Error(`Error actualizando documento: ${updateError.message}`);

    console.log('Document auto-tagged successfully with OpenAI');

    return new Response(
      JSON.stringify({
        success: true,
        metadata: {
          tema_principal: metadata.tema_principal,
          subtema: metadata.subtema,
          proceso_asociado: metadata.proceso_asociado,
          palabras_clave: palabrasClave,
          tipo_documento: metadata.tipo_documento,
          resumen_breve: metadata.resumen_breve,
          nivel_confianza: nivelConfianza,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in auto-tag-document:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
