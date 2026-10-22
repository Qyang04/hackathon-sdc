// Request status as a coloured pill with plain-language wording. Shared by overview and request pages.
const STATUS: Record<string, { text: string; tone: string }> = {
  DRAFT: { text: "Draft", tone: "plain" },
  NEEDS_INFO: { text: "Needs info", tone: "warn" },
  CHECKED: { text: "Awaiting owner", tone: "info" },
  APPROVED: { text: "Approved", tone: "ok" },
  REJECTED: { text: "Declined", tone: "danger" },
  COMPLETED: { text: "Sent for signature", tone: "ok" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { text: status, tone: "plain" };
  return <span className={`pill ${s.tone}`}>{s.text}</span>;
}
