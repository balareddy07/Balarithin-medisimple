import { describe, it, expect } from 'vitest'
import {
  validateReportInput,
  redactPII,
  checkSummaryFormat,
  MAX_FILE_SIZE_BYTES,
  MIN_TEXT_LENGTH,
  ALLOWED_MIME_TYPES,
} from './reportQuality.js'

const goodText = 'HbA1c report dated 2026-09-20. Patient fasting glucose 135 mg/dL, ' +
  'postprandial 178 mg/dL. HbA1c 7.2 percent, above the target range of below 7. ' +
  'Lipid panel within normal limits. Advised repeat testing in three months.'

const goodSummary = [
  '📋 Overview',
  'Your blood sugar report shows HbA1c slightly above the target range.',
  '',
  '🔍 Key Findings',
  '• HbA1c is 7.2%, in the diabetic range.',
  '• Fasting glucose is 135 mg/dL.',
  '• Post-meal glucose is 178 mg/dL.',
  '• Lipids look normal.',
  '',
  '📌 Next Steps',
  '1. Talk to your doctor about the HbA1c result.',
  '2. Check fasting sugar twice a week.',
  '3. Walk 30 minutes after dinner.',
  '',
  '💡 Simple Explanation',
  'HbA1c shows average sugar over three months. Yours is a little high, which means daily sugar has been running above target.',
  '',
  'Please consult your doctor.',
].join('\n')

describe('validateReportInput', () => {
  it('accepts valid pasted text', () => {
    expect(validateReportInput({ text: goodText }).ok).toBe(true)
  })

  it('accepts a valid file', () => {
    const r = validateReportInput({ fileMeta: { size: 1024, type: 'application/pdf' } })
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })

  it('rejects empty input', () => {
    const r = validateReportInput({})
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })

  it('rejects text below minimum length', () => {
    const r = validateReportInput({ text: 'too short' })
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toContain(String(MIN_TEXT_LENGTH))
  })

  it('rejects oversized files', () => {
    const r = validateReportInput({ fileMeta: { size: MAX_FILE_SIZE_BYTES + 1, type: 'application/pdf' } })
    expect(r.ok).toBe(false)
  })

  it('rejects unsupported mime types', () => {
    const r = validateReportInput({ fileMeta: { size: 100, type: 'application/x-msdownload' } })
    expect(r.ok).toBe(false)
  })

  it('accepts every allowed mime type', () => {
    for (const type of ALLOWED_MIME_TYPES) {
      expect(validateReportInput({ fileMeta: { size: 10, type } }).ok).toBe(true)
    }
  })
})

describe('redactPII', () => {
  it('masks email addresses', () => {
    expect(redactPII('contact me at rajesh@example.com please')).toContain('[email redacted]')
  })

  it('masks phone numbers with country codes', () => {
    expect(redactPII('call +91 98765 43210')).toContain('[phone redacted]')
    expect(redactPII('call (415) 555-0132')).toContain('[phone redacted]')
  })

  it('masks SSN-like patterns', () => {
    expect(redactPII('ssn 123-45-6789')).toContain('[id redacted]')
  })

  it('leaves lab values intact', () => {
    const text = 'HbA1c 7.2%, fasting glucose 135 mg/dL, BP 128/82'
    expect(redactPII(text)).toBe(text)
  })

  it('passes non-strings through unchanged', () => {
    expect(redactPII(null)).toBe(null)
    expect(redactPII(42)).toBe(42)
  })
})

describe('checkSummaryFormat', () => {
  it('accepts a well-formed summary', () => {
    const r = checkSummaryFormat(goodSummary)
    expect(r.ok).toBe(true)
    expect(r.missing).toEqual([])
  })

  it('flags a missing disclaimer', () => {
    const r = checkSummaryFormat(goodSummary.replace('Please consult your doctor.', ''))
    expect(r.ok).toBe(false)
    expect(r.missing).toContain('doctor disclaimer')
  })

  it('flags too few bullets', () => {
    const r = checkSummaryFormat('Overview\n• one thing\nPlease consult your doctor.')
    expect(r.ok).toBe(false)
    expect(r.missing).toContain('key findings (3-5 bullets)')
  })

  it('rejects empty input with all sections missing', () => {
    const r = checkSummaryFormat('')
    expect(r.ok).toBe(false)
    expect(r.missing.length).toBeGreaterThanOrEqual(4)
  })
})
