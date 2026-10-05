# MediSimple

Plain-language medical reports, a grounded “ask my reports” flow, and a health agent.

Upload a lab report. The app splits it into passages, indexes them, and answers questions only from the closest passages — with those passages cited under the reply.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:8080

Set `XAI_API_KEY` for live summaries and the agent. Without it, report indexing still works and the agent explains that AI is unavailable.

Accounts are email and password. Health data is stored per user.

This is a wellness product. It does not diagnose or treat.
