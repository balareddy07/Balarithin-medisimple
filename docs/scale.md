# Scale & Load — How to Prove MediSimple Handles Real Volume

> All numbers below are **targets**, not measured results. Nothing here claims real users or real traffic.

## Generating synthetic load data

`scripts/seed-synthetic.mjs` generates clearly-labeled **synthetic** patients, reports, vitals, and medications as JSON. Seeded RNG = reproducible output.

```bash
# 50 synthetic patients (default)
node scripts/seed-synthetic.mjs

# 500 patients, custom seed, custom output
node scripts/seed-synthetic.mjs --count 500 --seed 7 --out seed-data/load-500.json
```

Flags:

| Flag | Default | Meaning |
|---|---|---|
| `--count` | `50` | Number of synthetic patients to generate |
| `--seed` | `42` | RNG seed — same seed always produces the same dataset |
| `--out` | `seed-data/synthetic.json` | Output path (created if missing) |

Every record carries `"synthetic": true`. **Never mix this output with real data, and never upload it to production tables.**

## Health targets

| Check | Target | Where it runs |
|---|---|---|
| `summarize` Edge Function p95 latency | < 8 s | Supabase dashboard → Edge Functions → Logs |
| Client-side upload validation | < 200 ms | `src/lib/reportQuality.js` (`validateReportInput`) — pure JS, no network |
| RLS policy coverage | 100% of tables | `supabase/schema.sql` + migrations; verify with the query in `docs/security.md` |
| Summary format conformance | 100% of AI summaries pass `checkSummaryFormat` | Edge Function post-check before saving |
| Client bundle size | < 500 kB gzipped | `npm run build` output |

## Throughput worksheet (targets)

Work the math before launch so "it works on my laptop" becomes a number:

```
Assumed pilot:            1 hospital × 1,000 active patients
Reports per patient/mo:   4  (labs, prescriptions, vitals batches)
Summaries per month:      1,000 × 4 = 4,000
Summaries per day:        4,000 / 30 ≈ 133
Average rate:             133 / 86,400 ≈ 0.0015 req/s
Peak (10× average):       ≈ 0.015 req/s to the summarize function

Claude tokens per summary (target):  ~1,500 in / ~400 out
Monthly token volume (pilot):        4,000 × 1,900 ≈ 7.6M tokens
```

At pilot scale the Edge Function tier is not the constraint — Claude latency and per-token cost are. Revisit this worksheet at 10× and 100× pilot scale; the bottleneck to watch is concurrent Edge Function invocations during morning upload peaks (India 8–10am IST).

## What "healthy" looks like

- CI green on every push (`.github/workflows/ci.yml`).
- `npm run build` succeeds with no chunk over the budget above.
- Synthetic load of 500 patients ingests locally with no validation errors and every generated summary passes `checkSummaryFormat`.
- Supabase logs show zero RLS denials for legitimate flows and zero 5xx from Edge Functions during a synthetic soak.
