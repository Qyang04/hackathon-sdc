# Orbyte Project Commitment Copilot

Before a project-based SME accepts a new job or a large order, the Copilot reads the quotation, checks it against existing commitments and upcoming payroll, flags any week where cash would fall below the owner's safety buffer, and routes the decision to the owner with a logged record.

SDC Hackathon 2026 · Domain 2: Orbyte Smart SME Challenge · SDG 8 (targets 8.2, 8.3)

> All data in this project is synthetic. Orbyte connections are simulated. The app supports a person's decision; it does not give financial advice and never approves or pays anything by itself.

## Quick start (local)

Requirements: Node.js 20 or 22, npm, Git.

```bash
npm install            # also runs prisma generate
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
npm run db:reset       # create the SQLite database and load demo data
npm run dev            # http://localhost:3000
npm test               # engine, policy and validation tests
```

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
| `prisma/seed.ts`, `docs/test-cases.md` | Demo company data and hand-calculated expected results | A |
| `prisma/schema.prisma` | Database model | B |
| `src/app/api/` | API routes (contract in `docs/CONTRACTS.md`) | B |
| `src/lib/ai/` | LLM client, output schemas, extraction, brief | B |
| `src/lib/adapters/` | Simulated Orbyte connections | B |
| `src/lib/session.ts`, `src/lib/audit.ts` | Simulated roles, activity log | B |
| `src/app/` pages | Overview, wizard, result + decision, activity | C |
| `docs/`, `submission/` | PRD, declaration, slides, video, checklist | D |

Search for `TODO(A)`, `TODO(B)`, `TODO(C)` to find your starting points.

## Working agreement

- Branch per task: `a/forecast-engine`, `b/forecast-api`, `c/wizard`. Small pull requests into `main`; merge at least daily.
- Commit small and often with clear messages. The organiser checks commit history; never squash the week into one commit.
- Contracts first: change `src/lib/engine/types.ts`, `src/lib/policy/types.ts`, `src/lib/ai/schemas.ts` or `prisma/schema.prisma` only after telling the team.
- Money is integer sen; dates are `YYYY-MM-DD`. Never use floating point for money.
- Never commit `.env` or API keys. Use Replit Secrets when deploying.
- AI coding assistants are allowed but must be declared, and everyone must be able to explain the code they merge. Write the engine and policy logic yourselves.

## Deployment (Replit)

Replit is compulsory for the submission. Plan: build locally, rehearse a Replit deploy on Day 3 morning, final deploy on Day 4. See `docs/PLAN.md` phase 4 and `submission/CHECKLIST.md`.

## Licence

Apache License 2.0, see `LICENSE`. Third-party libraries keep their own licences (declared in the Technical & Tools Declaration).
