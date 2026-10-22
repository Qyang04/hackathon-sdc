# End-to-end testing handbook

A simple walk-through of the whole app. Follow the tests in order; each one takes 2–5 minutes.
Tick each box as you go. If what you see is different from **You should see**, note the test number and tell the team.

---

## Before you start

**1. Start the app** (in the project folder):

```bash
npm install
npm run db:reset
npm run dev
```

Open **http://localhost:3000** in your browser.

**2. Two things to know**

- **The app pretends today is Mon 2 Nov 2026.** All cash figures start from that date, so jobs must start on or after 2 Nov 2026.
- **There is no real login.** You switch between two people with the **Owner | Staff** switch at the bottom of the left sidebar
  (on a phone it is at the top right):
  - **Staff** = Wei Jie, the project lead. He enters jobs.
  - **Owner** = Aisyah, the boss. Only she can approve or decline.

**3. Money and dates**

- Type amounts as plain numbers: `8500` or `8,500.00` (both work).
- Dates use the date picker.

---

## Test 1 — Clean start and a look around (Owner)

1. Make sure the switch shows **Owner**.
2. On **Overview**, click **Reset demo data**, then **Yes, reset**.

**You should see**

- [ ] Company name: **Contoh Renovation Sdn Bhd (synthetic)**
- [ ] Navy banner: Cash in the bank **RM 190,000**, Lowest point next 13 weeks **RM 91,360** (5 Dec 2026), Safety buffer **RM 30,000**, Jobs above this always go to you **RM 50,000**
- [ ] **Commitment checks**: "No checks yet"
- [ ] **Active projects**: 3 projects (shoplot, office repaint, clinic)
- [ ] **Money already promised**: a list of payments in and out, plus monthly/weekly costs (salaries, rent, etc.)
- [ ] Click **Activity** in the sidebar: one entry, "Demo data reset", by Aisyah

---

## Test 2 — Staff enters a new job (the main demo)

1. Switch to **Staff**.
2. Click **New check** in the sidebar.

**Step 1 · Describe the job.** Fill in exactly:

| Field | Type this |
| --- | --- |
| Job name | `Restaurant fit-out, Bangsar` |
| Client | `Restoran Contoh Bangsar (synthetic)` |
| Planned start date | 16 Nov 2026 |
| How many days it runs | `60` |
| Contract value (RM) | `85000` |
| Your cost budget (RM) | `62000` |

Click **Next: payment dates**.

**Step 2 · Payment dates**

1. Paste the quotation text from `docs/DEMO.md` into the big box and click **Suggest payment dates**.
   - **Without an AI key** (normal for now) you see the note *"AI not configured. Enter payment dates manually."* That is expected; carry on.
   - **With an AI key**, suggested payments appear with an **AI suggestion** tag and a **Confirm** button. Check each one against the table below and click **Confirm** (or **Remove** if it's wrong).
2. Under **Add a payment by hand**, add these 6 payments one at a time (click **Add payment** after each):

| Type | What for | Supplier | Expected date | Amount | Date is only an estimate |
| --- | --- | --- | --- | --- | --- |
| Client pays you | `10% deposit` | | 16 Nov 2026 | `8500` | no |
| You pay a supplier | `Kitchen equipment` | `Dapur Contoh (synthetic)` | 19 Nov 2026 | `28000` | no |
| You pay a supplier | `Joinery subcontractor` | `Kayu Contoh (synthetic)` | 3 Dec 2026 | `22000` | no |
| Client pays you | `40% progress claim` | | 14 Dec 2026 | `34000` | **yes** |
| You pay a supplier | `M&E and finishing` | `Elektrik Contoh (synthetic)` | 24 Dec 2026 | `12000` | no |
| Client pays you | `50% balance on handover` | | 15 Jan 2027 | `42500` | **yes** |

- [ ] The table shows all 6 payments, each marked **confirmed**

Click **Next: run the check**.

**Step 3 · Run the check**

- [ ] The summary shows Contract value RM 85,000.00 and Client payments listed RM 85,000.00
- Click **Run the check**. The app opens the result page.

**You should see** (top navy banner)

- [ ] Yellow tag **NEEDS YOUR REVIEW**
- [ ] Sentence: *As planned, your lowest cash is **RM 49,860** on 5 Dec 2026, above your RM 30,000 buffer. If things slip, it is **RM 11,820** on 3 Jan 2027, below the buffer.*
- [ ] A chart: white line = with this job, grey line = without, dashed line = your buffer
- [ ] Three boxes under the chart: **As planned RM 49,860** · **If things slip RM 11,820** (red) · **Start later RM 65,120**
- [ ] Yellow/amber warnings under the boxes (intended, not a bug): one overdue receipt moved to day 0, plus four "retention … is after the forecast ends" warnings from the 5% retention money released after the defects liability period
- [ ] Click each box: the chart changes to that situation

**Below the banner**

- [ ] **Rules triggered**: 2 cards. Red: cash could fall below the buffer if things slip. Yellow: contract is above the RM 50,000 review amount.
- [ ] **Summary**: "not available right now" (normal until the AI summary is built)
- [ ] **Compare situations** table and **Payments for this job** table match the figures above
- [ ] Right side, **Owner decision**: *"Only the owner can decide on this commitment. You are viewing as Wei Jie"*
- [ ] Right side, **Activity**: created, 6 payments added, check run

---

## Test 3 — Staff cannot approve

Still as **Staff** on the result page:

- [ ] There are **no** approve/decline buttons, only the message that the owner decides
- [ ] The sidebar shows a small **1** next to Overview (one check waiting for the owner)

---

## Test 4 — Owner approves

1. Switch to **Owner**. The same page reloads.
2. In **Owner decision**, the three buttons stay greyed out until you type a reason. Type:
   `Downside dips below buffer late Dec; will ask client to pay the progress claim on time.`
3. Click **Approve and send for signature**.

**You should see**

- [ ] Status at the top changes to **Sent for signature** (green)
- [ ] **Owner decision** shows a green **Approved** card with your reason, Aisyah's name and the time
- [ ] Text: *"Acceptance sent for e-signature (simulated Orbyte eSign)."*
- [ ] **Activity** (right side) has two new entries: the decision, and the e-signature sent (with an envelope number like `SIM-ESIGN-…`)
- [ ] Back on **Overview**, the job shows **Sent for signature** and the **1** badge is gone

---

## Test 5 — A small job that triggers no rule

1. Switch to **Staff**, click **New check**.
2. Step 1: Job name `Office pantry upgrade`, Client `Contoh Logistik Sdn Bhd (synthetic)`, start **23 Nov 2026**, `30` days, contract `24000`, budget `14000`.
3. Step 2: skip the quotation box. Add 3 payments by hand:

| Type | What for | Expected date | Amount | Estimate |
| --- | --- | --- | --- | --- |
| Client pays you | `50% deposit` | 23 Nov 2026 | `12000` | no |
| You pay a supplier | `Pantry cabinets` | 30 Nov 2026 | `14000` | no |
| Client pays you | `50% balance` | 23 Dec 2026 | `12000` | no |

4. Next → **Run the check**.

**You should see**

- [ ] Green tag **NO RULE TRIGGERED**
- [ ] As planned **RM 89,360** · If things slip **RM 54,630** · Start later **RM 91,360**, all "above buffer"
- [ ] **Your rules**: green card "None of your rules were crossed."
- [ ] The note says every job still needs the owner's decision

5. Switch to **Owner** and try the other two buttons:
   - Type a reason, click **Ask for more information** → status **Needs info**, yellow card in Owner decision
   - (Or **Decline** → status **Declined**, red card)

---

## Test 6 — Missing information (the check refuses to run)

1. As **Staff**, **New check**. Step 1: Job name `Test missing info`, Client `Test client`, start **30 Nov 2026**, `10` days, contract `5000`, budget `3000`.
2. Step 2: add **no** payments. Click **Next: run the check**, then **Run the check**.

**You should see**

- [ ] Red tag **MISSING INFORMATION**
- [ ] *"Some details need fixing before the cash check can run."* and the reason *"Add at least one payment…"*
- [ ] **Notes on the inputs**: two yellow notes saying the payments (RM 0.00) don't match the contract value and the budget
- [ ] No chart and no figures (the app never guesses)
- [ ] Status **Needs info**; there are no decision buttons, even as Owner

**Now fix it** (still as Staff, on the same page):

3. Scroll to **Payments for this job**. Under **Add a payment by hand**, add:
   - Client pays you · `Full payment` · 30 Nov 2026 · `5000`
   - You pay a supplier · `Materials` · 2 Dec 2026 · `3000`
4. Click **Run the check again** (top right).

- [ ] Status changes to **Awaiting owner**, with a green **NO RULE TRIGGERED** banner and a chart
- [ ] The payment form is gone (payments are locked once the check has run)
- [ ] Activity shows: payments added, status back to draft, check run

---

## Test 7 — Activity log

Click **Activity** in the sidebar.

- [ ] Entries are grouped by day, newest first
- [ ] Each entry shows what happened, who did it, the time, and a link to the job
- [ ] You can find: Demo data reset → created → payments added → check run → owner decision → e-signature sent
- [ ] Nothing on this page can be edited

---

## Test 8 — Reset again (Owner only)

1. Switch to **Staff** and open **Overview**: there is **no** Reset button.
2. Switch to **Owner**: click **Reset demo data** → **Cancel** (nothing happens), then again → **Yes, reset**.

- [ ] All checks are gone; Activity has one entry again. You're ready for the next run or the video.

---

## Optional checks

- **Phone size:** make the browser narrow (or open on a phone on the same Wi-Fi). The sidebar becomes a top bar, and the right column moves under the details.
- **Hover the chart:** hovering over a week shows the exact figures for that week.
- **Click a row** in *Commitment checks* on the Overview: the whole row opens the job.

---

## If something goes wrong

| Problem | Fix |
| --- | --- |
| "No company settings found" | Run `npm run db:reset` |
| Page shows an error after code changes | Stop the app (Ctrl+C), run `npm run dev` again |
| Port 3000 busy | Close the other terminal running the app, or open the port number it prints (e.g. 3001) |
| Figures don't match this handbook | Reset demo data first (Test 1), then repeat the test exactly. If still different, tell the team: the demo data or the engine changed |
| Refreshed in the middle of New check | The job was saved as a draft, but the wizard lost its place. Start a new check |
