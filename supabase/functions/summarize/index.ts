// Supabase Edge Function — secure Claude AI proxy
// Deploy: supabase functions deploy summarize
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

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

// --- Server-side quality enforcement (mirrors src/lib/reportQuality.js) ---
const MAX_TEXT_LENGTH = 200_000
const MIN_TEXT_LENGTH = 50

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g
const AADHAAR_RE = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g
const PHONE_CANDIDATE_RE = /\+?[\d][\d\s().-]{7,20}\d/g

function redactPII(text: string): string {
  let out = text.replace(EMAIL_RE, '[email redacted]')
  out = out.replace(SSN_RE, '[id redacted]')
  out = out.replace(AADHAAR_RE, '[id redacted]')
  out = out.replace(PHONE_CANDIDATE_RE, (m) => {
    const digits = m.replace(/\D/g, '')
    return digits.length >= 10 ? '[phone redacted]' : m
  })
  return out
}

function validateReportText(reportText: unknown): string | null {
  if (typeof reportText !== 'string' || reportText.trim().length === 0) return 'Report text is required.'
  if (reportText.trim().length < MIN_TEXT_LENGTH) return `Report text is too short (minimum ${MIN_TEXT_LENGTH} characters).`
  if (reportText.length > MAX_TEXT_LENGTH) return `Report text is too long (maximum ${MAX_TEXT_LENGTH} characters).`
  return null
}

function checkSummaryFormat(summary: string): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  const lower = summary.toLowerCase()
  const lines = summary.split('\n')
  if (!/overview/.test(lower)) missing.push('overview')
  const bullets = lines.filter((l) => /^\s*[•\-\*]\s+/.test(l))
  if (bullets.length < 3 || bullets.length > 5) missing.push('key findings (3-5 bullets)')
  const hasNextStepsHeading = /next steps?/.test(lower)
  const numbered = lines.filter((l) => /^\s*\d+[.)]\s+/.test(l))
  if (!hasNextStepsHeading && numbered.length < 3) missing.push('next steps (3 items)')
  if (!/explanation/.test(lower)) missing.push('explanation')
  if (!/please consult your doctor/.test(lower)) missing.push('doctor disclaimer')
  return { ok: missing.length === 0, missing }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCORSHeaders(req) })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...getCORSHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const { reportText, language = 'en' } = await req.json()
    const langName = LANG_NAMES[language] || 'English'

    // Server-side validation: never trust the client
    const validationError = validateReportText(reportText)
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400, headers: { ...getCORSHeaders(req), 'Content-Type': 'application/json' }
      })
    }
    // Best-effort PII redaction before the report text leaves for Claude
    const safeReportText = redactPII(reportText)

    const prompt = `You are MediSimple AI. A patient has shared their medical report.

Respond with TWO parts separated by ---EXTRACTED_DATA_JSON---

PART 1: Write a plain language summary in ${langName} using EXACTLY this format:
📋 **Overview**
[One clear sentence about what kind of report this is and the overall picture]

🔍 **Key Findings**
• [Finding 1 with simple explanation]
• [Finding 2 with simple explanation]
• [Finding 3 with simple explanation]
• [More if relevant]

📌 **Next Steps**
1. [Practical action the patient should take]
2. [Practical action the patient should take]
3. [Practical action the patient should take]

💬 **Simple Explanation**
[2 sentences in very simple words, like explaining to a family member]

⚠️ Please consult your doctor before making any changes to your diet, lifestyle, or medication.

---EXTRACTED_DATA_JSON---
PART 2: Extract structured data as JSON (ALWAYS in English, regardless of language chosen):
{
  "report_type": "blood_test|cardiac_angiogram|prescription|ecg|xray|mri|general",
  "extracted_metrics": [
    { "name": "HbA1c", "value": "7.2", "unit": "%", "status": "high", "normal_range": "< 5.7" }
  ],
  "extracted_medications": [
    { "name": "Aspirin", "dose": "75mg", "frequency": "Once daily" }
  ],
  "cardiac_findings": [
    { "artery": "LAD", "finding_text": "Patent, no stenosis", "has_stent": false }
  ]
}

Rules for PART 2:
- Only include metrics explicitly stated in the report with numeric values
- Metric names must be standard: HbA1c, LDL, HDL, Triglycerides, Blood Sugar, Creatinine, Hemoglobin, Systolic BP, Diastolic BP, BMI, Vitamin D, TSH, Sodium, Potassium, Uric Acid, eGFR
- status: "normal" | "high" | "low" | "critical"
- If no metrics/medications/cardiac findings found, return empty arrays []
- cardiac_findings only for angiogram, catheterization, echo, stress test reports

Medical Report:
${safeReportText.slice(0, 8000)}`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error('Claude error:', err)
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502, headers: { ...getCORSHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const claude = await claudeRes.json()
    const fullText: string = claude.content[0].text

    // Split response into summary and structured JSON
    const splitMarker = '---EXTRACTED_DATA_JSON---'
    const splitIdx = fullText.indexOf(splitMarker)

    let summary = fullText
    let extractedMetrics: unknown[] = []
    let extractedMedications: unknown[] = []
    let cardiacFindings: unknown[] = []
    let reportType = 'general'

    if (splitIdx !== -1) {
      summary = fullText.slice(0, splitIdx).trim()
      try {
        const jsonPart = fullText.slice(splitIdx + splitMarker.length).trim()
        const match = jsonPart.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          extractedMetrics    = parsed.extracted_metrics    || []
          extractedMedications = parsed.extracted_medications || []
          cardiacFindings     = parsed.cardiac_findings     || []
          reportType          = parsed.report_type          || 'general'
        }
      } catch (e) {
        console.error('JSON parse error:', e)
      }
    }

    // Verify the summary follows the MediSimple format contract (warn, don't fail)
    const formatCheck = checkSummaryFormat(summary)
    if (!formatCheck.ok) console.warn('Summary format contract violated:', formatCheck.missing)

    // Log usage for billing
    await supabase.from('api_usage_log').insert({
      user_id: user.id,
      tokens_used: claude.usage?.output_tokens || 0,
      created_at: new Date().toISOString(),
    }).catch(() => {})

    return new Response(JSON.stringify({
      summary,
      extracted_metrics: extractedMetrics,
      extracted_medications: extractedMedications,
      cardiac_findings: cardiacFindings,
      report_type: reportType,
      format_ok: formatCheck.ok,
      format_missing: formatCheck.missing,
    }), {
      headers: { ...getCORSHeaders(req), 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...getCORSHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
