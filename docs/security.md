# Security — Threat Model, Controls, Residual Risks

> Wellness tool, not a medical device. Security posture must still be real: families trust MediSimple with their parents' health data.

## Threat model

| Threat | Impact | Likelihood |
|---|---|---|
| Supabase anon key abuse / token theft | Attacker reads another patient's rows | Medium — mitigated by RLS |
| PII in logs or AI vendor prompts | Emails/phones persist in Claude logs or app logs | Medium — mitigated by redaction + scrubbing |
| Encryption key management weakness | Key derivation is per-user-ID only; a leaked DB + known user IDs could allow offline decryption | Low-Medium — see residual risks |
| Doctor share link leakage | Anyone with the token views the record until expiry | Medium — mitigated by 24/48h expiry |
| Prompt injection via report text | Malicious report text steers the summary | Low — format check + disclaimer bound it |
| No audit trail | Can't answer "who viewed my record?" | Certain — roadmap item |

## Controls in place

- **RLS on all tables.** Verify:
  ```sql
  select tablename, rowsecurity
  from pg_tables
  where schemaname = 'public'
    and rowsecurity = false;
  -- must return zero rows
  ```
- **Client-side encryption helpers** (`src/lib/encryption.js`): AES-GCM-256, per-user derived key, random IV per encryption. Original report content stored as ciphertext.
- **Expiring doctor links** (`/doctor-share`, `/share/:token`): tokenized, 24/48-hour expiry, no login required for the viewer — so expiry is the *only* control. Keep it short.
- **Claude key server-side only**: `ANTHROPIC_API_KEY` is a Supabase secret used inside `summarize/`; never in the frontend bundle or `.env`.
- **PII redaction before AI calls** (`redactPII` in the Edge Function path — see `docs/data-quality.md`).
- **Telemetry/analytics scrubbing** (`src/lib/telemetry.js`, `src/lib/analytics.js`): blocked keys (report text, emails, phones, tokens) are stripped before anything leaves the client.
- **Friendly error boundaries** (`src/components/ErrorBoundary.jsx`): no stack traces to users.

## Residual risks (honest)

1. **Key derivation is UID-based**, not a user-held secret. Anyone with DB access *and* knowledge of the derivation scheme can decrypt. This is obfuscation-grade, not zero-knowledge. A proper per-user data key (e.g. derived from the auth session + a server pepper) is the upgrade path.
2. **No audit logging.** There is no record of who viewed or shared what. Required before any hospital pilot.
3. **No data retention/deletion flow.** Users can't yet export-then-delete their data. Needed for real trust and for regulations.
4. **No HIPAA BAA.** Fine for a general-wellness tool; mandatory the moment US clinical workflows or hospital PHI are in scope.
5. **The `summarize` Edge Function predates the quality helpers** — server-side re-validation + redaction must be ported (Deno) before launch.

## Roadmap

- [ ] Port `validateReportInput`/`redactPII`/`checkSummaryFormat` into `supabase/functions/summarize` (Deno)
- [ ] Audit log table: `record_views` (who/what/when) with RLS
- [ ] User data export + delete flow (`/profile`)
- [ ] Upgrade encryption key derivation (session-bound key, server pepper via Edge Function)
- [ ] HIPAA BAA with Supabase when pursuing US clinical/hospital PHI
- [ ] Annual third-party security review before hospital pilots
