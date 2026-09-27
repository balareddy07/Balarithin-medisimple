# Privacy Checklist — Pre-Launch Review

Complete every item before the first real user. Check the box only with evidence (link the commit, query result, or screenshot).

## Data minimization

- [ ] The app collects only what a feature needs: reports, vitals, meds, contact for auth. No location tracking, no ad SDKs.
- [ ] Synthetic seed data (`scripts/seed-synthetic.mjs`) is labeled and never touches production tables.
- [ ] No real patient data in repos, docs, screenshots, or demo videos.

## Consent & transparency

- [ ] `/legal/:doc` privacy policy is live, readable at 16px+, and written in plain language.
- [ ] Policy states: what is collected, why, how long it's kept, how to delete it, and that summaries are AI-generated wellness information, not medical advice.
- [ ] Signup shows the wellness disclaimer (already in README; must be in the app too).

## Access control

- [ ] RLS enabled on 100% of public tables (verification query in `docs/security.md` returns zero rows).
- [ ] `waitlist` table: public insert only, no public read (see migration).
- [ ] Doctor share links expire in 24/48h; tokens are 256-bit random (`generateShareToken`).

## AI & vendors

- [ ] `ANTHROPIC_API_KEY` is a Supabase secret only — `grep -r "sk-ant" src/ supabase/` returns nothing.
- [ ] Report text is PII-redacted before the Claude call (Edge Function port — see `docs/data-quality.md`).
- [ ] No report content in telemetry/analytics (scrubbed in `src/lib/telemetry.js`, `src/lib/analytics.js`).

## User rights

- [ ] Users can export their data (roadmap) — at minimum, document the manual process.
- [ ] Users can delete their account and data (roadmap) — at minimum, document the manual process until the `/profile` flow ships.

## Operational

- [ ] Error pages reveal no stack traces (`src/components/ErrorBoundary.jsx`).
- [ ] `.env` is gitignored; `.env.example` contains no real values.
- [ ] Incident runbook exists: who gets paged, how to rotate the Claude key, how to revoke share tokens.
