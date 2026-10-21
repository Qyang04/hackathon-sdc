// POST /api/extract { requestId, sourceText } -> ExtractionResult; saves events as AI_EXTRACTED, confirmed=false.
// If AI is not configured or fails: 200 with { milestones: [], missingInfo: [...], aiAvailable: false } so the UI offers manual entry.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { aiConfigured, AiNotConfiguredError } from "@/lib/ai/client";
import { extractMilestones } from "@/lib/ai/extract";
import { rmToSen } from "@/lib/engine/money";

export async function POST(req: Request) {
  let body: { requestId?: string; sourceText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { requestId, sourceText } = body;
  if (!requestId || typeof requestId !== "string") {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }
  if (!sourceText || typeof sourceText !== "string" || sourceText.trim().length === 0) {
    return NextResponse.json({ error: "sourceText is required" }, { status: 400 });
  }

  const request = await prisma.commitmentRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Save the source text
  await prisma.commitmentRequest.update({
    where: { id: requestId },
    data: { sourceText },
  });

  // If AI is not configured, return empty result so UI offers manual entry
  if (!aiConfigured()) {
    return NextResponse.json({
      milestones: [],
      missingInfo: ["AI not configured. Enter payment dates manually."],
      aiAvailable: false,
    });
  }

  try {
    const result = await extractMilestones(sourceText);
    const session = await getSession();

    // Save extracted events as AI_EXTRACTED, confirmed=false
    for (const m of result.milestones) {
      let amountSen: number;
      try {
        amountSen = rmToSen(m.amountRM);
      } catch {
        continue; // Skip if amount can't be parsed
      }

      await prisma.cashEvent.create({
        data: {
          requestId,
          direction: m.direction,
          amountSen,
          offsetDays: m.offsetDays ?? 0,
          status: "PLANNED",
          confidence: m.confidence === "HIGH" ? "CONFIRMED" : "ESTIMATED",
          counterparty: request.client,
          label: m.label,
          source: "AI_EXTRACTED",
          sourceRef: m.sourceSnippet,
          confirmed: false,
        },
      });
    }

    await logActivity({
      requestId,
      actor: session.name,
      action: "AI_EXTRACTED",
      detail: `Extracted ${result.milestones.length} milestone(s) from quotation text`,
    });

    return NextResponse.json({
      ...result,
      aiAvailable: true,
    });
  } catch (err) {
    // AI failure: return empty result so UI offers manual entry
    const message = err instanceof AiNotConfiguredError
      ? "AI not configured"
      : err instanceof Error
        ? err.message
        : "AI extraction failed";

    return NextResponse.json({
      milestones: [],
      missingInfo: [`${message}. Enter payment dates manually.`],
      aiAvailable: false,
    });
  }
}
