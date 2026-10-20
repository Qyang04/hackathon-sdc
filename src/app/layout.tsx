import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/session";
import { RoleSwitcher } from "./RoleSwitcher";

export const metadata: Metadata = {
  title: "Commitment Copilot",
  description: "Check a new project commitment against existing obligations before you accept it.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body>
        <header>
          <strong>Commitment Copilot</strong>
          <nav>
            <Link href="/">Overview</Link>
            <Link href="/requests/new">New check</Link>
            <Link href="/activity">Activity</Link>
          </nav>
          <span className="badge">Orbyte data: simulated</span>
          <RoleSwitcher current={session.role} />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
