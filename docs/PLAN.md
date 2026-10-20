# Delivery plan — phase by phase

Hard deadline: **Sun 25 Oct 2026, 07:59:59 MYT** (Participant Handbook 6.3.1). Target: submit **Sat 24 Oct evening**; Sunday morning is buffer only.

Workstreams (one accountable owner each; names in `docs/DECISIONS.md`):

- **A — Engine & rules:** forecast, scenarios, policy, validation, seed data, hand-calculated tests.
- **B — Backend & AI:** schema, API routes, persistence, AI extraction and brief, simulated adapters, roles, activity log, Replit deploy.
- **C — Frontend & UX:** overview, three-step wizard, result + decision page, activity page, plain-language wording.
- **D — Submission (can be shared):** PRD, Technical & Tools Declaration, slides, video, user conversations, final checks.

Each phase ends with an exit gate. Do not start the next phase's features until the gate passes; fix instead.

## Phase 0 — Set up (Wed 21 Oct, morning)

Goal: everyone can run the same app locally and knows what they own.

- [ ] Leader: create the GitHub repo (private for now), push this scaffold as the first commit, invite members.
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

Exit gate: engine tests pass on hand-calculated cases; a request can be created and read back through the API.

## Phase 2 — One journey end to end (Thu 22 Oct)

Goal: trigger → data → decision → approval → outcome works, even roughly.

- **A:** `validateRequest`, `evaluatePolicy` + tests; scenario presets checked against seed data (downside should breach, base should not).
- **B:** `POST /api/extract`, `POST /api/requests/:id/forecast` (validation → three scenarios → policy → brief → save run), `POST /api/requests/:id/decision` with server-side owner check, simulated e-sign outcome, activity log on every step.
- **C:** three-step wizard wired to the API (paste quotation → confirm dates → run check); result page wired; owner-only decision buttons; activity page.
- **D:** PRD sections 3–4 (architecture, SDG 8.3/8.2, baseline, KPI with cited sources); Technical & Tools Declaration draft.

Exit gate: the full journey runs locally from a fresh `npm run db:reset` without touching the database by hand.

## Phase 3 — Accuracy, ease of learning, deploy rehearsal (Fri 23 Oct)

Goal: a first-time user understands it; the deploy is proven.

- **B (morning):** rehearse the Replit deploy (import from GitHub, Postgres per D4, secrets, seed). Note every problem; this is the main fallback window.
- **C:** plain-language result sentence, comparison of base / downside / deferred start, main contributing payments, unconfirmed inputs highlighted, loading and error states (AI failure keeps the figures).
- **A:** edge-case tests (reserve equality, overdue items, horizon extension); `POST /api/reset` content.
- **D:** finish PRD (incl. PDPA paragraph, IP declaration 6.1 mentioning the earlier UMHackathon project honestly); slides; video script under 6.5 minutes.

Exit gate: a teammate who did not build the UI completes the demo without help, on the Replit URL.

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
