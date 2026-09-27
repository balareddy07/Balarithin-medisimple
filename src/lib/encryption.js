// AES-GCM encryption for health data at rest using Web Crypto API.
// The encryption key is derived from the user's UID via PBKDF2 (100k rounds).
// Honest scope: this protects against casual database reads, NOT against an
// attacker who knows the UID. True per-user secrets require a server-side
// key service (see docs/security.md residual risks).

const ALGO = { name: 'AES-GCM', length: 256 }

async function deriveKey(password) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('medisimple-salt-v1'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    ALGO,
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(plaintext, userId) {
  const key = await deriveKey(userId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(ciphertextB64, userId) {
  const key = await deriveKey(userId)
  const combined = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const dec = new TextDecoder()
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return dec.decode(plainBuf)
}

// Generate a shareable encrypted token for doctor links
export function generateShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
