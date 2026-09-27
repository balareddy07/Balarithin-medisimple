// Minimal telemetry: logEvent(name, props), reportError(err, ctx).
//
// PRIVACY RULE (hard): never log report text, summaries, or PII.
// Props are scrubbed against BLOCKED_KEYS before anything leaves the client.
// In dev, events go to the console. In production they go to
// VITE_TELEMETRY_ENDPOINT when set — otherwise they are dropped silently.
// No report content, no names, no contact details: event names + counts only.

const BLOCKED_KEYS = [
  'text', 'content', 'report', 'summary', 'email', 'phone', 'name',
  'address', 'dob', 'dateOfBirth', 'ssn', 'aadhaar', 'password', 'token',
  'file', 'image', 'transcript',
]

const endpoint = import.meta.env.VITE_TELEMETRY_ENDPOINT
const isDev = import.meta.env.DEV

function scrub(props) {
  const clean = {}
  for (const [k, v] of Object.entries(props || {})) {
    if (BLOCKED_KEYS.includes(k)) {
      if (isDev) console.warn(`[telemetry] dropped blocked prop "${k}" — never log PII or report content`)
      continue
    }
    clean[k] = v
  }
  return clean
}

function send(payload) {
  if (!endpoint) return
  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => { /* telemetry must never break the app */ })
  } catch {
    /* telemetry must never break the app */
  }
}

export function logEvent(name, props = {}) {
  const clean = scrub(props)
  if (isDev) console.debug('[telemetry]', name, clean)
  send({ kind: 'event', name, props: clean, ts: new Date().toISOString() })
}

export function reportError(err, ctx = {}) {
  const message = err instanceof Error ? err.message : String(err)
  const clean = scrub(ctx)
  if (isDev) console.error('[telemetry:error]', message, clean)
  send({ kind: 'error', message, ctx: clean, ts: new Date().toISOString() })
}
