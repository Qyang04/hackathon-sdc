# Contracts

What each workstream builds against. TypeScript types are the source of truth; this file explains the rules behind them. Change a contract only after telling the team.

## Units and formats

- Money: integer **sen** (RM 1.00 = 100). Parse with `rmToSen`, display with `formatRM`. No floating point.
- Dates: `YYYY-MM-DD`, a calendar day in Malaysia time. Use `addDays`, `daysBetween`, `weekStart`. Weeks start on Monday.
- Currency: MYR only.

## Engine rules (`src/lib/engine`)

1. Opening cash is the balance at the **start** of `openingDate`.
2. Existing events:
   - `CANCELLED` → ignored.
   - `PAID` → ignored (already inside opening cash).
   - Otherwise the remaining amount is `amountSen - paidSen`.
   - Dated before `openingDate` and not paid → moved to `openingDate` with warning `OVERDUE_MOVED_TO_DAY0`.
3. Recurring costs expand into OUT events from `nextDate` until the horizon end (or `endDate`). Monthly on day 29–31 → last day of shorter months.
4. Proposal events are stored as `offsetDays` from the proposal start; the date is `startDate + startShiftDays + offsetDays`.
5. Horizon end = the later of `openingDate + minHorizonDays - 1` and the proposal's last event date. Existing events after the horizon → warning `EVENT_BEYOND_HORIZON`.
6. Scenarios:
   - `receiptDelayDays` is added to every **ESTIMATED** IN event (existing and proposal).
   - `costIncreasePct` is added to every unpaid OUT amount, rounded half up to whole sen.
   - `excludeUnconfirmedReceipts` drops IN events with `confirmed = false`, with warning `UNCONFIRMED_EXCLUDED`.
7. Calculation is **daily**: `closing[d] = closing[d-1] + in[d] - out[d]`. Weekly values are a roll-up for display; `lowestDailySen` keeps the weekly low.
8. Metrics: minimum balance and its date from daily values (earliest date if tied); first breach = first day **strictly below** the reserve; peak funding need = `max(0, reserve - minBalance)`.
9. Comparison: baseline = existing + recurring; withProposal = baseline + proposal; `minBalanceDeltaSen = withProposal.min - baseline.min`; main contributors = the largest movements (by absolute value) in the 14 days up to and including the withProposal minimum date, top 5.
10. Pure functions: no database, no network, no AI, no current time. Same input → same output.

## Policy rules (`src/lib/policy`)

| Rule id | Condition | Outcome |
| --- | --- | --- |
| `DATA_INCOMPLETE` | any validation ERROR | BLOCKED (no forecast findings) |
| `RESERVE_BREACH_BASE` | base withProposal has a first breach date | NEEDS_REVIEW |
| `RESERVE_BREACH_DOWNSIDE` | only downside breaches | NEEDS_REVIEW (worded as a risk) |
| `ABOVE_APPROVAL_THRESHOLD` | contract value > threshold | NEEDS_REVIEW |
| — | none of the above | PASS |

Overall outcome = worst finding (BLOCKED > NEEDS_REVIEW > PASS). Thresholds are example values from `CompanySettings`, editable by the owner and saved with every run. Every request still needs an owner decision; PASS only means no rule was triggered.

## Request lifecycle

```
DRAFT --(check run, policy BLOCKED)--> NEEDS_INFO --(edited)--> DRAFT
DRAFT --(check run)--> CHECKED --(owner APPROVED)--> APPROVED --(e-sign sent)--> COMPLETED
                               --(owner REJECTED)--> REJECTED
                               --(owner NEEDS_INFO)--> NEEDS_INFO
```

- Only `OWNER` can decide (checked on the server). A decision must reference the latest `ForecastRun`.
- If the owner created the request, the decision is stored with `selfApproved = true` and shown in the activity log.
- Every transition writes an `ActivityLog` row.

## AI rules (`src/lib/ai`)

- Output must parse against `ExtractionResult` or `DecisionBrief` (zod); otherwise it is discarded.
- Extraction: amounts are converted to sen in code; each `sourceSnippet` must appear in the pasted text; saved events start `confirmed = false`.
- Brief: input is computed results only; reject a brief containing an RM figure not present in the input. UI label: "Decision support, not financial advice".
- AI failure never blocks the forecast or the decision; the UI shows the figures and offers manual entry.
- Send the minimum to the AI provider: amounts, dates and milestone wording; no personal names or contact details.

## API (`src/app/api`)

| Method + path | Purpose | Status |
| --- | --- | --- |
| `GET /api/portfolio` | Settings, projects with events, recurring costs | Done |
| `POST /api/session` | Switch simulated role | Done |
| `GET /api/requests` | List requests | TODO(B) |
| `POST /api/requests` | Create DRAFT request with proposal events | TODO(B) |
| `GET /api/requests/:id` | Request, events, latest run, decisions, activity | TODO(B) |
| `PATCH /api/requests/:id` | Edit draft, confirm AI-extracted events | TODO(B) |
| `POST /api/extract` | AI milestones from pasted text | TODO(B) |
| `POST /api/requests/:id/forecast` | Validate, three scenarios, policy, brief, save run | TODO(B) |
| `POST /api/requests/:id/decision` | Owner decision + outcome action | TODO(B) |
| `POST /api/reset` | Re-seed demo data | TODO(B) |
