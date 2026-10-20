// Three-step wizard. Owner: Workstream C (calls B's APIs).
// 1. Describe the job (title, client, start date, duration, contract value, budget)
// 2. Paste the quotation / PO -> AI suggests payment dates -> confirm or edit each one (manual entry always available)
// 3. Run the check -> redirect to /requests/[id]
export default function NewRequestPage() {
  return (
    <>
      <h1>New commitment check</h1>
      <div className="card todo">TODO(C): three-step wizard.</div>
    </>
  );
}
