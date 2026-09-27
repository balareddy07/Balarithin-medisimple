# MediSimple — Business Case

> One page: who loses money today, and how MediSimple earns the right to fix it.

## Who loses money today

**Hospitals (India + US)**
- Preventable readmissions for chronic conditions (diabetes, cardiac) — expensive beds, penalties, and reputation cost.
- No-show follow-ups: a patient who didn't understand their discharge summary doesn't come back until it's an emergency.
- Poor discharge comprehension is the root cause: reports are written for clinicians, not for a 60-year-old patient reading in Tamil or Hindi.

**Families**
- Duplicate tests: when records don't travel with the patient, every new doctor re-orders the same labs.
- Medical travel and emergency-driven care: the daughter in Dallas finds out something was wrong only after it becomes a crisis — flights, ER bills, lost work.
- Coordination tax: the adult child spends hours on calls translating reports for a parent abroad.

**Patients**
- The folded report in the drawer: a lab report nobody understands changes no behavior.

## How MediSimple attacks it

1. **History-first record.** Every uploaded report, prescription, and vital deepens a personal baseline. New readings are judged against *this person's* history, not a textbook range — so alerts are rare and real.
2. **Plain-language summaries in the patient's language.** Claude turns a lab report into: one-sentence overview, 3–5 key findings, 3 next steps, a simple explanation, and a "Please consult your doctor" close. Comprehension goes up; no-shows and readmissions have a reason to go down.
3. **Family graph by design.** The decision-maker abroad sees what matters, in their language, without the patient having to forward PDFs on WhatsApp.
4. **One link for any doctor.** Expiring, tokenized share links mean the record travels even when the patient can't.

## Pricing logic

- **Patients: free, forever.** No payment screen is ever shown to a patient — this is a product principle, not a launch promo.
- **Hospitals: monthly fee per active patient.** An "active patient" = a patient with at least one record interaction (upload, summary, share) in the billing month.
  - India: billed in INR via **Razorpay**.
  - USA: billed in USD via **Stripe**.
  - Exact per-patient price is **TBD** — to be set after the first hospital pilots report real usage and willingness to pay. (Target: priced below the cost of one avoided duplicate test panel per patient per month.)

## Honest status (2026-09-27)

- No hospital customers yet. No revenue yet.
- The numbers above are **targets and reasoning**, not measured results.
- The waitlist (`/waitlist`) is the instrument for fake-door demand testing before any pricing is finalized.
