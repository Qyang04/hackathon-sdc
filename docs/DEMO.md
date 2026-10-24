# Demo script

All data is synthetic. Source: `src/lib/demo/data.ts`. Reset with `npm run db:reset` (or `npm run db:seed` to keep the schema).
The figures below are guarded by `src/lib/demo/demo.test.ts`; if you change the demo data, update both.

## The company

Contoh Renovation Sdn Bhd (synthetic), a small fit-out contractor.

- Cash at the start of Mon 2 Nov 2026: **RM 190,000**. Safety buffer **RM 30,000**. Jobs above **RM 50,000** get a review flag (the owner decides every job).
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

Quotation for step 2: upload `docs/demo/QT-2026-118-synthetic.pdf` (made by `npx tsx scripts/make-demo-pdf.ts`), or paste:

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

## Owner settings (buffer, threshold, delay)

The demo figures above are pinned to the seed settings: RM 30,000 buffer,
RM 50,000 review threshold, 21-day customer delay. The owner can change
them on the **Settings** page (`/settings`). A check
keeps the settings it was run with; after a change, the owner must run the
check again before approving. **Reset before demoing or recording** (Reset
demo data on the overview, or `npm run db:reset`) to get back to the numbers
in this doc.

What each setting does when it is on, and what 0 means:

| Setting | On (non-zero) | 0 means |
| --- | --- | --- |
| Buffer | Red warning the moment projected cash dips below it | Only react when cash actually goes negative |
| Review threshold | Jobs above it get a "needs your review" flag. The owner decides every job either way; staff never can | Every job is flagged — the strictest setting, not "off" |
| Customer delay | Estimated client payments pushed this many days later in "if things slip" | Estimated payments counted on their promised date |

The same explanations, with the live values, are on the app's
"How it works" page (`/how`).

## Video walkthrough (about 6 minutes, limit 7)

The whole system in one story. Each scene names the module it proves, so the narration can point at it.

### Before recording

- [ ] **Reset demo data** on the overview (as Owner). Settings back to RM 30,000 / RM 50,000 / 21 days.
- [ ] AI key set (Replit Secrets: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_DISABLE_THINKING=true`). If AI is down,
      scene 3 still works: enter the six payments from the table above by hand and say so.
- [ ] `docs/demo/QT-2026-118-synthetic.pdf` downloaded to the recording machine.
- [ ] Start **viewing as Wei Jie (Project lead)** (staff). Browser zoom about 110%, one tab, notifications off.

### The flow

```
Orbyte data (simulated) ──► Trigger ──► Read quotation ──► Person confirms ──► Validate ──► 3 scenarios ──► Rules ──► AI brief
  Projects, accounting,      wizard or    PDF upload +       every AI date       (A)          base, slip,      PASS /     (words only,
  payroll                    Orbyte Sales AI suggestions     starts unconfirmed               start later      REVIEW /   no new RM)
                             webhook                                                                           BLOCKED
        ──► Email owner (simulated) ──► Owner decides (server-checked) ──► e-sign (simulated) ──► Email requester ──► Report PDF + Activity log
```

| # | Time | Scene (what to click) | What to say | Module shown |
| --- | --- | --- | --- | --- |
| 1 | 0:00–0:30 | Slide: the problem | Project SMEs accept jobs on gut feel; the cash crunch shows up weeks later when deposits, payroll and supplier bills collide. | Problem, SDG 8.3 |
| 2 | 0:30–1:05 | **Overview** | Cash today RM 190,000; lowest point in 13 weeks **RM 91,360 on 5 Dec**, before any new job. Point at "from Orbyte Projects / accounting (simulated)" and the buffer. | Orbyte Projects + Accounting adapters, forecast engine |
| 3 | 1:05–2:15 | **Start a new check** → step 1 Bangsar details → step 2 **Upload a PDF** (QT-2026-118) → text appears → **Suggest payment dates** → confirm each row | "The AI only *suggests*. Every date is unconfirmed until a person ticks it; the check refuses unconfirmed AI input." | PDF upload, AI extraction (zod-checked), validation |
| 4 | 2:15–3:30 | Step 3 **Run the check** → result page | Headline: **Needs your review**. Waterline chart; tabs: as planned **RM 49,860** (above), if things slip **RM 11,820, below the buffer from 24 Dec**, start later RM 65,120. Main contributors. AI brief labelled "decision support, not financial advice". | Engine (3 scenarios), policy rules, AI brief guard |
| 5 | 3:30–3:50 | Still as staff: decision area says only the owner can decide. Open **Outbox** | "The owner just got an email with the figures and a link to the report." | Roles (server-enforced), simulated Orbyte Connect email |
| 6 | 3:50–4:40 | Switch to **Owner (Aisyah)** → open the job → reason "Approve if client pays 30% deposit" → **Approve** | Status becomes completed; acceptance sent for e-signature (simulated). Outbox: email to Wei Jie with the decision. **Report** → **Print / save as PDF**. | Human approval, Orbyte eSign adapter, report export |
| 7 | 4:40–5:15 | Overview → **Simulate quotation from Orbyte Sales** | "In real use the quotation is already in Orbyte Sales, so the check starts itself." It creates the job, runs the check (**no rule triggered**, RM 12,000) and emails the owner. "Even with no rule triggered, the owner still decides." | Orbyte Sales auto-trigger, chained pipeline |
| 8 | 5:15–5:40 | **Settings** (show, do not save) → **Activity** | The owner sets the buffer, review threshold and customer delay; a change means jobs must be checked again before approval. Activity: every step, who and when, cannot be edited. | Owner settings, audit log |
| 9 | 5:40–6:10 | **How it works** → closing slide | Every figure is calculated by code, never by AI; AI failure never blocks the check. Impact and next steps (real Orbyte APIs, OCR for WhatsApp photos, real email). | Explainability, safeguards |

### If something goes wrong on camera

- AI slow or down: the check still runs; say "AI is optional, figures never depend on it" and enter payments by hand.
- Wrong numbers: someone changed settings. Reset demo data and record again.
