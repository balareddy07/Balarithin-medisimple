<div align="center">

# MediSimple

**Turns confusing medical reports into plain-language summaries — in 11 languages, free for patients.**

[Live Demo](https://medisimple-neon.vercel.app)

![CI](https://github.com/Balarithin/medisimple/actions/workflows/ci.yml/badge.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel&logoColor=white)

</div>

> ⚠️ General wellness tool. MediSimple does not diagnose, treat, or provide clinical-grade readings, and is not a substitute for professional medical care. In an emergency, call 911.

## The problem

Cross-border families are underserved by health tech. US health apps assume one household, one language, one pharmacy network. Nobody builds for the ~40M+ US immigrants who are the primary health decision-makers for a parent abroad — different phone formats, different pharmacy networks, different languages, no shared doctor, and no single place holding the parent's medical history.

MediSimple's bet: **the defensible product is the history, not the device.** Ingest reports and prescriptions first, establish a personal baseline, then layer live vitals on top. Hardware comes later, once software demand is proven.

## Features

| Feature | Description |
|---|---|
| 📄 Report upload + AI summary | Upload a lab report or prescription; a Supabase Edge Function calls Claude for a plain-language summary |
| 🌍 Family Bridge | Cross-border family dashboard — each side reads in their own language |
| 💓 Vitals & device simulator | Manual vitals entry today; CGM/band simulators to prototype hardware without shipping it |
| 🫀 ECG analysis | Wellness-tier rhythm feedback (never diagnostic language) |
| 🔗 Doctor share links | Tokenized, expiring links so a doctor can view a record with no login |
| 🛂 Health passport | Portable summary of a patient's full medical history |
| 💊 Medications & pharmacy | Medication tracking plus pharmacy lookup |
| 💬 WhatsApp bot | Messaging-based access for less tech-comfortable family members |
| 🩺 Consultation | In-app consult flow between patient and doctor |

## Tech stack

- **Frontend:** React 18, React Router, Tailwind CSS, Vite
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions in Deno)
- **AI:** Anthropic Claude — called only server-side from an Edge Function; the API key never reaches the client
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
Supabase DB (PostgreSQL) + Storage
        ↓
Edge Functions (Deno): summarize / consult
        ↓
Claude API (Anthropic)
```

Database schema and migrations live in [`supabase/schema.sql`](supabase/schema.sql) and [`supabase/migrations`](supabase/migrations).

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

You need a Supabase project with the schema applied and the `summarize`/`consult` Edge Functions deployed, with `ANTHROPIC_API_KEY` set as a Supabase secret (never as a frontend env var):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## Project structure

```
medisimple/
├── public/               # PWA manifest, icons, service worker
├── src/
│   ├── components/       # UI components
│   ├── pages/            # Route pages
│   ├── contexts/         # React contexts (auth, etc.)
│   └── lib/              # encryption, telemetry, report quality helpers
├── supabase/
│   ├── functions/        # Edge Functions: summarize, consult
│   └── migrations/       # Postgres migrations
├── docs/                 # Business case, architecture, security, launch runbook
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
| `npm run ms:funcs` | Deploy `summarize` + `consult` Edge Functions |
| `npm run ms:secret` | Set `ANTHROPIC_API_KEY` as a Supabase secret from `.env` |

## Documentation

The [`docs/`](docs/) folder carries the full companion material: business case, scale plan, data quality & PII policy, architecture diagram, launch checklist, analytics plan, market & competitor analysis, moat, threat model, privacy checklist, and production roadmap.

## Product principles

1. **History-first, not device-first** — baselines come from real records before any live reading is judged.
2. **Wellness, not diagnosis** — FDA general-wellness-safe language everywhere until formal clearance is pursued.
3. **Software before hardware** — device integrations are simulated so the product validates before capital-intensive hardware.
4. **Built for the cross-border family**, not the single-household user most US health apps assume.

## Status

- ✅ Core patient flows: upload, AI summary, medications, pharmacy, health passport
- ✅ Family Bridge cross-border dashboard
- ✅ Doctor share links, hospital admin view, CI-tested (38/38)
- 🚧 Real device integrations (currently simulated)
- 🚧 Production traction metrics — zero measured users as of 2026-09-27

## License

Proprietary — all rights reserved.
