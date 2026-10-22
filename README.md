# Orbyte Project Commitment Copilot

Before a project-based SME accepts a new job or a large order, the Copilot reads the quotation, checks it against existing commitments and upcoming payroll, flags any week where cash would fall below the owner's safety buffer, and routes the decision to the owner with a logged record.

SDC Hackathon 2026 · Domain 2: Orbyte Smart SME Challenge · SDG 8 (targets 8.2, 8.3)

> All data in this project is synthetic. Orbyte connections are simulated. The app supports a person's decision; it does not give financial advice and never approves or pays anything by itself.

## Status

Phases 1 and 2 are done: the whole journey works locally. See **Progress** at the top of `docs/PLAN.md` for what is done and not done per workstream, `docs/DEMO.md` for the demo script and expected figures, and `docs/E2E-TESTING.md`
for a step-by-step test of the whole app.

## Quick start (local)

Requirements: Node.js 20 or 22, npm, Git, Docker Desktop (for the local PostgreSQL).

```bash
npm install            # also runs prisma generate
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
docker compose up -d   # local PostgreSQL on port 5433 (data kept in a Docker volume)
npm run db:reset       # create the tables and load demo data
npm run dev            # http://localhost:3000
npm test               # engine, policy, validation and demo-story tests (no database needed)
```

Back up any of our databases with `npm run db:backup` and load a backup with `npm run db:restore -- <file>`. Deploying to Replit and the fallback if Replit credit runs out: `docs/DEPLOY.md`.

To start the demo again from clean data, the owner can press **Reset demo data** on the overview (or run `npm run db:seed`).

AI is optional while developing: leave `LLM_API_KEY` empty and the app runs without it (payment dates are then entered manually). Figures never depend on AI.

## How it works

```
Trigger            Connected data                Decision logic                  Human approval        Outcome + log
New commitment  -> existing projects, payables, -> validate -> forecast (base, -> owner approves,   -> acceptance sent for
check (quotation)  receivables, payroll           downside, deferred) -> policy   rejects or asks      e-signature (simulated),
 + AI reads dates  (simulated Orbyte adapters)    (deterministic, no AI)          for info             activity log
```

AI is used in two places only: reading payment milestones out of quotation/PO text (a person confirms each one), and writing a plain-language summary of results that were already calculated. AI never produces or changes a figure, a policy outcome or a status.

## Project structure

| Path | What | Owner |
| --- | --- | --- |
| `src/lib/engine/` | Deterministic cash forecast: types (contracts), money/date helpers, forecast, scenarios | A |
| `src/lib/policy/` | Policy rules: PASS / NEEDS_REVIEW / BLOCKED | A |
| `src/lib/validation/` | Request validation rules | A |
| `src/lib/demo/` | Demo company data (one source for seed, reset and the demo-story test) | A |
| `prisma/seed.ts`, `docs/test-cases.md`, `docs/DEMO.md` | Seed script, hand-calculated expected results, demo script | A |
| `prisma/schema.prisma` | Database model | B |
| `src/app/api/` | API routes (contract in `docs/CONTRACTS.md`) | B |
| `src/lib/runs.ts` | Saving and loading a check (one row per scenario) | B |
| `src/lib/ai/` | LLM client, output schemas, extraction, brief | B |
| `src/lib/adapters/` | Simulated Orbyte connections | B |
| `src/lib/session.ts`, `src/lib/audit.ts` | Simulated roles, activity log | B |
| `src/app/` pages | Overview, wizard, result + decision, activity | C |
| `docs/`, `submission/` | PRD, declaration, slides, video, checklist | D |

Search for `TODO(A)`, `TODO(B)`, `TODO(C)` to find what is left in the code (only `generateBrief` remains).

## Working agreement

- Branch per task: `a/forecast-engine`, `b/forecast-api`, `c/wizard`. Small pull requests into `main`; merge at least daily.
- Commit small and often with clear messages. The organiser checks commit history; never squash the week into one commit.
- Contracts first: change `src/lib/engine/types.ts`, `src/lib/policy/types.ts`, `src/lib/ai/schemas.ts` or `prisma/schema.prisma` only after telling the team.
- Money is integer sen; dates are `YYYY-MM-DD`. Never use floating point for money.
- Never commit `.env` or API keys. Use Replit Secrets when deploying.
- AI coding assistants are allowed but must be declared, and everyone must be able to explain the code they merge. Write the engine and policy logic yourselves.

## Deployment (Replit)

Replit is compulsory for the submission (Participant Handbook 9.2; proof per 10.6). The live app runs on Replit with Replit PostgreSQL (decision D4). Steps and the fallback plan: `docs/DEPLOY.md`. See also `docs/PLAN.md` phase 4 and `submission/CHECKLIST.md`.

## Licence

Apache License 2.0, see `LICENSE`. Third-party libraries keep their own licences (declared in the Technical & Tools Declaration).
