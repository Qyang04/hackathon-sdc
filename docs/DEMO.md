# Demo script

All data is synthetic. Source: `src/lib/demo/data.ts`. Reset with `npm run db:reset` (or `npm run db:seed` to keep the schema).
The figures below are guarded by `src/lib/demo/demo.test.ts`; if you change the demo data, update both.

## The company

Contoh Renovation Sdn Bhd (synthetic), a small fit-out contractor.

- Cash at the start of Mon 2 Nov 2026: **RM 190,000**. Safety buffer **RM 30,000**. Jobs above **RM 50,000** go to the owner.
- Customers usually pay about **21 days** late (used in "If things slip").
- 3 active projects: shoplot renovation (RM 180k), clinic fit-out (RM 240k), office repaint (RM 60k).
- Fixed costs: salaries RM 32,000 on the 28th, EPF/SOCSO/EIS RM 5,200 by the 15th, rent RM 4,500 on the 1st,
  lorry hire purchase RM 1,850 on the 5th, site workers RM 2,200 every Friday; monthly utilities and internet RM 850 (3rd),
  diesel and petrol RM 1,100 (10th), LHDN CP204 tax instalment RM 1,500 (20th), insurance (CAR and vehicles) RM 640 (25th).
- The sample covers every case the engine handles: a paid claim and deposit (left out), a cancelled PO (left out),
  an overdue unpaid claim (moved to day 0), a half-paid subcontractor (only the unpaid half counts), estimated and
  confirmed receipts. Clients withhold **5% retention** on progress claims, released after the defects liability period
  (one retention lands inside the horizon; the rest after it, so the app shows the `EVENT_BEYOND_HORIZON` warning).
  Supplier POs can be split **deposit + balance** (see shoplot tiles).
- Lowest cash over the next 13 weeks **without any new job: RM 91,360 on 5 Dec 2026** (overview banner).

## The job to check

Staff (Wei Jie) creates: **Restaurant fit-out, Bangsar**, client Restoran Contoh Bangsar (synthetic), start
**2026-11-16**, **60** days, contract **RM 85,000**, budget **RM 62,000**.

Quotation text to paste in step 2:

```text
QUOTATION QT-2026-118 (synthetic)
Restoran Contoh Bangsar - kitchen and dining fit-out, approx. 8 weeks from site possession on 16 Nov 2026.
Contract sum: RM 85,000.00
Payment terms:
  1. 10% deposit (RM 8,500.00) on signing, payable on site possession.
  2. 40% progress claim (RM 34,000.00) on completion of kitchen works, est. 4 weeks after start.
  3. 50% balance (RM 42,500.00) on handover, est. 60 days after start.
Our costs (internal): kitchen equipment RM 28,000 due on order (week 1); joinery subcontractor RM 22,000 in week 3;
M&E and finishing RM 12,000 in week 6.
```

Payments to end up with (confirm AI suggestions, or enter by hand if AI is unavailable):

| What | Type | Date | Amount (RM) | Estimate? |
| --- | --- | --- | --- | --- |
| 10% deposit | Client pays | 2026-11-16 | 8,500 | no |
| Kitchen equipment | You pay | 2026-11-19 | 28,000 | no |
| Joinery subcontractor | You pay | 2026-12-03 | 22,000 | no |
| 40% progress claim | Client pays | 2026-12-14 | 34,000 | yes |
| M&E and finishing | You pay | 2026-12-24 | 12,000 | no |
| 50% balance on handover | Client pays | 2027-01-15 | 42,500 | yes |

## Expected result

**Needs your review**, two rules: could fall below the buffer if things slip; contract above RM 50,000.

| Situation | Lowest cash with the job | Below buffer from |
| --- | --- | --- |
| As planned | RM 49,860 on 5 Dec 2026 | stays above |
| If things slip | RM 11,820 on 3 Jan 2027 | 24 Dec 2026 (extra cash needed RM 18,180) |
| Start later | RM 65,120 on 11 Jan 2027 | stays above |

Then: staff tries to decide (blocked), switch to Owner (Aisyah), give a reason, approve. The status becomes
"Sent for signature" (simulated e-sign) and every step is in Activity.
