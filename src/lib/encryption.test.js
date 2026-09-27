import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, generateShareToken } from './encryption.js'

// Web Crypto (crypto.subtle) and btoa/atob are available in Node 18+,
// so the browser-oriented encryption helpers test as-is.

describe('encryption round-trip', () => {
  it('decrypts what it encrypts for the same user', async () => {
    const cipher = await encrypt('HbA1c 7.2% — synthetic test', 'user-123')
    expect(typeof cipher).toBe('string')
    expect(await decrypt(cipher, 'user-123')).toBe('HbA1c 7.2% — synthetic test')
  })

  it('round-trips empty strings', async () => {
    const cipher = await encrypt('', 'user-123')
    expect(await decrypt(cipher, 'user-123')).toBe('')
  })

  it('round-trips unicode (Tamil/Hindi sample)', async () => {
    const text = 'சர்க்கரை அளவு அதிகம் — चीनी अधिक है'
    const cipher = await encrypt(text, 'user-123')
    expect(await decrypt(cipher, 'user-123')).toBe(text)
  })

  it('fails to decrypt with a different user id', async () => {
    const cipher = await encrypt('secret report', 'user-123')
    await expect(decrypt(cipher, 'user-456')).rejects.toThrow()
  })

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    const a = await encrypt('same text', 'user-123')
    const b = await encrypt('same text', 'user-123')
    expect(a).not.toBe(b)
  })
})

describe('generateShareToken', () => {
  it('returns a 64-char hex token', () => {
    const t = generateShareToken()
    expect(t).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates unique tokens', () => {
    expect(generateShareToken()).not.toBe(generateShareToken())
  })
})
