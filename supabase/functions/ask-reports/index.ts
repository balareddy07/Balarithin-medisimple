// Supabase Edge Function — ask-reports ("Ask my reports")
// RAG over the user's own uploaded reports:
//   1. embed the question (all-MiniLM-L6-v2, 384d)
//   2. cosine-similarity retrieval via match_report_chunks RPC (top 6)
//   3. grounded answer from the retrieved passages ONLY, with citations
// Returns { found, answer, citations[] }. Never diagnoses.
// Deploy: supabase functions deploy ask-reports

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { pipeline } from 'npm:@huggingface/transformers@3.5.0'
import { buildAnswerPrompt, toVectorLiteral } from '../_shared/rag.ts'

const ALLOWED_ORIGINS = [
  'https://medisimple-neon.vercel.app',
  'https://medisimple.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
]

function cors(req: Request, extra: Record<string, string> = {}) {
  const origin = req.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    ...extra,
  }
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: cors(req, { 'Content-Type': 'application/json' }),
  })

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil',
  kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', bn: 'Bengali',
  gu: 'Gujarati', pa: 'Punjabi', es: 'Spanish',
}

let extractorPromise: Promise<any> | null = null
function getExtractor(): Promise<any> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return extractorPromise
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return json(req, { error: 'unauthorized' }, 401)

    const { question, language = 'en', topK = 6 } = await req.json()
    if (!question || typeof question !== 'string' || !question.trim()) {
      return json(req, { error: 'question is required' }, 400)
    }
    const langName = LANG_NAMES[language] || 'English'

    // 1. Embed the question with the same model used at ingest time
    const extractor = await getExtractor()
    const qOut = await extractor(question.trim().slice(0, 500), { pooling: 'mean', normalize: true })
    const queryEmbedding = toVectorLiteral(qOut.data)

    // 2. Retrieve the most similar chunks from THIS user's reports only
    const { data: matches, error: rpcError } = await supabase.rpc('match_report_chunks', {
      query_embedding: queryEmbedding,
      match_user_id: user.id,
      match_count: Math.min(Math.max(topK, 1), 10),
    })
    if (rpcError) throw rpcError

    if (!matches || matches.length === 0) {
      return json(req, { found: false, answer: '', citations: [] })
    }

    // 3. Grounded answer — the model sees ONLY these passages
    const passages = matches.map((m: any, i: number) => ({
      n: i + 1,
      reportName: m.patient_name || 'Report',
      reportDate: new Date(m.report_created_at).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
      text: m.content,
    }))
    const { system, user: userPrompt } = buildAnswerPrompt(question.trim(), passages, langName)

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')!
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
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    const aiData = await response.json()
    const answer = aiData.content?.[0]?.text || ''

    const citations = matches.map((m: any, i: number) => ({
      n: i + 1,
      reportId: m.report_id,
      reportName: m.patient_name || 'Report',
      reportDate: passages[i].reportDate,
      chunkIndex: m.chunk_index,
      excerpt: String(m.content).slice(0, 220),
      similarity: Number(m.similarity.toFixed(3)),
    }))

    // Usage log (same table as consult)
    await supabase.from('api_usage_log').insert({
      user_id: user.id,
      mode: 'ask_reports',
      tokens_used: aiData.usage?.output_tokens || 0,
    }).catch(() => {})

    return json(req, { found: true, answer, citations })
  } catch (err) {
    return json(req, { error: String(err) }, 500)
  }
})
