// Demo company: a small Klang Valley fit-out contractor. Every name and figure is synthetic.
// One source for the seed, the demo reset and the demo-story test (src/lib/demo/demo.test.ts).
// Money is integer sen. The opening date is a Monday; the 13-week horizon runs 2026-11-02 to 2027-01-31.
import type { ProposalEventInput } from "../engine/types";

export const DEMO_COMPANY = {
  companyName: "Contoh Renovation Sdn Bhd (synthetic)",
  openingCashSen: 19_000_000, // RM 190,000.00 in the bank at the start of the opening date
  openingDate: "2026-11-02",
  reserveSen: 3_000_000, // RM 30,000.00: about three weeks of fixed costs
  approvalThresholdSen: 5_000_000, // RM 50,000.00: jobs above this always go to the owner
  customerDelayDays: 21, // "customers usually pay about three weeks late"
};

export interface DemoProject {
  key: string;
  name: string;
  client: string;
  status: "ACTIVE" | "COMPLETED" | "ON_HOLD";
  startDate: string;
  endDate: string;
  contractValueSen: number;
}

export interface DemoEvent {
  key: string;
  projectKey: string | null; // null = company-level
  direction: "IN" | "OUT";
  amountSen: number;
  paidSen?: number;
  date: string;
  status: "PLANNED" | "COMMITTED" | "PAID" | "CANCELLED";
  confidence: "CONFIRMED" | "ESTIMATED";
  counterparty: string;
  label: string;
}

export interface DemoRecurring {
  label: string;
  amountSen: number;
  frequency: "WEEKLY" | "MONTHLY";
  nextDate: string;
  endDate?: string;
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    key: "shoplot",
    name: "Shoplot renovation, Jalan Contoh 3",
    client: "Kafe Contoh (synthetic)",
    status: "ACTIVE",
    startDate: "2026-09-14",
    endDate: "2026-12-11",
    contractValueSen: 18_000_000,
  },
  {
    key: "clinic",
    name: "Clinic fit-out, Taman Contoh",
    client: "Klinik Sihat Contoh (synthetic)",
    status: "ACTIVE",
    startDate: "2026-11-02",
    endDate: "2027-01-29",
    contractValueSen: 24_000_000,
  },
  {
    key: "office",
    name: "Office repaint and partitions, Menara Contoh",
    client: "Contoh Logistik Sdn Bhd (synthetic)",
    status: "ACTIVE",
    startDate: "2026-10-19",
    endDate: "2026-11-27",
    contractValueSen: 6_000_000,
  },
];

// Receipts are progress claims; ESTIMATED means the client has not confirmed the payment date.
export const DEMO_EVENTS: DemoEvent[] = [
  // Shoplot renovation
  { key: "shoplot-claim1", projectKey: "shoplot", direction: "IN", amountSen: 5_400_000, paidSen: 5_400_000, date: "2026-10-12", status: "PAID", confidence: "CONFIRMED", counterparty: "Kafe Contoh (synthetic)", label: "Progress claim 1 (30%)" },
  { key: "shoplot-claim2", projectKey: "shoplot", direction: "IN", amountSen: 3_420_000, date: "2026-10-26", status: "COMMITTED", confidence: "ESTIMATED", counterparty: "Kafe Contoh (synthetic)", label: "Progress claim 2 (20%), overdue, less 5% retention" },
  { key: "shoplot-claim2-retention", projectKey: "shoplot", direction: "IN", amountSen: 180_000, date: "2027-01-10", status: "PLANNED", confidence: "CONFIRMED", counterparty: "Kafe Contoh (synthetic)", label: "Retention 5% of claim 2, after the defects liability period" },
  { key: "shoplot-claim3", projectKey: "shoplot", direction: "IN", amountSen: 5_130_000, date: "2026-12-21", status: "PLANNED", confidence: "ESTIMATED", counterparty: "Kafe Contoh (synthetic)", label: "Final claim (30%), less 5% retention" },
  { key: "shoplot-claim3-retention", projectKey: "shoplot", direction: "IN", amountSen: 270_000, date: "2027-02-20", status: "PLANNED", confidence: "CONFIRMED", counterparty: "Kafe Contoh (synthetic)", label: "Retention 5% of final claim, after defects liability period" },
  { key: "shoplot-tiles-deposit", projectKey: "shoplot", direction: "OUT", amountSen: 720_000, date: "2026-11-02", status: "COMMITTED", confidence: "CONFIRMED", counterparty: "Jubin Contoh Trading (synthetic)", label: "Tiles PO deposit (40%)" },
  { key: "shoplot-tiles", projectKey: "shoplot", direction: "OUT", amountSen: 1_080_000, date: "2026-11-09", status: "COMMITTED", confidence: "CONFIRMED", counterparty: "Jubin Contoh Trading (synthetic)", label: "Tiles PO balance (60%)" },
  { key: "shoplot-carpentry", projectKey: "shoplot", direction: "OUT", amountSen: 2_400_000, paidSen: 1_200_000, date: "2026-11-23", status: "COMMITTED", confidence: "CONFIRMED", counterparty: "Kayu Contoh Works (synthetic)", label: "Carpentry subcontractor, half paid" },

  // Clinic fit-out
  { key: "clinic-deposit", projectKey: "clinic", direction: "IN", amountSen: 4_800_000, paidSen: 4_800_000, date: "2026-10-28", status: "PAID", confidence: "CONFIRMED", counterparty: "Klinik Sihat Contoh (synthetic)", label: "Deposit (20%)" },
  { key: "clinic-claim1", projectKey: "clinic", direction: "IN", amountSen: 6_840_000, date: "2026-12-07", status: "COMMITTED", confidence: "CONFIRMED", counterparty: "Klinik Sihat Contoh (synthetic)", label: "Progress claim 1 (30%), certified, less 5% retention" },
  { key: "clinic-claim1-retention", projectKey: "clinic", direction: "IN", amountSen: 360_000, date: "2027-02-28", status: "PLANNED", confidence: "CONFIRMED", counterparty: "Klinik Sihat Contoh (synthetic)", label: "Retention 5% of claim 1, after defects liability period" },
  { key: "clinic-claim2", projectKey: "clinic", direction: "IN", amountSen: 6_840_000, date: "2027-01-25", status: "PLANNED", confidence: "ESTIMATED", counterparty: "Klinik Sihat Contoh (synthetic)", label: "Progress claim 2 (30%), less 5% retention" },
  { key: "clinic-claim2-retention", projectKey: "clinic", direction: "IN", amountSen: 360_000, date: "2027-03-01", status: "PLANNED", confidence: "CONFIRMED", counterparty: "Klinik Sihat Contoh (synthetic)", label: "Retention 5% of claim 2, after defects liability period" },
  { key: "clinic-materials1", projectKey: "clinic", direction: "OUT", amountSen: 2_600_000, date: "2026-11-16", status: "COMMITTED", confidence: "CONFIRMED", counterparty: "Bahan Binaan Contoh (synthetic)", label: "Materials, first delivery" },
  { key: "clinic-mne", projectKey: "clinic", direction: "OUT", amountSen: 3_000_000, date: "2026-12-14", status: "COMMITTED", confidence: "CONFIRMED", counterparty: "Elektrik Contoh M&E (synthetic)", label: "M&E subcontractor, stage 1" },
  { key: "clinic-materials2", projectKey: "clinic", direction: "OUT", amountSen: 2_000_000, date: "2026-12-21", status: "PLANNED", confidence: "CONFIRMED", counterparty: "Bahan Binaan Contoh (synthetic)", label: "Materials, second delivery" },
  { key: "clinic-mne2", projectKey: "clinic", direction: "OUT", amountSen: 2_500_000, date: "2027-01-11", status: "PLANNED", confidence: "CONFIRMED", counterparty: "Elektrik Contoh M&E (synthetic)", label: "M&E subcontractor, stage 2" },

  // Office repaint
  { key: "office-paint", projectKey: "office", direction: "OUT", amountSen: 900_000, date: "2026-11-06", status: "COMMITTED", confidence: "CONFIRMED", counterparty: "Cat Contoh Supplies (synthetic)", label: "Paint and labour" },
  { key: "office-glass", projectKey: "office", direction: "OUT", amountSen: 400_000, date: "2026-11-13", status: "CANCELLED", confidence: "CONFIRMED", counterparty: "Kaca Contoh (synthetic)", label: "Glass panels PO (cancelled, client changed design)" },
  { key: "office-final", projectKey: "office", direction: "IN", amountSen: 2_850_000, date: "2026-12-28", status: "PLANNED", confidence: "CONFIRMED", counterparty: "Contoh Logistik Sdn Bhd (synthetic)", label: "Final claim (50%), less 5% retention" },
  { key: "office-final-retention", projectKey: "office", direction: "IN", amountSen: 150_000, date: "2027-02-28", status: "PLANNED", confidence: "CONFIRMED", counterparty: "Contoh Logistik Sdn Bhd (synthetic)", label: "Retention 5% of final claim, after defects liability period" },

  // Company
  { key: "sst", projectKey: null, direction: "OUT", amountSen: 650_000, date: "2026-11-30", status: "COMMITTED", confidence: "CONFIRMED", counterparty: "Royal Malaysian Customs (simulated)", label: "Service tax for Sep-Oct" },
];

// Fixed company costs. Rent is due on the 1st; EPF/SOCSO/EIS for the previous month by the 15th; salaries on the 28th.
export const DEMO_RECURRING: DemoRecurring[] = [
  { label: "Salaries (9 staff)", amountSen: 3_200_000, frequency: "MONTHLY", nextDate: "2026-11-28" },
  { label: "EPF, SOCSO and EIS", amountSen: 520_000, frequency: "MONTHLY", nextDate: "2026-11-15" },
  { label: "Workshop and office rent", amountSen: 450_000, frequency: "MONTHLY", nextDate: "2026-12-01" },
  { label: "Lorry hire purchase", amountSen: 185_000, frequency: "MONTHLY", nextDate: "2026-11-05" },
  { label: "Site workers' weekly wages", amountSen: 220_000, frequency: "WEEKLY", nextDate: "2026-11-06" },
  { label: "Utilities and internet", amountSen: 85_000, frequency: "MONTHLY", nextDate: "2026-11-03" },
  { label: "Diesel and petrol", amountSen: 110_000, frequency: "MONTHLY", nextDate: "2026-11-10" },
  { label: "LHDN CP204 tax instalment", amountSen: 150_000, frequency: "MONTHLY", nextDate: "2026-11-20" },
  { label: "Insurance (CAR and vehicles)", amountSen: 64_000, frequency: "MONTHLY", nextDate: "2026-11-25" },
];

// The job used in the demo. The quotation text is what staff paste in step 2; the events are what a person
// should end up confirming. As planned it stays above the buffer; if things slip it falls below.
export const DEMO_PROPOSAL = {
  title: "Restaurant fit-out, Bangsar",
  client: "Restoran Contoh Bangsar (synthetic)",
  startDate: "2026-11-16",
  durationDays: 60,
  contractValueSen: 8_500_000,
  budgetSen: 6_200_000,
  sourceText: [
    "QUOTATION QT-2026-118 (synthetic)",
    "Restoran Contoh Bangsar - kitchen and dining fit-out, approx. 8 weeks from site possession on 16 Nov 2026.",
    "Contract sum: RM 85,000.00",
    "Payment terms:",
    "  1. 10% deposit (RM 8,500.00) on signing, payable on site possession.",
    "  2. 40% progress claim (RM 34,000.00) on completion of kitchen works, est. 4 weeks after start.",
    "  3. 50% balance (RM 42,500.00) on handover, est. 60 days after start.",
    "Our costs (internal): kitchen equipment RM 28,000 due on order (week 1); joinery subcontractor RM 22,000 in week 3;",
    "M&E and finishing RM 12,000 in week 6.",
  ].join("\n"),
  events: [
    { id: "demo-p1", direction: "IN", amountSen: 850_000, offsetDays: 0, confidence: "CONFIRMED", label: "10% deposit", source: "MANUAL", confirmed: true },
    { id: "demo-p2", direction: "OUT", amountSen: 2_800_000, offsetDays: 3, confidence: "CONFIRMED", label: "Kitchen equipment", source: "MANUAL", confirmed: true },
    { id: "demo-p3", direction: "OUT", amountSen: 2_200_000, offsetDays: 17, confidence: "CONFIRMED", label: "Joinery subcontractor", source: "MANUAL", confirmed: true },
    { id: "demo-p4", direction: "IN", amountSen: 3_400_000, offsetDays: 28, confidence: "ESTIMATED", label: "40% progress claim", source: "MANUAL", confirmed: true },
    { id: "demo-p5", direction: "OUT", amountSen: 1_200_000, offsetDays: 38, confidence: "CONFIRMED", label: "M&E and finishing", source: "MANUAL", confirmed: true },
    { id: "demo-p6", direction: "IN", amountSen: 4_250_000, offsetDays: 60, confidence: "ESTIMATED", label: "50% balance on handover", source: "MANUAL", confirmed: true },
  ] satisfies ProposalEventInput[],
};

// The quotation a simulated Orbyte Sales webhook delivers (stretch: "New quotation in Orbyte Sales
// starts a check automatically · simulated", Plan v2). Structured data, as a real Sales integration
// would send — no AI involved, so the auto-trigger demo never depends on the AI provider (D5).
// A small job on purpose: RM 12,000 is below the RM 50,000 review threshold, so it shows the
// automatic path (no owner review) next to the Bangsar job (which does need review).
export const DEMO_QUOTATION = {
  title: "Signage and awning, second outlet",
  client: "Kedai Kopi Contoh (synthetic)",
  startDate: "2026-11-23",
  durationDays: 21,
  contractValueSen: 1_200_000,
  budgetSen: 750_000,
  justification: "Second outlet opening; signage installed before opening day.",
  sourceText: [
    "QUOTATION QT-2026-121 (synthetic)",
    "Kedai Kopi Contoh - signage and awning for the second outlet, 3 weeks from 23 Nov 2026.",
    "Contract sum: RM 12,000.00",
    "Payment terms: 20% deposit on signing; 40% progress claim on fabrication, est. day 14; 40% balance on completion.",
    "Our costs (internal): signboard supplier deposit RM 3,000 on order; installation labour RM 2,200 in week 2.",
  ].join("\n"),
  events: [
    { direction: "IN", amountSen: 240_000, offsetDays: 0, confidence: "CONFIRMED", counterparty: "Kedai Kopi Contoh", label: "20% deposit" },
    { direction: "OUT", amountSen: 300_000, offsetDays: 2, confidence: "CONFIRMED", counterparty: "Signboard Sdn Bhd", label: "Signage supplier deposit" },
    { direction: "OUT", amountSen: 220_000, offsetDays: 10, confidence: "CONFIRMED", counterparty: "Site crew", label: "Installation labour" },
    { direction: "IN", amountSen: 480_000, offsetDays: 14, confidence: "ESTIMATED", counterparty: "Kedai Kopi Contoh", label: "40% progress claim" },
    { direction: "IN", amountSen: 480_000, offsetDays: 21, confidence: "ESTIMATED", counterparty: "Kedai Kopi Contoh", label: "40% balance on completion" },
  ] satisfies Array<{ direction: "IN" | "OUT"; amountSen: number; offsetDays: number; confidence: "CONFIRMED" | "ESTIMATED"; counterparty: string; label: string }>,
};
