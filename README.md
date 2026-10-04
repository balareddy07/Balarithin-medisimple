<div align="center">

# MediSimple

**Turns confusing medical reports into plain-language summaries — in 11 languages, free for patients.**
**Now with "Ask my reports": ask questions about your own lab reports and get answers that cite the report.**

[Live Demo](https://medisimple-neon.vercel.app)

![CI](https://github.com/balareddy07/Balarithin-medisimple/actions/workflows/ci.yml/badge.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![pgvector](https://img.shields.io/badge/pgvector-RAG-336791?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel&logoColor=white)

</div>

> ⚠️ General wellness tool. MediSimple does not diagnose, treat, or provide clinical-grade readings, and is not a substitute for professional medical care. In an emergency, call 911.

## The problem

Cross-border families are underserved by health tech. US health apps assume one household, one language, one pharmacy network. Nobody builds for the ~40M+ US immigrants who are the primary health decision-makers for a parent abroad — different phone formats, different pharmacy networks, different languages, no shared doctor, and no single place holding the parent's medical history.

MediSimple's bet: **the defensible product is the history, not the device.** Ingest reports and prescriptions first, establish a personal baseline, then layer live vitals on top. Hardware comes later, once software demand is proven.

## What it does

- **📄 Report upload + AI summary** — Upload a lab report or prescription; a Supabase Edge Function calls Claude for a plain-language summary in 11 languages.
- **💬 Ask my reports (RAG)** — Ask questions about your *own* uploaded reports. Answers are retrieved from your report text via semantic search and every claim cites its source passage. The model cannot answer from general knowledge — if it's not in your reports, it says so.
- **🌍 Family Bridge** — Cross-border family dashboard — each side reads in their own language.
- **💓 Vitals & device simulator** — Manual vitals entry today; CGM/band simulators to prototype hardware without shipping it.
- **🫀 ECG analysis** — Wellness-tier rhythm feedback (never diagnostic language).
- **🔗 Doctor share links** — Tokenized, expiring links so a doctor can view a record with no login.
- **🛂 Health passport** — Portable summary of a patient's full medical history.
- **💊 Medications & pharmacy** — Medication tracking plus pharmacy lookup.
- **💬 WhatsApp bot** — Messaging-based access for less tech-comfortable family members.
- **🩺 Consultation** — In-app consult flow between patient and doctor.

## How "Ask my reports" works

A retrieval-augmented generation (RAG) loop scoped to each patient's own documents:

```
UploadReport.jsx ──(plaintext, fire-and-forget)──▶ ingest-report (edge fn)
                                                        │ chunk (~600 chars, overlap)
                                                        │ embed (all-MiniLM-L6-v2, 384d, in-function)
                                                        ▼
                                              report_chunks (pgvector)

AskReports.jsx ──(question)──▶ ask-reports (edge fn)
                                    │ embed question (same model)
                                    │ match_report_chunks RPC: cosine similarity, top 6, per-user only
                                    │ grounded prompt: answer ONLY from passages, cite [1] [2]…
                                    ▼
                              Claude → { answer, citations[] }
```

Design choices:

- **Grounded, not generative.** The answer prompt forbids outside knowledge. No passages → the UI says "Not in your reports" instead of guessing.
- **Per-user isolation.** The match RPC filters `user_id = auth.uid()` — you can never retrieve another patient's chunks. RLS on `report_chunks` as well.
- **Citations are first-class.** Every answer returns the report name, date, chunk index, and a text excerpt, rendered as source cards under the answer.
- **Ingest never blocks the UI.** Chunking + embedding run in the edge function, fired without awaiting from the upload flow. First cold start downloads the embedding model (~90MB); warm calls are fast.
- **No new API keys.** Embeddings run inside the edge function via Transformers.js; answers use the existing `ANTHROPIC_API_KEY` Supabase secret.

## Tech stack

- **Frontend:** React 18, React Router, Tailwind CSS, Vite
- **Backend:** Supabase (Postgres + pgvector, Auth, Storage, Edge Functions in Deno)
- **AI:** Anthropic Claude — called only server-side from Edge Functions; the API key never reaches the client
- **Embeddings:** all-MiniLM-L6-v2 via Transformers.js, running inside the Edge Functions (no external embedding API)
- **Payments:** Stripe (US), Razorpay (India)
- **Encryption:** client-side helpers (`src/lib/encryption.js`) encrypt sensitive fields before storage
- **Deployment:** Vercel

## Architecture

```
User's Phone / Browser
        ↓
React SPA (Vercel)
        ↓
Supabase Auth → JWT
        ↓
Supabase DB (PostgreSQL + pgvector) + Storage
        ↓
Edge Functions (Deno): summarize / consult / ingest-report / ask-reports
        ↓
Claude API (Anthropic) · Hugging Face (embedding model, edge-cached)
```

Database schema and migrations live in [`supabase/schema.sql`](supabase/schema.sql) and [`supabase/migrations`](supabase/migrations).

## API overview (Edge Functions)

| Function | Input | Output |
|---|---|---|
| `summarize` | `{ reportText, language }` | `{ summary, extracted_metrics, extracted_medications, cardiac_findings }` |
| `consult` | `{ mode: 'explain' \| 'drugs', text, language, patientContext }` | `{ result }` |
| `ingest-report` | `{ reportId, content }` | `{ chunks }` — chunks + embeds a report into `report_chunks` |
| `ask-reports` | `{ question, language, topK }` | `{ found, answer, citations[] }` — grounded answer with sources |

All functions verify the caller's JWT and scope every read/write to that user.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

Apply the schema (includes the pgvector migration for Ask-my-reports) and deploy the functions, with `ANTHROPIC_API_KEY` set as a Supabase secret (never as a frontend env var):

```bash
supabase db push
supabase functions deploy ingest-report
supabase functions deploy ask-reports
supabase functions deploy summarize
supabase functions deploy consult
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

> **Note:** reports uploaded *before* the RAG migration have no chunks. Re-upload them (or call `ingest-report` per report) to make them searchable. New uploads are indexed automatically.

## 3-minute demo

See [`docs/demo-ask-my-reports.md`](docs/demo-ask-my-reports.md) — upload a synthetic lipid report, ask two questions, show the citations.

## Project structure

```
medisimple/
├── public/               # PWA manifest, icons, service worker
├── src/
│   ├── components/       # UI components
│   ├── pages/            # Route pages (UploadReport, MyReports, AskReports, …)
│   ├── contexts/         # React contexts (auth, etc.)
│   └── lib/              # encryption, telemetry, report quality helpers
├── supabase/
│   ├── functions/        # Edge Functions: summarize, consult, ingest-report, ask-reports
│   │   └── _shared/      # Pure RAG helpers (chunking, prompt builder) — unit-tested
│   └── migrations/       # Postgres migrations (incl. pgvector + report_chunks)
├── docs/                 # Business case, architecture, security, launch runbook, demo script
├── scripts/              # Synthetic data generator, ops scripts
├── seed-data/            # Sample data for local dev
└── .github/workflows/    # CI: install → test → build
```

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Local dev server |
| `npm test` | Vitest suite |
| `npm run build` | Production build |
| `npm run ms:env` | Verify Node/npm/CLIs and `.env` keys |
| `npm run ms:install` | Install dependencies |
| `npm run ms:push` | Push Supabase migrations |
| `npm run ms:funcs` | Deploy all four Edge Functions |
| `npm run ms:secret` | Set `ANTHROPIC_API_KEY` as a Supabase secret from `.env` |

## Safety

- Ask-my-reports is a **lookup aid, not a diagnostic tool**. It answers only from the patient's own uploaded reports, never diagnoses, never prescribes.
- Every answer ends with a "verify with a healthcare professional" disclaimer, in the patient's language.
- The general-wellness banner at the top of this README applies to the whole product.

## Documentation

The [`docs/`](docs/) folder carries the full companion material: business case, scale plan, data quality & PII policy, architecture diagram, launch checklist, analytics plan, market & competitor analysis, moat, threat model, privacy checklist, and production roadmap.

## Product principles

1. **History-first, not device-first** — baselines come from real records before any live reading is judged.
2. **Wellness, not diagnosis** — FDA general-wellness-safe language everywhere until formal clearance is pursued.
3. **Software before hardware** — device integrations are simulated so the product validates before capital-intensive hardware.
4. **Built for the cross-border family**, not the single-household user most US health apps assume.

## Status

- ✅ Core patient flows: upload, AI summary, medications, pharmacy, health passport
- ✅ Ask my reports: RAG Q&A over uploaded reports with citations
- ✅ Family Bridge cross-border dashboard
- ✅ Doctor share links, hospital admin view, CI-tested
- 🚧 Real device integrations (currently simulated)
- 🚧 Production traction metrics — zero measured users as of 2026-09-27

## License

Proprietary — all rights reserved.
