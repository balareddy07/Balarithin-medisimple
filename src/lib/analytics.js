// PII-free product analytics wrapper.
// track(event, props): logs to console in dev; forwards to VITE_ANALYTICS_ENDPOINT
// when set. Props are scrubbed — analytics events carry counts and categories,
// never report text, names, emails, or phone numbers.
//
// Canonical events (see docs/traction.md):
//   report_uploaded, summary_generated, doctor_link_created,
//   family_member_added, waitlist_joined

const BLOCKED_KEYS = [
  'text', 'content', 'report', 'summary', 'email', 'phone', 'name',
  'address', 'dob', 'dateOfBirth', 'ssn', 'aadhaar', 'password', 'token',
]

const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT
const isDev = import.meta.env.DEV

function scrub(props) {
  const clean = {}
  for (const [k, v] of Object.entries(props || {})) {
    if (BLOCKED_KEYS.includes(k)) continue // silently drop PII-ish keys
    clean[k] = v
  }
  return clean
}

export function track(event, props = {}) {
  const clean = scrub(props)
  if (isDev) console.debug('[analytics]', event, clean)
  if (!endpoint) return
  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, props: clean, ts: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* analytics must never break the app */
  }
}
