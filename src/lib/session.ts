import { cookies } from "next/headers";

// Simulated login and roles (allowed by D2 section 3-4). Not real authentication.
export type Role = "OWNER" | "STAFF";
export interface Session {
  role: Role;
  name: string;
}

export const NAMES: Record<Role, string> = { OWNER: "Aisyah (Owner)", STAFF: "Wei Jie (Project lead)" };

export async function getSession(): Promise<Session> {
  const role = (await cookies()).get("role")?.value === "STAFF" ? "STAFF" : "OWNER";
  return { role, name: NAMES[role] };
}

/** Only the owner may approve or reject (backend check; never rely on hiding buttons). */
export function canDecide(s: Session): boolean {
  return s.role === "OWNER";
}
