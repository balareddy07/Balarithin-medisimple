import { describe, it, expect } from 'vitest'
import { chunkText, buildAnswerPrompt } from '../../supabase/functions/_shared/rag.ts'

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    expect(chunkText('HbA1c: 7.2%')).toEqual(['HbA1c: 7.2%'])
  })

  it('returns [] for empty or whitespace-only text', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n  ')).toEqual([])
  })

  it('splits long text into bounded chunks', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} about the patient.`).join(' ')
    const chunks = chunkText(text, 200, 40)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(200)
    // no text lost: every sentence appears in at least one chunk
    for (let i = 0; i < 40; i++) {
      expect(chunks.some((c) => c.includes(`Sentence number ${i} `))).toBe(true)
    }
  })

  it('prefers sentence boundaries over mid-word cuts', () => {
    const text = 'A'.repeat(140) + '. Next sentence here. ' + 'y'.repeat(300)
    const chunks = chunkText(text, 200, 40)
    // sentence boundary sits past 40% of the window, so the first chunk
    // should end there instead of cutting mid-word into the y-run
    expect(chunks[0].endsWith('.')).toBe(true)
    expect(chunks[0]).toContain('Next sentence here.')
  })

  it('always advances (no infinite loop on pathological input)', () => {
    const text = 'a'.repeat(5000)
    const chunks = chunkText(text, 100, 90)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.length).toBeLessThan(1000)
  })
})

describe('buildAnswerPrompt', () => {
  it('embeds passages with numbered citations and the language', () => {
    const { system, user } = buildAnswerPrompt(
      'What was my HbA1c?',
      [{ n: 1, reportName: 'Rajesh', reportDate: '1 Oct 2026', text: 'HbA1c: 7.2%' }],
      'Hindi'
    )
    expect(user).toContain('[1]')
    expect(user).toContain('HbA1c: 7.2%')
    expect(system).toContain('Hindi')
    expect(system).toContain('ONLY')
    expect(system).toMatch(/not a doctor/i)
  })
})
