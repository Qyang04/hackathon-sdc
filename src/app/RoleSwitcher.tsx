"use client";

import { useRouter } from "next/navigation";
import type { Role } from "@/lib/session";

// Simulated login: switch between owner and staff to demo permissions.
export function RoleSwitcher({ current }: { current: Role }) {
  const router = useRouter();
  async function choose(role: Role) {
    await fetch("/api/session", { method: "POST", body: JSON.stringify({ role }) });
    router.refresh();
  }
  return (
    <div className="segmented" role="group" aria-label="Switch simulated role">
      <button type="button" aria-pressed={current === "OWNER"} onClick={() => choose("OWNER")}>Owner</button>
      <button type="button" aria-pressed={current === "STAFF"} onClick={() => choose("STAFF")}>Staff</button>
    </div>
  );
}
