import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-3.5-flash'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { messages, system, max_tokens } = await req.json()

    const contents = messages.map((m: any) => {
      let parts
      if (typeof m.content === 'string') {
        parts = [{ text: m.content }]
      } else {
        parts = m.content.map((block: any) => {
          if (block.type === 'text') return { text: block.text }
          if (block.type === 'image') {
            return { inline_data: { mime_type: block.source.media_type, data: block.source.data } }
          }
          return { text: '' }
        })
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts }
    })

    const body: any = {
      contents,
      generationConfig: { maxOutputTokens: max_tokens || 1000 }
    }
    if (system) body.systemInstruction = { parts: [{ text: system }] }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY secret not set in Supabase' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    const data = await response.json()

    // Surface real Gemini errors instead of silently returning empty text
    if (!response.ok || data.error) {
      const msg = data?.error?.message || `Gemini request failed (${response.status})`
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || ''
    const normalized = { content: [{ type: 'text', text }] }

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
