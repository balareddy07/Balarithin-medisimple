import { describe, it, expect } from 'vitest'
import { validateReportInput, redactPII, checkSummaryFormat } from './reportQuality.js'

// Adversarial + edge-case coverage for the quality helpers.
// These inputs must never crash the validators, and must never leak PII.

describe('validateReportInput — adversarial', () => {
  it('handles null/undefined input', () => {
    expect(validateReportInput(null).ok).toBe(false)
    expect(validateReportInput(undefined).ok).toBe(false)
    expect(validateReportInput().ok).toBe(false)
  })

  it('handles non-string text', () => {
    expect(validateReportInput({ text: 123 }).ok).toBe(false)
    expect(validateReportInput({ text: { evil: true } }).ok).toBe(false)
  })

  it('rejects whitespace-only text', () => {
    expect(validateReportInput({ text: '   \n\t  ' }).ok).toBe(false)
  })

  it('rejects oversized text', () => {
    expect(validateReportInput({ text: 'x'.repeat(200_001) }).ok).toBe(false)
  })

  it('does not reject script tags in text (validation is about shape, not content)', () => {
    const text = '<script>alert(1)</script> ' + 'lab report content '.repeat(10)
    // Must not throw; downstream rendering must escape, validation just checks length.
    expect(() => validateReportInput({ text })).not.toThrow()
  })

  it('rejects wrong mime types', () => {
    for (const type of ['application/x-sh', 'video/mp4', 'application/zip', 'text/html']) {
      expect(validateReportInput({ fileMeta: { size: 100, type } }).ok).toBe(false)
    }
  })

  it('accepts file without declared type (browser may omit it)', () => {
    expect(validateReportInput({ fileMeta: { size: 100 } }).ok).toBe(true)
  })

  it('accepts text + file together', () => {
    const r = validateReportInput({
      text: 'detailed report text '.repeat(10),
      fileMeta: { size: 5000, type: 'image/png' },
    })
    expect(r.ok).toBe(true)
  })
})

describe('redactPII — adversarial', () => {
  it('masks emails embedded in sentences', () => {
    const out = redactPII('My email is First.Last+tag@Example.COM, call me.')
    expect(out).not.toContain('@')
  })

  it('masks dotted phone formats', () => {
    expect(redactPII('ph: 415.555.0132 ext 5')).toContain('[phone redacted]')
  })

  it('does not mask short digit runs (dosages, lab values)', () => {
    expect(redactPII('Metformin 500mg twice daily')).toBe('Metformin 500mg twice daily')
    expect(redactPII('SpO2 97%')).toBe('SpO2 97%')
  })

  it('masks Aadhaar-like 12-digit IDs', () => {
    expect(redactPII('aadhaar 2345 6789 0123')).toContain('[id redacted]')
  })

  it('handles empty string', () => {
    expect(redactPII('')).toBe('')
  })
})

describe('checkSummaryFormat — adversarial', () => {
  it('handles null/undefined/objects', () => {
    for (const bad of [null, undefined, 42, { text: 'hi' }]) {
      const r = checkSummaryFormat(bad)
      expect(r.ok).toBe(false)
      expect(r.missing.length).toBeGreaterThan(0)
    }
  })

  it('is case-insensitive for the disclaimer', () => {
    const s = 'overview\n• a\n• b\n• c\nnext steps\n1. x\n2. y\n3. z\nexplanation\nPLEASE CONSULT YOUR DOCTOR.'
    // bullets ok, steps ok, but explanation heading present + disclaimer present
    const r = checkSummaryFormat(s)
    expect(r.missing).not.toContain('doctor disclaimer')
  })
})
