# Moat — Why This Gets Harder to Copy Over Time

> A moat is earned, not declared. Every item below is a *mechanism* that only works if real usage flows through it. Status (2026-09-27): mechanisms built, usage not yet present.

## 1. The personal-baseline data flywheel

Every report ingested deepens one person's baseline: their normal HbA1c band, their usual BP range, their medication history. The 100th reading for a patient is judged against 99 of *their own* prior readings.

A competitor starting tomorrow has zero baselines. Their alerts are textbook ranges — noisy, ignorable. Ours get quieter and more accurate the longer a patient stays. **Time in the product is the moat**, and it can't be bought or cloned, only accumulated.

## 2. Switching cost = your history

Exporting MediSimple means abandoning the baseline. A new app would need months of re-ingestion to reproduce what the patient already has: the longitudinal record, the family sharing rules, the doctor share history. The Health Passport (`/health-passport`) makes the record portable *for care* (one link to any doctor) while the *understanding layer* — the baseline — stays.

## 3. The family graph as distribution

MediSimple is built for two users from day one: the patient and the family member abroad. Every active patient pulls in at least one family monitor — who then pulls in *their* parents, in-laws, and friends managing the same problem. This is distribution that doesn't look like marketing: it looks like a daughter in Dallas inviting her brother to watch their father's readings.

Clinician AI tools sell top-down to hospitals. Wearables sell one device to one wrist. Neither gets the family graph for free.

## 4. Language + corridor depth

Each language supported and each care corridor served (US→India today) is operational depth — pharmacy mappings, report format quirks, WhatsApp-first UX for low-tech-comfort users — that a generic entrant has to re-learn per market.

## What would kill the moat

- Treating summaries as the product instead of the history. Summaries are table stakes; any competent team can call the same API.
- Losing trust once: a PII leak or a hallucinated clinical claim unwinds the family graph faster than any competitor could.
- Building hardware before the software flywheel spins (README principle #3 exists for this reason).
