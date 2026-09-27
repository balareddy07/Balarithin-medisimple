# Production Roadmap — The 10 Points

Status as of 2026-09-27. **Done** = file exists and is wired where it needs to be. **In progress** = file exists, integration pending. **Todo** = needs Rithin or future work.

| # | Point | Status | Evidence |
|---|---|---|---|
| 1 | Real problem in business terms | ✅ Done | `docs/business-case.md` |
| 2 | Evidence it works at scale | 🟡 In progress | `scripts/seed-synthetic.mjs` + `docs/scale.md` exist; targets defined, nothing measured yet |
| 3 | Production-grade engineering | 🟡 In progress | CI (`.github/workflows/ci.yml`), vitest config + 3 test suites, `reportQuality.js`, `telemetry.js`, `ErrorBoundary.jsx` exist; **Rithin must run `npm install` + `npx vitest run`** |
| 4 | Deployed, clickable artifact | 🟡 In progress | `docs/launch-checklist.md` runbook exists; **Rithin must run `vercel login` + `vercel --prod`** |
| 5 | Architecture documentation | ✅ Done | `docs/architecture.md` (mermaid) + README |
| 6 | Traction, even fake-door | 🟡 In progress | `waitlist` table migration, `/waitlist` page + route, `docs/traction.md`, `src/lib/analytics.js`; **needs first 10 real users** |
| 7 | Market/competitive awareness | ✅ Done | `docs/market.md` + README |
| 8 | Moat / defensibility angle | ✅ Done | `docs/moat.md` (mechanisms documented; spins only with usage) |
| 9 | Compliance/trust signals | 🟡 In progress | `docs/security.md` + `docs/privacy-checklist.md`; Edge Function port of quality helpers still todo |
| 10 | Founder narrative | 🟡 In progress | `docs/founder-story.md` template; **[NEEDS INPUT]** sections awaiting Rithin |

## Next actions for Rithin (in order)

1. `npm install` then `npx vitest run` — green tests.
2. `vercel login` + `vercel --prod` — live URL.
3. Run the launch checklist (`docs/launch-checklist.md`) end to end.
4. Get 10 real people on it; fill in the founder-story inputs.
5. Port quality helpers into `supabase/functions/summarize` (Deno) — see `docs/data-quality.md`.
