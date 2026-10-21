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
| D1 | Target SME segment for demo data and pitch | Renovation contractor / event agency / IT services | | |
| D2 | Outcome action after approval | E-sign acceptance (scaffold default) / project creation / deposit invoice request | | |
| D3 | KPI and baseline | e.g. minutes per commitment review; % of reviews with complete evidence | | |
| D4 | Database on Replit | Replit PostgreSQL (change Prisma provider) / SQLite on a Reserved VM | | |
| D5 | LLM provider and model | any OpenAI-compatible API | | |
| D6 | Real-world validation | who we spoke to, what we learned (never invented) | | |

## Made

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-21 | Build a brand-new repo; no code from earlier projects | T&C 5.3, 5.5 |
| 2026-10-21 | Develop locally first, deploy to Replit in Phase 3 rehearsal and Phase 4 | Limited Replit credit; Replit is still compulsory |
| 2026-10-21 | Next.js + TypeScript + Prisma, single app, no queue | Fits a 3-day build and a Replit deploy |
| 2026-10-21 | Monthly recurring costs keep their original day each month, capped at the month's last day (31 Jan, 28 Feb, 31 Mar) | Matches CONTRACTS rule 3; avoids drifting to the 28th after February |
| 2026-10-21 | Recurring occurrences dated before the opening date are counted on the opening date and flagged overdue | Same as one-off overdue events (rule 2); ignoring them would show more cash than reality |
