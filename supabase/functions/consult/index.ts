// Supabase Edge Function — consultation AI (explain terms + drug breakdown)
// Deploy: supabase functions deploy consult

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://medisimple.vercel.app', 'http://localhost:3000', 'http://localhost:5173']

function getCORSHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil',
  kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', bn: 'Bengali',
  gu: 'Gujarati', pa: 'Punjabi', es: 'Spanish',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCORSHeaders(req) })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    let userId: string | null = null

    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id ?? null
    }

    const body = await req.json()
    const { mode, text, language = 'en', patientContext = {} } = body
    // mode: 'explain' | 'drugs'
    // patientContext: { medications: [], metrics: [], conditions: [] }

    const langName = LANG_NAMES[language] || 'English'
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const contextBlock = patientContext.medications?.length
      ? `\nThis patient's current medications: ${patientContext.medications.map((m: any) => `${m.name} ${m.dose}`).join(', ')}.`
      : ''

    const metricsBlock = patientContext.metrics?.length
      ? `\nTheir recent lab values: ${patientContext.metrics.map((m: any) => `${m.name} ${m.value} ${m.unit}`).join(', ')}.`
      : ''

    let systemPrompt = ''
    let userPrompt = ''

    if (mode === 'explain') {
      systemPrompt = `You are a compassionate health educator helping patients understand what their doctor just told them.
Always respond in ${langName}.
Use simple everyday language — as if explaining to a 60-year-old who has never studied medicine.
Never use jargon without immediately explaining it.
Keep response under 150 words.
End with one reassuring sentence.`

      userPrompt = `The doctor just said: "${text}"
${contextBlock}${metricsBlock}

Explain this in simple ${langName} so the patient understands exactly what it means and what they should do.`

    } else if (mode === 'drugs') {
      systemPrompt = `You are a helpful pharmacist assistant explaining a prescription to a patient in ${langName}.
Use simple everyday language.
For EACH medication listed, explain:
1. What it does (one sentence)
2. When to take it
3. Main side effect to watch for
4. ⚠️ Any interaction with their existing medications (VERY IMPORTANT)

Format as a list. Be concise. End with a reminder to take medications regularly.`

      userPrompt = `New prescription:
${text}
${contextBlock}${metricsBlock}

Explain each medication in simple ${langName}. Flag any interactions with their existing medications.`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const aiData = await response.json()
    const result = aiData.content?.[0]?.text || ''

    // Log usage for billing
    if (userId) {
      await supabase.from('api_usage_log').insert({
        user_id: userId, mode, tokens_used: aiData.usage?.output_tokens || 0
      }).catch(() => {})
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...getCORSHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
