# Delivery plan — phase by phase

Hard deadline: **Sun 25 Oct 2026, 07:59:59 MYT** (Participant Handbook 6.3.1). Target: submit **Sat 24 Oct evening**; Sunday morning is buffer only.

Workstreams (one accountable owner each; names in `docs/DECISIONS.md`):

- **A — Engine & rules:** forecast, scenarios, policy, validation, seed data, hand-calculated tests.
- **B — Backend & AI:** schema, API routes, persistence, AI extraction and brief, simulated adapters, roles, activity log, Replit deploy.
- **C — Frontend & UX:** overview, three-step wizard, result + decision page, activity page, plain-language wording.
- **D — Submission (can be shared):** PRD, Technical & Tools Declaration, slides, video, user conversations, final checks.

Each phase ends with an exit gate. Do not start the next phase's features until the gate passes; fix instead.

## Progress (updated Fri 23 Oct 2026)

Where we are: **Phase 1 and Phase 2 exit gates passed.** Phase 3: Replit deploy works; usability check and submission documents are left.
Keep this section current when you merge something: move items from "Not done" to "Done".

| Area | Done | Not done |
| --- | --- | --- |
| A — Engine & rules | Forecast engine (`expandRecurring`, `normaliseExisting`, `normaliseProposal`, `runForecast`, `compareProposal`); validation; policy; hand-calculated cases 1–4 in `docs/test-cases.md`; demo company (`src/lib/demo/data.ts`) with a test that guards the demo story; Q2 and Q4 decided; "How it works" page for judges (`/how`); 128 tests passing | Freeze the demo data before the video is recorded |
| B — Backend & AI | Every API route in `docs/CONTRACTS.md` (requests, extract, forecast, decision with simulated e-sign, owner-only reset); saving and loading checks (`src/lib/runs.ts`); simulated roles and activity log; AI brief (`generateBrief`); owner settings API; PostgreSQL (D4); Replit deploy (`.replit`, `docs/DEPLOY.md`) | LLM key set as Replit secrets (D5 recorded: Nemotron), so the brief and extraction work live |
| C — Frontend & UX | Navy/indigo redesign of every page; overview with lowest cash over 13 weeks; three-step wizard; result page (headline sentence, waterline chart, scenario tabs, rules, contributors, comparison table); owner decision panel; activity timeline; owner settings page (`/settings`); reset button (owner only); works at phone width | Usability check with a teammate who did not build it (Phase 3 gate); decide whether to keep `/preview/result` |
| D — Submission | Demo script with expected figures (`docs/DEMO.md`); end-to-end testing handbook (`docs/E2E-TESTING.md`) | Owners and D1–D6 in `docs/DECISIONS.md`; SME conversations (D6); PRD; Technical & Tools Declaration (must list Claude Code and every other AI tool used); slides; video; everything in `submission/CHECKLIST.md` |

## Phase 0 — Set up (Wed 21 Oct, morning)

Goal: everyone can run the same app locally and knows what they own.

- [x] Leader: create the GitHub repo (private for now), push this scaffold as the first commit, invite members.
- [ ] Everyone: clone, `npm install`, `npm run db:reset`, `npm run dev`, `npm test` all work.
- [ ] Fill names and decisions D1–D6 in `docs/DECISIONS.md`.
- [ ] D: message 2–3 SME owners you know for a 10-minute call (real-world validation; report honestly).

Exit gate: every member has the app running locally and has opened their first branch.

## Phase 1 — Contracts and engine (Wed 21 Oct)

Goal: the numbers are right before any screen depends on them.

- **A:** write `docs/test-cases.md` (2–3 small cases calculated by hand), then implement `expandRecurring`, `normaliseExisting`, `normaliseProposal`, `runForecast`, `compareProposal`; turn the `it.todo` items into passing tests. Expand `prisma/seed.ts` into the demo company.
- **B:** `POST/GET /api/requests`, `GET /api/requests/:id`; seeded Orbyte adapters; pick the LLM provider (D5) and get one extraction call working from a script.
- **C:** layout and overview page with real `/api/portfolio` data; static mock of the result page using a hand-written `ComparisonResult` object (types from `src/lib/engine/types.ts`).
- **D:** PRD sections 1–2 draft (problem, solution) within word limits.

Exit gate: engine tests pass on hand-calculated cases; a request can be created and read back through the API. **Passed 21 Oct.**

Status: A done (incl. demo company). B done except the LLM provider (D5). C done (the overview reads the database directly instead of `/api/portfolio`). D not started.

## Phase 2 — One journey end to end (Thu 22 Oct)

Goal: trigger → data → decision → approval → outcome works, even roughly.

- **A:** `validateRequest`, `evaluatePolicy` + tests; scenario presets checked against seed data (downside should breach, base should not).
- **B:** `POST /api/extract`, `POST /api/requests/:id/forecast` (validation → three scenarios → policy → brief → save run), `POST /api/requests/:id/decision` with server-side owner check, simulated e-sign outcome, activity log on every step.
- **C:** three-step wizard wired to the API (paste quotation → confirm dates → run check); result page wired; owner-only decision buttons; activity page.
- **D:** PRD sections 3–4 (architecture, SDG 8.3/8.2, baseline, KPI with cited sources); Technical & Tools Declaration draft.

Exit gate: the full journey runs locally from a fresh `npm run db:reset` without touching the database by hand. **Passed 22 Oct** (create, payments, check, staff blocked, owner approves, simulated e-sign, activity log).

Status: A, B, C done, except the AI brief (shows "not available" until `generateBrief` is written). D not started.

## Phase 3 — Accuracy, ease of learning, deploy rehearsal (Fri 23 Oct)

Goal: a first-time user understands it; the deploy is proven.

- **B (morning):** rehearse the Replit deploy (import from GitHub, Postgres per D4, secrets, seed). Note every problem; this is the main fallback window.
- **C:** plain-language result sentence, comparison of base / downside / deferred start, main contributing payments, unconfirmed inputs highlighted, loading and error states (AI failure keeps the figures).
- **A:** edge-case tests (reserve equality, overdue items, horizon extension); `POST /api/reset` content.
- **D:** finish PRD (incl. PDPA paragraph, IP declaration 6.1 mentioning the earlier UMHackathon project honestly); slides; video script under 6.5 minutes.

Exit gate: a teammate who did not build the UI completes the demo without help, on the Replit URL.

Status (22 Oct): C items done early (plain-language sentence, scenario comparison, contributors, unconfirmed inputs, AI-failure fallback). A edge-case tests done (reserve equality, overdue, horizon extension). `POST /api/reset` done. Not done: Replit rehearsal (B), D items.

## Phase 4 — Freeze and submit (Sat 24 Oct)

- 12:00 feature freeze. Only blocking bugs after this.
- Final Replit deploy; reset demo data; capture Replit proof (deployment URL or project link with history).
- Record the 5–7 minute video with the live demo; upload to YouTube (unlisted is fine if allowed; check links work logged out).
- Make the repo public; add the committee's GitHub account(s) as collaborators; confirm `LICENSE` is present.
- Fill `submission/CHECKLIST.md`; submit all six items on sdchack.my; open every link in an incognito window.

## Sun 25 Oct — buffer

No commits after 07:59:59. Repository is frozen after submission.

## Hardest risk and fallback (for the PRD and pitch)

**Risk:** AI misreads a payment date or amount from a quotation.
**Fallback:** every AI-extracted milestone is unconfirmed until a person accepts or edits it; manual entry is always available; the engine refuses unconfirmed input, so a misread cannot reach the figures.

Second risk: the live deploy fails close to the deadline. Fallback: Friday rehearsal, seed reset endpoint, and the video recorded from a working deploy.
