"use client";
// Lets staff fix a job's payments from its page while it is DRAFT or NEEDS_INFO (e.g. after "Missing information"
// or the owner asking for more). Any edit sends a NEEDS_INFO job back to DRAFT on the server.
import { useRouter } from "next/navigation";
import { PaymentsEditor, type Job, type ProposalEvent } from "../PaymentsEditor";

export function EditPayments({ job, events }: { job: Job; events: ProposalEvent[] }) {
  const router = useRouter();
  return <PaymentsEditor job={job} events={events} reload={() => router.refresh()} />;
}
