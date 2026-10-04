// Supabase Edge Function — ingest-report
// Chunks an uploaded report, embeds each chunk with all-MiniLM-L6-v2 (384d),
// and stores them in report_chunks for the ask-reports RAG flow.
// Called fire-and-forget from UploadReport after a report is saved.
// Deploy: supabase functions deploy ingest-report

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { chunkText, toVectorLiteral } from '../_shared/rag.ts'

// NOTE: Transformers.js is imported at RUNTIME via esm.sh, not bundled —
// the npm bundle (~100MB) exceeds Supabase's function deploy size limit.
// Cold starts fetch the library + model (~90MB) once, then stay warm.

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

// Lazily loaded + cached across warm invocations. First cold start fetches
// the Transformers.js runtime and the ~90MB model from CDNs — ingest is
// fire-and-forget from the client, so the UI never waits on it.
let extractorPromise: Promise<any> | null = null
function getExtractor(): Promise<any> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('https://esm.sh/@huggingface/transformers@3.5.0')
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    })()
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

    const { reportId, content } = await req.json()
    if (!reportId || typeof content !== 'string' || !content.trim()) {
      return json(req, { error: 'reportId and content are required' }, 400)
    }

    // Ownership check — users can only ingest their own reports
    const { data: report } = await supabase
      .from('reports')
      .select('id')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single()
    if (!report) return json(req, { error: 'report not found' }, 404)

    const chunks = chunkText(content.slice(0, 30000))
    if (chunks.length === 0) return json(req, { chunks: 0 })

    const extractor = await getExtractor()
    const rows = []
    for (let i = 0; i < chunks.length; i++) {
      const out = await extractor(chunks[i], { pooling: 'mean', normalize: true })
      rows.push({
        report_id: reportId,
        user_id: user.id,
        chunk_index: i,
        content: chunks[i],
        embedding: toVectorLiteral(out.data),
      })
    }

    // Idempotent re-ingest: replace any previous chunks for this report
    await supabase.from('report_chunks').delete().eq('report_id', reportId).eq('user_id', user.id)
    const { error } = await supabase.from('report_chunks').insert(rows)
    if (error) throw error

    return json(req, { chunks: rows.length })
  } catch (err) {
    return json(req, { error: String(err) }, 500)
  }
})
