// POST /api/requests/:id/forecast
// validate -> (if no ERROR) compareProposal for BASE, DOWNSIDE, DEFERRED_START -> evaluatePolicy
// -> try generateBrief (AI failure keeps figures; brief = null) -> save ForecastRun -> status CHECKED or NEEDS_INFO
// -> logActivity FORECAST_RUN -> simulated email (owner if checked, requester if blocked). Returns { runId, validation, comparisons, policy, brief }.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { lockCompanySettings } from "@/lib/settings-lock";
import { simulatedAccounting } from "@/lib/adapters/orbyte";
import { compareProposal, formatRM, scenarioPresets } from "@/lib/engine";
import type { ComparisonResult, ForecastSettings, ProposalInput } from "@/lib/engine";
import { validateRequest } from "@/lib/validation/validate";
import { evaluatePolicy } from "@/lib/policy/policy";
import { generateBrief } from "@/lib/ai/brief";
import type { DecisionBrief } from "@/lib/ai/schemas";
import { saveCheck } from "@/lib/runs";
import { checkNotification, sendNotification } from "@/lib/notify";

const RUNNABLE = ["DRAFT", "NEEDS_INFO", "CHECKED"];
const MIN_HORIZON_DAYS = 91; // 13 weeks

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await prisma.commitmentRequest.findUnique({ where: { id }, include: { events: true } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!RUNNABLE.includes(request.status)) {
    return NextResponse.json({ error: `A decision has already been made (status ${request.status})` }, { status: 409 });
  }
  const requestSnapshot = JSON.stringify({
    ...request,
    events: [...request.events].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  });
  const company = await prisma.companySettings.findUnique({ where: { id: 1 } });
  if (!company) return NextResponse.json({ error: "Company settings missing; run the seed" }, { status: 500 });

  const settings: ForecastSettings = {
    openingCashSen: company.openingCashSen,
    openingDate: company.openingDate,
    reserveSen: company.reserveSen,
    minHorizonDays: MIN_HORIZON_DAYS,
  };
  const proposal: ProposalInput = {
    requestId: request.id,
    startDate: request.startDate,
    events: request.events.map((e) => ({
      id: e.id,
      direction: e.direction as "IN" | "OUT",
      amountSen: e.amountSen,
      offsetDays: e.offsetDays ?? -1, // unknown date: validation reports it
      confidence: e.confidence as "CONFIRMED" | "ESTIMATED",
      label: e.label,
      source: e.source as "SEEDED" | "MANUAL" | "AI_EXTRACTED",
      confirmed: e.confirmed,
    })),
  };

  // 1. Validate
  const validation = validateRequest(
    {
      title: request.title,
      client: request.client,
      startDate: request.startDate,
      durationDays: request.durationDays,
      contractValueSen: request.contractValueSen,
      budgetSen: request.budgetSen,
      proposal,
    },
    settings.openingDate,
  );
  const blocked = validation.some((i) => i.severity === "ERROR");

  // 2. Forecast the three scenarios (skipped when the inputs are incomplete)
  let comparisons: ComparisonResult[] = [];
  if (!blocked) {
    const [existing, recurring] = await Promise.all([simulatedAccounting.listCashEvents(), simulatedAccounting.listRecurringCosts()]);
    comparisons = scenarioPresets(company.customerDelayDays).map((s) => compareProposal(existing, recurring, proposal, settings, s));
  }
  const base = comparisons.find((c) => c.scenario.name === "BASE") ?? null;
  const downside = comparisons.find((c) => c.scenario.name === "DOWNSIDE") ?? null;

  // 3. Policy
  const config = { reserveSen: company.reserveSen, approvalThresholdSen: company.approvalThresholdSen };
  const policy = evaluatePolicy({ config, contractValueSen: request.contractValueSen, validationIssues: validation, base, downside });

  // 4. AI brief: optional; any failure leaves the figures and outcome untouched
  let brief: DecisionBrief | null = null;
  if (base && downside) {
    try {
      brief = await generateBrief(base, downside, policy);
    } catch {
      brief = null;
    }
  }

  // 5. Recheck and save atomically after calculation and AI finish.
  const session = await getSession();
  const status = policy.outcome === "BLOCKED"
    ? "NEEDS_INFO"
    : "CHECKED";

  const result = await prisma.$transaction(async (tx) => {
    await lockCompanySettings(tx);

    const current = await tx.commitmentRequest.findUnique({
      where: { id },
      include: { events: true },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 },
      );
    }

    if (!RUNNABLE.includes(current.status)) {
      return NextResponse.json(
        {
          error:
            "The request was decided while this check was running. The result was not saved.",
        },
        { status: 409 },
      );
    }

    const currentSnapshot = JSON.stringify({
      ...current,
      events: [...current.events].sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
    });

    if (currentSnapshot !== requestSnapshot) {
      return NextResponse.json(
        {
          error:
            "The request changed while this check was running. Run the check again.",
        },
        { status: 409 },
      );
    }

    const currentCompany = await tx.companySettings.findUnique({
      where: { id: 1 },
    });

    const settingFields = [
      "openingCashSen",
      "openingDate",
      "reserveSen",
      "approvalThresholdSen",
      "customerDelayDays",
    ] as const;

    if (
      !currentCompany ||
      settingFields.some(
        (field) => currentCompany[field] !== company[field],
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Company settings changed while this check was running. Run the check again.",
        },
        { status: 409 },
      );
    }

    const claimed = await tx.commitmentRequest.updateMany({
      where: { id, status: current.status },
      data: { status },
    });

    if (claimed.count !== 1) {
      return NextResponse.json(
        {
          error:
            "The request changed before the result could be saved. Run the check again.",
        },
        { status: 409 },
      );
    }

    const runId = await saveCheck(
      request.id,
      {
        settings: {
          ...settings,
          ...config,
          customerDelayDays: company.customerDelayDays,
        },
        proposal,
        validation,
      },
      comparisons,
      policy,
      brief,
      tx,
    );

    await tx.activityLog.create({
      data: {
        requestId: id,
        actor: session.name,
        action: "FORECAST_RUN",
        detail: base
          ? `Check run: ${policy.outcome}; lowest cash with the job ${formatRM(base.withProposal.metrics.minBalanceSen)} on ${base.withProposal.metrics.minBalanceDate}`
          : `Check run: ${policy.outcome}; ${validation.filter((issue) => issue.severity === "ERROR").length} item(s) to fix`,
      },
    });

    return { runId };
  }, {
    maxWait: 10_000,
    timeout: 20_000,
  });

  if (result instanceof NextResponse) {
    return result;
  }

  // 6. Tell the next person (simulated email); after the save, so it never blocks the check
  await sendNotification(id, checkNotification(request, policy, base));

  return NextResponse.json({
    runId: result.runId,
    validation,
    comparisons,
    policy,
    brief,
  });
}