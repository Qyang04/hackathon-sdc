# Decisions log

Record each team decision with date and who decided. Design decisions stay with the team.

## Team and owners

| Workstream | Owner | Backup |
| --- | --- | --- |
| A — Engine & rules | | |
| B — Backend & AI | | |
| C — Frontend & UX | | |
| D — Submission | | |

## Open decisions

| ID | Question | Options | Decision | Date |
| --- | --- | --- | --- | --- |
| D1 | Target SME segment for demo data and pitch | Renovation contractor / event agency / IT services | Built as renovation / fit-out contractor (demo data); team to confirm | |
| D2 | Outcome action after approval | E-sign acceptance (scaffold default) / project creation / deposit invoice request | Built as e-sign acceptance (simulated); team to confirm | |
| D3 | KPI and baseline | e.g. minutes per commitment review; % of reviews with complete evidence | | |
| D4 | Database on Replit | Replit PostgreSQL (change Prisma provider) / SQLite on a Reserved VM | Replit PostgreSQL; self-run Postgres (Docker) for local dev and as fallback if Replit credit runs out | 2026-10-22 |
| D5 | LLM provider and model | any OpenAI-compatible API | | |
| D6 | Real-world validation | who we spoke to, what we learned (never invented) | | |

## Made

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-21 | Build a brand-new repo; no code from earlier projects | T&C 5.3, 5.5 |
| 2026-10-21 | Develop locally first, deploy to Replit in Phase 3 rehearsal and Phase 4 | Limited Replit credit; Replit is still compulsory |
| 2026-10-21 | Next.js + TypeScript + Prisma, single app, no queue | Fits a 3-day build and a Replit deploy |
| 2026-10-22 | D4: PostgreSQL everywhere (Replit PostgreSQL live, Docker Postgres locally and as fallback) | A SQLite file is not kept across Replit deployments; Replit Postgres is covered by Replit Core (PH 9.1.1); the fallback keeps the demo alive if credit runs out |
| 2026-10-21 | Monthly recurring costs keep their original day each month, capped at the month's last day (31 Jan, 28 Feb, 31 Mar) | Matches CONTRACTS rule 3; avoids drifting to the 28th after February |
| 2026-10-21 | Recurring occurrences dated before the opening date are counted on the opening date and flagged overdue | Same as one-off overdue events (rule 2); ignoring them would show more cash than reality |
| 2026-10-21 | Downside: an overdue estimated receipt moves to the opening date first, then gets the customer delay | It is already late; assuming it arrives on day 0 would overstate cash |
| 2026-10-21 | Downside cost increase applies to project and one-off OUT events, not to recurring costs (payroll, rent) | Recurring costs are fixed amounts |
| 2026-10-22 | Demo company lives in `src/lib/demo/data.ts`, shared by the seed, the reset and a test that checks the demo story (base above buffer, downside below) | One source of truth; the video cannot silently break when someone edits the seed |
| 2026-10-22 | UI theme: navy with an electric indigo accent; warning colours (red, amber, green) kept separate from the brand colour | Chosen from mockups; distinctive, and a warning never looks like decoration |
| 2026-10-22 | Q2: a downside-delayed existing receipt past the horizon is dropped with `EVENT_BEYOND_HORIZON`; the horizon extends only for proposal events (CONTRACTS rule 5) | Extending for existing events would give BASE and DOWNSIDE different date ranges, so `minBalanceDeltaSen` and the weekly tables would compare non-overlapping windows; the warning is the honest signal. Test gap closed in `engine.test.ts` |
| 2026-10-22 | Q4: keep `excludeUnconfirmedReceipts` even though validation already blocks unconfirmed AI proposal events | Validation covers only AI_EXTRACTED proposal events; the scenario rule is the second-line guard for existing/adapter-fed events with `confirmed = false`. Removing it would be a CONTRACTS change for no gain; covered by the `UNCONFIRMED_EXCLUDED` engine tests |
| 2026-10-22 | Demo reset is owner-only and asks for confirmation on the page | It deletes every check; the server enforces the role, not just the button |
| 2026-10-23 | Owner settings allow 0 by design: buffer 0 = no safety line (react only when cash goes negative); threshold 0 = every job is flagged for review (the strictest setting, not "off"; the owner decides every job regardless); delay 0 = no payment slip in the downside scenario. Demo figures assume the seed defaults (RM 30,000 / RM 50,000 / 21 days); reset before demoing or recording | 0 is a legal business choice, not a bug; the wording matters because threshold 0 behaves opposite to "disabled". Documented on /how and in docs/DEMO.md |
