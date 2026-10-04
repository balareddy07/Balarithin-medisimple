# Demo script — "Ask my reports" (3 minutes)

All data below is **synthetic**, clearly labeled, for demonstration only.

## Setup (before the demo)

1. `supabase db push` — applies the pgvector + `report_chunks` migration.
2. `supabase functions deploy ingest-report` and `supabase functions deploy ask-reports`.
3. Log in to the app as your demo user.

## The synthetic report (paste into Upload → Paste Text)

```
CITYCARE DIAGNOSTICS — LIPID PROFILE
*** SYNTHETIC DEMO DATA — NOT A REAL PATIENT ***

Patient: Demo Patient | Age: 45 | Date: 02-Oct-2026 | Sample: Fasting

TEST RESULT              VALUE        REFERENCE
Total Cholesterol        228 mg/dL    Desirable: < 200 mg/dL
HDL Cholesterol           42 mg/dL    Desirable: > 60 mg/dL
LDL Cholesterol          148 mg/dL    Optimal: < 100 mg/dL
Triglycerides            190 mg/dL    Normal: < 150 mg/dL
VLDL                      38 mg/dL    Normal: 2-30 mg/dL

Impression: Elevated LDL and triglycerides; low HDL.
```

## Minute 0:00–0:30 — Upload

- Paste the report above, hit **Summarise in Simple Language**.
- Say: *"The report is saved, and in the background it's chunked and embedded into pgvector — about ten seconds, fire-and-forget."*
- Go to **My Reports** → tap the new **💬 Ask my reports** button.

## Minute 0:30–1:30 — Question 1: single-fact lookup

Ask: **"What was my LDL cholesterol?"**

- The answer comes back with a **[1]** citation.
- Tap through: the source card shows the report name, the date, and the exact excerpt — *"LDL Cholesterol 148 mg/dL Optimal: < 100 mg/dL"*.
- Say: *"It didn't answer from general knowledge. It retrieved the passage and cited it."*

## Minute 1:30–2:30 — Question 2: synthesis across chunks

Ask: **"Which of my values are outside the normal range?"**

- The answer lists LDL, triglycerides, HDL, and VLDL — each claim cited **[1] [2] [3]** to different chunks.
- Say: *"Four facts, four citations, each traceable to the report text."*

## Minute 2:30–3:00 — The guardrail

Ask: **"What should I take for this?"**

- The model refuses to prescribe and shows the safety disclaimer.
- Then ask: **"What was my blood sugar?"** (not in the report)
- The UI shows *"Not in your reports"* — it says what's missing instead of guessing.
- Close: *"Lookup aid, not a doctor. Every answer ends with 'verify with a healthcare professional.'"*

## If something goes wrong live

- **"Not in your reports" on Q1:** the ingest hadn't finished — wait ~30s (first embed downloads the model) and ask again.
- **Empty Ask page:** upload the report first; only newly uploaded reports are indexed (pre-migration uploads need a re-upload).
