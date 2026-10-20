// POST /api/requests/:id/forecast
// validate -> (if no ERROR) compareProposal for BASE, DOWNSIDE, DEFERRED_START -> evaluatePolicy
// -> try generateBrief (AI failure keeps figures; brief = null) -> save ForecastRun -> status CHECKED or NEEDS_INFO
// -> logActivity FORECAST_RUN. Returns { runId, validation, comparisons, policy, brief }.
import { notImplemented } from "../../../notImplemented";

export async function POST() {
  return notImplemented("POST /api/requests/:id/forecast");
}
