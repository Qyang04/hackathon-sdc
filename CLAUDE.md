# CLAUDE.md — Orbyte Project Commitment Copilot

Context for Claude Code sessions in this repo. Read `README.md`, `docs/PLAN.md` and `docs/CONTRACTS.md` before changing code.

## What this is

SDC Hackathon 2026, Domain 2 (Orbyte Smart SME Challenge). Before a project-based SME accepts a new job or large order, the app reads the quotation, checks it against existing commitments and payroll, flags weeks where cash falls below the owner's safety buffer, and routes the decision to the owner with an activity log. All data synthetic; Orbyte connections simulated.

Preliminary deadline: **Sun 25 Oct 2026, 07:59:59 MYT** (target: submit Sat 24 Oct evening). Current phase: see `docs/PLAN.md`.

## Commands

- `npm run dev` — local app at http://localhost:3000
- `npm test` — vitest (engine, policy, validation)
- `npm run typecheck` — tsc
- `npm run build` — prisma generate + next build
- `npm run db:reset` — recreate the PostgreSQL tables and seed demo data (local DB: `docker compose up -d`, port 5433)
- Prisma CLI is local: use `npx prisma ...`, not `prisma ...`
- A pre-push hook runs typecheck, test and build; keep them green.

## Rules that must not be broken

- Money is integer sen (`rmToSen`, `formatRM`); never floating point. Dates are `YYYY-MM-DD` strings; use helpers in `src/lib/engine/dates.ts`.
- `src/lib/engine`, `src/lib/policy`, `src/lib/validation` are pure functions: no DB, network, AI or current time.
- AI (`src/lib/ai`) never produces or changes figures, policy outcomes or statuses. AI output is zod-validated; AI-extracted events start `confirmed = false`; AI failure must not block the forecast.
- Only the OWNER role may decide; enforce on the server, not just in the UI. Log every state change with `logActivity`.
- Contracts (`src/lib/engine/types.ts`, `src/lib/policy/types.ts`, `src/lib/ai/schemas.ts`, `prisma/schema.prisma`) change only when the user says the team agreed.
- No real personal or company data. Label simulated data in the UI. Never commit `.env` or keys.
- The brief is "decision support, not financial advice": never word output as a recommendation to accept or reject.

## How to help in this repo (competition rules)

The organiser requires that the team can explain every major component and that the core idea and logic come from the team (Official Handbook 8.5; T&C 5.6). So:

- For the engine, policy rules and validation: help the user design, explain, review and write tests. Prefer guiding over writing the whole implementation in one go; keep changes small enough that the user can explain them.
- Plumbing (API wiring, UI components, config, refactors) can be written more directly, still in small reviewable steps.
- Make small, focused commits with clear messages; never one giant commit.
- Remind the user to record AI tools used in the Technical & Tools Declaration.
