# Traction — Analytics Plan & Fake-Door Testing

> Honest status (2026-09-27): **zero measured users, zero revenue.** Everything below is the instrument panel for earning the first ones — not a report of having them.

## Analytics setup

1. **Vercel Analytics** — the one-liner. Install and mount once:

   ```bash
   npm install @vercel/analytics
   ```

   ```jsx
   // src/App.jsx (inside <BrowserRouter>)
   import { Analytics } from '@vercel/analytics/react'
   // ...
   <Analytics />
   ```

   > Requires Rithin to run `npm install` locally — noted in `docs/launch-checklist.md`.

2. **Product events** — `src/lib/analytics.js` → `track(event, props)`. Console in dev, pluggable endpoint via `VITE_ANALYTICS_ENDPOINT`. All events are PII-free by construction (blocked keys are scrubbed).

## Canonical events

| Event | When | Props (PII-free) |
|---|---|---|
| `report_uploaded` | Upload succeeds | `report_type`, `language`, `source: camera\|paste\|file` |
| `summary_generated` | AI summary rendered | `language`, `format_check: pass\|fail`, `latency_ms` |
| `doctor_link_created` | Share link generated | `expiry_hours: 24\|48` |
| `family_member_added` | Family member added | `country` |
| `waitlist_joined` | Waitlist form submitted | `role`, `country` |

Wire these into the existing pages where the actions already happen (UploadReport, AISummary, DoctorShare, FamilyDashboard, Waitlist). The helper exists; the call sites are a small follow-up.

## Fake-door testing

The waitlist (`/waitlist`, table `supabase/migrations/*_waitlist.sql`) is the fake door:

- **Patient/family demand:** `/waitlist` signups with role + country. Target: 50 signups before building anything new.
- **Hospital demand:** a "I'm a hospital" role option on the same form. Even 3 hospital-side signups justify the first pilot conversation.
- **Rules:** never fake a feature that doesn't exist behind the door; the waitlist promises "early access," nothing more. Every signup gets a real reply when access opens.

## The only metric that matters right now

**10 real people using it weekly.** Not signups — weekly active users who uploaded or viewed a report. Get there via friends, family, and anyone managing a parent's health. Watch them use it on a screen-share; fix only what blocks them. (Targets, not results.)
