# Data Quality — What Gets Validated Where

Health data is messy: blurry photos, half-pasted PDFs, 40MB scans from a hospital printer. MediSimple validates in three layers so bad input fails fast and kindly, and PII never reaches the AI vendor.

## Layer 1 — Client pre-check (instant)

`src/lib/reportQuality.js` → `validateReportInput({ text, fileMeta })`

- At least one of pasted text or a file is required.
- Text: 50–200,000 characters. Below 50 is almost certainly an accident ("test", a fragment).
- Files: max 10 MB; allowed types PDF, JPG, PNG, WEBP, TXT.
- Pure function, no network — target < 200 ms (see `docs/scale.md`).
- Covered by `src/lib/reportQuality.test.js` and adversarial cases in `src/lib/validation.test.js`.

## Layer 2 — Edge Function (authoritative)

`supabase/functions/summarize` must re-run the same checks server-side — client validation is UX, not security.

1. Re-validate size/type/length (never trust the client).
2. Run `redactPII()` on the text **before** sending it to Claude: emails, phone numbers, and SSN/Aadhaar-like ID patterns are masked.
3. Call Claude with the MediSimple format instruction.
4. Run `checkSummaryFormat()` on the response; if sections are missing, retry once, then store with a `format_check: failed` flag rather than showing a broken summary.

> TODO: the current `summarize` function predates these helpers. Port the logic (Deno-compatible — the helpers are dependency-free) before launch.

## Layer 3 — Storage (encrypted)

- Original report content is encrypted client-side with `src/lib/encryption.js` (AES-GCM-256, key derived per user) before it hits Supabase.
- Summaries are stored alongside, flagged with their format-check result.

## PII redaction policy

| Pattern | Action | Example |
|---|---|---|
| Email addresses | → `[email redacted]` | `name@example.com` |
| Phone numbers (≥10 digits, any common format) | → `[phone redacted]` | `+91 98765 43210`, `(415) 555-0132` |
| SSN-like `XXX-XX-XXXX` | → `[id redacted]` | `123-45-6789` |
| Aadhaar-like 12-digit groups | → `[id redacted]` | `2345 6789 0123` |

**Best-effort, not a guarantee.** Redaction is tuned to avoid false positives on lab values (`HbA1c 7.2%`, `BP 128/82`, `Metformin 500mg` are left intact — verified in tests). It is a defense-in-depth layer on top of encryption and RLS, not a substitute for them. Never log redacted *or* unredacted report text — see `src/lib/telemetry.js`.
