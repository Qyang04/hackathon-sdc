// Result + decision page. Owner: Workstream C.
// Shows: plain-language result ("Lowest cash: RM 12,400 in week of 18 Nov, below your RM 20,000 buffer"),
// base / downside / deferred-start comparison, main contributing payments, unconfirmed inputs,
// AI brief labelled "Decision support, not financial advice", owner actions, activity for this request.
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <h1>Commitment check {id}</h1>
      <div className="card todo">TODO(C): result, comparison, brief, decision buttons (owner only), activity.</div>
    </>
  );
}
