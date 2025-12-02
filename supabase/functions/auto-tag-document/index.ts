import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoTagRequest {
  documentId: string;
  content?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { documentId, content } = await req.json() as AutoTagRequest;
    
    console.log('Auto-tagging document:', documentId);

    // Get document metadata and content
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('titulo, autor, tipo, proceso')
      .eq('id', documentId)
      .single();

    if (docError) throw new Error(`Document not found: ${docError.message}`);

    // Get a sample of the document content from chunks
    let documentContent = content || '';
    if (!documentContent) {
      const { data: chunks, error: chunksError } = await supabase
        .from('chunks')
        .select('content')
        .eq('document_id', documentId)
        .order('chunk_index', { ascending: true })
        .limit(5);

      if (!chunksError && chunks && chunks.length > 0) {
        documentContent = chunks.map(c => c.content).join('\n\n');
      }
    }

    // Call Lovable AI to generate metadata
    const prompt = `Analiza el siguiente documento y genera metadatos estructurados en español.

Título: ${doc.titulo}
Autor: ${doc.autor}
Tipo: ${doc.tipo}
Proceso: ${doc.proceso}

Contenido:
${documentContent.substring(0, 3000)}

Genera los siguientes metadatos:
1. tema: El tema principal del documento (ej: "Recursos Humanos", "Finanzas", "Operaciones")
2. subtema: Un subtema más específico (ej: "Evaluación de Desempeño", "Presupuestos", "Logística")
3. area_responsable: El área o departamento responsable (ej: "Dirección de RR.HH.", "Gerencia Financiera")
4. palabras_clave: 5-8 palabras clave relevantes separadas por comas
5. proceso_asociado: El proceso institucional asociado (ej: "Gestión del Talento", "Control Presupuestal")

Responde SOLO con un objeto JSON válido con estos campos exactos, sin texto adicional.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Eres un asistente especializado en análisis de documentos institucionales. Genera metadatos precisos en formato JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Límite de velocidad excedido. Por favor, intenta de nuevo más tarde.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos agotados. Por favor, recarga tu cuenta de Lovable AI.');
      }
      
      throw new Error(`Error en API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices[0].message.content;
    
    console.log('AI generated text:', generatedText);

    // Parse the JSON response
    let metadata;
    try {
      // Try to extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      } else {
        metadata = JSON.parse(generatedText);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedText);
      throw new Error('No se pudo parsear la respuesta de la IA');
    }

    // Extract palabras_clave as array
    let palabrasClave: string[] = [];
    if (typeof metadata.palabras_clave === 'string') {
      palabrasClave = metadata.palabras_clave.split(',').map((k: string) => k.trim());
    } else if (Array.isArray(metadata.palabras_clave)) {
      palabrasClave = metadata.palabras_clave;
    }

    // Update document with generated metadata
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        tema: metadata.tema || null,
        subtema: metadata.subtema || null,
        area_responsable: metadata.area_responsable || null,
        palabras_clave: palabrasClave.length > 0 ? palabrasClave : null,
        proceso_asociado: metadata.proceso_asociado || null,
        auto_tagged: true,
        auto_tagged_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (updateError) throw new Error(`Update failed: ${updateError.message}`);

    console.log('Document auto-tagged successfully');

    return new Response(
      JSON.stringify({
        success: true,
        metadata: {
          tema: metadata.tema,
          subtema: metadata.subtema,
          area_responsable: metadata.area_responsable,
          palabras_clave: palabrasClave,
          proceso_asociado: metadata.proceso_asociado,
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
