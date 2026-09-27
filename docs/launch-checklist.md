# Launch Checklist — The Exact Runbook to Go Live

> Steps marked **[USER TERMINAL]** must be run by Rithin in his own terminal — they need interactive logins this environment can't perform.

## Pre-flight (any terminal)

- [ ] `npm ci` — clean install from the lockfile
- [ ] `npx vitest run` — all tests green (see `vitest.config.js`)
- [ ] `npm run build` — production bundle builds with no errors
- [ ] Copy `.env.example` → `.env` and fill in: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Never put `ANTHROPIC_API_KEY` in `.env` — it is server-side only (next section)

## 1. Database

```bash
supabase db push
```

Applies `supabase/migrations/*`, including the `waitlist` table. Verify in the Supabase dashboard → Table Editor that all tables exist and RLS is enabled (see `docs/security.md` for the verification query).

## 2. Edge Functions

```bash
supabase functions deploy summarize && supabase functions deploy consult
```

## 3. Secrets (server-side only)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

The Claude key lives as a Supabase secret — the browser bundle must never contain it. Double-check with: `supabase secrets list`.

## 4. Deploy the frontend — [USER TERMINAL]

```bash
vercel login
vercel --prod
```

`vercel login` is interactive (browser SSO) and **must** be run by Rithin. After the first deploy, set in the Vercel dashboard → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |

Then redeploy so the production build picks them up.

## 5. Post-deploy smoke test (real phone, cellular — not localhost)

- [ ] Sign up → confirm the auth flow works
- [ ] Upload a report → summary returns in the selected language
- [ ] Summary passes the format check (overview, bullets, next steps, explanation, disclaimer)
- [ ] Doctor share link: generate → open in an incognito window → expires correctly
- [ ] `/waitlist` accepts a signup and the row lands in the `waitlist` table
- [ ] Hospital admin demo view renders

## 6. Flip the switches

- [ ] Turn on email confirmation in Supabase Auth; customize the confirmation email template (don't ship the default)
- [ ] Add Vercel Analytics (`<Analytics />` one-liner — see `docs/traction.md`)
- [ ] Point the domain at Vercel (e.g. `medisimple.health`)

## Rollback

- Frontend: Vercel dashboard → Deployments → promote the previous deployment.
- Functions: `supabase functions deploy summarize` from the previous known-good checkout.
- Database: migrations are additive; never `db reset` production. Fix forward with a new migration.
