// Preview of the result page with hand-written figures, so the layout can be reviewed before the engine exists.
// Remove (or keep for the pitch as a design reference) once /requests/[id] renders real runs.
import { ResultView } from "../../requests/[id]/ResultView";
import { mockBrief, mockComparisons, mockPolicy, mockReserveSen } from "./mockResult";

export default function ResultPreviewPage() {
  return (
    <>
      <h1>Result preview</h1>
      <div className="card todo">Preview with sample figures written by hand. Not produced by the forecast engine.</div>
      <ResultView comparisons={mockComparisons} policy={mockPolicy} brief={mockBrief} reserveSen={mockReserveSen} />
    </>
  );
}
