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
    <label style={{ marginLeft: "auto" }}>
      Acting as{" "}
      <select value={current} onChange={(e) => choose(e.target.value as Role)}>
        <option value="OWNER">Owner</option>
        <option value="STAFF">Staff</option>
      </select>
    </label>
  );
}
