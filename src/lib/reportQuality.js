// Client-side data quality helpers for MediSimple.
// Pure functions: no DOM, no network, no secrets — safe to unit test in Node.
//
// Validation pipeline (see docs/data-quality.md):
//   1. client pre-check  -> validateReportInput()   (instant feedback, <200ms target)
//   2. edge function     -> re-validates + redactPII() before calling Claude
//   3. storage           -> encrypted at rest via src/lib/encryption.js

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
// A real lab report is never 2 sentences; 50 chars keeps paste-box spam out
// while staying friendly to short prescriptions.
export const MIN_TEXT_LENGTH = 50
export const MAX_TEXT_LENGTH = 200_000

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]

/**
 * validateReportInput({ text, fileMeta }) -> { ok, errors[] }
 * text: pasted/OCR'd report text. fileMeta: { size, type } from the File object.
 * At least one of text or fileMeta is required.
 */
export function validateReportInput(input) {
  const errors = []
  const { text, fileMeta } = input || {}
  const hasText = typeof text === 'string' && text.trim().length > 0
  const hasFile = fileMeta != null && typeof fileMeta === 'object'

  if (!hasText && !hasFile) {
    errors.push('Provide report text or upload a file.')
    return { ok: false, errors }
  }

  if (text != null && typeof text !== 'string') {
    errors.push('Report text must be a string.')
  } else if (hasText) {
    if (text.trim().length < MIN_TEXT_LENGTH) {
      errors.push(`Report text is too short (minimum ${MIN_TEXT_LENGTH} characters).`)
    }
    if (text.length > MAX_TEXT_LENGTH) {
      errors.push(`Report text is too long (maximum ${MAX_TEXT_LENGTH} characters).`)
    }
  }

  if (hasFile) {
    const { size, type } = fileMeta
    if (typeof size === 'number' && size > MAX_FILE_SIZE_BYTES) {
      errors.push('File is larger than 10 MB.')
    }
    if (type && !ALLOWED_MIME_TYPES.includes(type)) {
      errors.push(`File type "${type}" is not supported. Use PDF, JPG, PNG, WEBP, or TXT.`)
    }
  }

  return { ok: errors.length === 0, errors }
}

// --- PII redaction (best-effort; see docs/data-quality.md for policy) ---
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g
const AADHAAR_RE = /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g
// Phone candidates: digit-led runs with common separators; confirmed by digit count.
const PHONE_CANDIDATE_RE = /\+?[\d][\d\s().-]{7,20}\d/g

/**
 * redactPII(text) -> text with emails, phone numbers, and SSN/Aadhaar-like
 * ID numbers masked. Best-effort: designed to avoid masking lab values
 * (e.g. "HbA1c 7.2%", "BP 128/82" are left intact).
 */
export function redactPII(text) {
  if (typeof text !== 'string') return text
  let out = text.replace(EMAIL_RE, '[email redacted]')
  out = out.replace(SSN_RE, '[id redacted]')
  out = out.replace(AADHAAR_RE, '[id redacted]')
  out = out.replace(PHONE_CANDIDATE_RE, (m) => {
    const digits = m.replace(/\D/g, '')
    return digits.length >= 10 ? '[phone redacted]' : m
  })
  return out
}

/**
 * checkSummaryFormat(summary) -> { ok, missing[], bulletCount }
 * Verifies an AI summary follows the MediSimple format contract:
 * overview, 3-5 key-finding bullets, 3 next steps, simple explanation,
 * and the "Please consult your doctor" closing.
 */
export function checkSummaryFormat(summary) {
  const missing = []
  const s = typeof summary === 'string' ? summary : ''
  const lower = s.toLowerCase()
  const lines = s.split('\n')

  if (!/overview/.test(lower)) missing.push('overview')

  const bullets = lines.filter((l) => /^\s*[•\-\*]\s+/.test(l))
  if (bullets.length < 3 || bullets.length > 5) missing.push('key findings (3-5 bullets)')

  const hasNextStepsHeading = /next steps?/.test(lower)
  const numbered = lines.filter((l) => /^\s*\d+[.)]\s+/.test(l))
  if (!hasNextStepsHeading && numbered.length < 3) missing.push('next steps (3 items)')

  if (!/explanation/.test(lower)) missing.push('explanation')
  if (!/please consult your doctor/.test(lower)) missing.push('doctor disclaimer')

  return { ok: missing.length === 0, missing, bulletCount: bullets.length }
}
