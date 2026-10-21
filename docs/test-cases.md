# Hand-calculated test cases (Workstream A)

Write each case here first, calculated by hand (or in a spreadsheet), then encode it in `src/lib/engine/engine.test.ts`.
These tests are the evidence that the figures are correct (must-have 3: accuracy).

How to use this file:

- Inputs are fixed below. Fill in every `___` yourself, by hand or in a spreadsheet, before writing the engine.
- Use a short horizon (`minHorizonDays = 14`) so a daily table fits on one screen. Rules don't depend on 91 days.
- Only list days where something moves; every other day keeps the previous closing balance.
- `2026-11-02` is a Monday, so the 14-day horizon is `2026-11-02` to `2026-11-15` (two full weeks).
- Each case lists the `it.todo` items in `engine.test.ts` it proves.

## Open questions (decide with the team before calculating, then record in DECISIONS.md)

- Q1. Does the downside `costIncreasePct` apply to recurring costs (payroll, rent), or only to project OUT events? **Decided: only project and one-off OUT events.** Payroll and rent are fixed amounts.
- Q2. If the downside receipt delay pushes an existing IN event past the horizon end, is it dropped with `EVENT_BEYOND_HORIZON`, or does the horizon extend?
- Q3. Monthly recurring on the 31st: after February (28th), does March go back to the 31st? **Decided: yes.** Every month uses the original day, capped at the month's last day.
- Q5. A recurring cost whose `nextDate` is before `openingDate`: ignore the missed occurrences, or count them? **Decided: count each missed occurrence on `openingDate`, flagged `overdue`** (same as CONTRACTS rule 2 for one-off events; ignoring them would overstate cash).
- Q6. Downside on an overdue estimated receipt: delay from its original date, or from day 0? **Decided: from day 0** (move overdue to day 0 first, then add the delay). It is already late, so assuming it arrives today would be optimistic.
- Q4. `excludeUnconfirmedReceipts`: validation already blocks unconfirmed AI events, so what does this rule ever drop?

## Case 1 — baseline: statuses, overdue, partial payment, recurring, daily vs weekly

Proves: baseline daily balances; PAID excluded and partial payment; CANCELLED excluded; overdue moved to day 0;
minimum from daily values, not weekly; peak funding need.

Settings: opening cash RM 50,000.00 at the start of 2026-11-02, reserve RM 30,000.00, `minHorizonDays` 14. No proposal (baseline only).

| Id | Direction | Amount (RM) | Paid (RM) | Date | Status | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | OUT | 4,000.00 | 0 | 2026-10-28 | COMMITTED | CONFIRMED |
| E2 | OUT | 15,000.00 | 0 | 2026-11-04 | COMMITTED | CONFIRMED |
| E3 | OUT | 8,000.00 | 8,000.00 | 2026-11-05 | PAID | CONFIRMED |
| E4 | OUT | 5,000.00 | 2,000.00 | 2026-11-06 | COMMITTED | CONFIRMED |
| E5 | IN | 20,000.00 | 0 | 2026-11-07 | CANCELLED | ESTIMATED |
| E6 | IN | 10,000.00 | 0 | 2026-11-09 | PLANNED | ESTIMATED |
| E7 | IN | 5,000.00 | 0 | 2026-11-14 | PLANNED | CONFIRMED |
| E8 | IN | 6,000.00 | 0 | 2026-11-20 | PLANNED | CONFIRMED |

Recurring: R1 Payroll, MONTHLY, RM 12,000.00, `nextDate` 2026-11-13, no end date.

Daily table (days with movement only):

| Date | What moves (and why) | In (RM) | Out (RM) | Closing (RM) |
| --- | --- | --- | --- | --- |
| 2026-11-02 | opening 50,000.00; E1 was due 2026-10-28, unpaid, so it moves to day 0 | | 4,000.00 | 46,000.00 |
| 2026-11-04 | E2 | | 15,000.00 | 31,000.00 |
| 2026-11-06 | E4: 5,000.00 minus 2,000.00 already paid | | 3,000.00 | 28,000.00 |
| 2026-11-09 | E6 | 10,000.00 | | 38,000.00 |
| 2026-11-13 | R1 payroll | | 12,000.00 | 26,000.00 |
| 2026-11-14 | E7 | 5,000.00 | | 31,000.00 |

Weekly roll-up:

| Week start | In (RM) | Out (RM) | Closing (RM) | Lowest daily (RM) |
| --- | --- | --- | --- | --- |
| 2026-11-02 | 0.00 | 22,000.00 | 28,000.00 | 28,000.00 |
| 2026-11-09 | 15,000.00 | 12,000.00 | 31,000.00 | 26,000.00 |

Expected: minimum balance RM 26,000.00 on 2026-11-13; first breach 2026-11-06 (28,000.00 is below 30,000.00); peak funding need RM 4,000.00 (30,000.00 - 26,000.00).
The lowest weekly closing is 28,000.00, but the true minimum is 26,000.00 mid-week: this is why the minimum comes from daily values.
Warnings (code + event id): OVERDUE_MOVED_TO_DAY0 (E1); EVENT_BEYOND_HORIZON (E8, dated 2026-11-20, after the horizon end 2026-11-15).
Ignored events and why: E3 is PAID (already inside opening cash); E5 is CANCELLED.

## Case 2 — proposal: reserve equality, one sen below, horizon extension, delta

Proves: equal to reserve is not a breach, one sen below is; horizon extends to the proposal's last event;
`minBalanceDelta = withProposal.min - baseline.min`.

Settings: opening cash RM 30,000.00 at the start of 2026-11-02, reserve RM 20,000.00, `minHorizonDays` 14. No existing events, no recurring costs.

Proposal: start date 2026-11-03, scenario BASE.

| Id | Direction | Amount (RM) | Offset days | Confidence | Confirmed |
| --- | --- | --- | --- | --- | --- |
| P1 | OUT | 10,000.00 | 0 | CONFIRMED | yes |
| P2 | IN | 25,000.00 | 20 | ESTIMATED | yes |

Case 2b: same as Case 2, but P1 = RM 10,000.01.

| | Case 2 | Case 2b |
| --- | --- | --- |
| Horizon end | | |
| Baseline min balance / date | | |
| With-proposal min balance / date | | |
| First breach (with proposal) | | |
| `minBalanceDeltaSen` | | |
| Main contributors (top 5, by absolute value) | | |

## Case 3 — scenarios: downside and deferred start

Proves: DOWNSIDE delays ESTIMATED receipts and adds the cost increase to unpaid OUT (rounded half up);
DEFERRED_START shifts every proposal event.

Inputs: Case 2 settings and proposal (P1 = RM 10,000.00), plus:

| Id | Direction | Amount (RM) | Offset days | Confidence | Confirmed |
| --- | --- | --- | --- | --- | --- |
| P3 | OUT | 3,333.35 | 5 | ESTIMATED | yes |

Scenarios (from `scenarioPresets(14, 30)`): DOWNSIDE = receipts +14 days, costs +10%, unconfirmed receipts excluded; DEFERRED_START = start +30 days.

| Event | BASE date / amount | DOWNSIDE date / amount | DEFERRED_START date / amount |
| --- | --- | --- | --- |
| P1 | 2026-11-03 / 10,000.00 | 2026-11-03 / 11,000.00 | 2026-12-03 / 10,000.00 |
| P2 | 2026-11-23 / 25,000.00 | 2026-12-07 / 25,000.00 | 2026-12-23 / 25,000.00 |
| P3 | 2026-11-08 / 3,333.35 | 2026-11-08 / 3,666.69 | 2026-12-08 / 3,333.35 |

Why: date = start 2026-11-03 + startShiftDays + offset. DOWNSIDE delays only P2 (an ESTIMATED receipt) by 14 days and
adds 10% to P1 and P3 (OUT). DEFERRED_START moves every event 30 days. P3 is ESTIMATED but OUT, so it is not delayed.

Rounding check: P3 under DOWNSIDE = 333,335 sen x 1.10 = 366,668.5 sen → rounded half up = 366,669 sen.

| | BASE | DOWNSIDE | DEFERRED_START |
| --- | --- | --- | --- |
| Horizon end | | | |
| With-proposal min balance / date | | | |
| First breach | | | |

## Case 4 — recurring expansion only (no balance table)

Proves: monthly recurring costs land on the right days, including month ends. Tests `expandRecurring` directly.

Opening 2027-01-01, horizon end 2027-03-31.

| Cost | Frequency | Amount (RM) | `nextDate` | `endDate` | Expected dates |
| --- | --- | --- | --- | --- | --- |
| R1 Rent | MONTHLY | 3,000.00 | 2027-01-31 | none | 2027-01-31, 2027-02-28, 2027-03-31 |
| R2 Loan | MONTHLY | 1,500.00 | 2027-01-15 | 2027-02-28 | 2027-01-15, 2027-02-15 |
| R3 Casual wages | WEEKLY | 800.00 | 2027-03-05 | none | 2027-03-05, 2027-03-12, 2027-03-19, 2027-03-26 |
| R4 Payroll (missed) | MONTHLY | 12,000.00 | 2026-12-28 | none | 2027-01-01 (overdue, was 2026-12-28), 2027-01-28, 2027-02-28, 2027-03-28 |

Why: R1 shows Feb capped at the 28th and March back on the 31st (Q3). R2 stops because 2027-03-15 is after `endDate`.
R3 stops because 2027-04-02 is after the horizon end. R4's 2026-12-28 occurrence is before the opening date, so it moves to day 0 (Q5).
