import type { Metadata } from "next";
import Link from "next/link";
import { Hanken_Grotesk, IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { RoleSwitcher } from "./RoleSwitcher";
import { NavLinks } from "./NavLinks";

// Fonts are downloaded at build time and served by the app (no runtime call to Google)
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
const newsreader = Newsreader({ subsets: ["latin"], style: "italic", variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: "Commitment Copilot",
  description: "Check a new project commitment against existing obligations before you accept it.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, company, awaiting] = await Promise.all([
    getSession(),
    prisma.companySettings.findUnique({ where: { id: 1 }, select: { companyName: true } }),
    prisma.commitmentRequest.count({ where: { status: "CHECKED" } }),
  ]);
  return (
    <html lang="en" className={`${hanken.variable} ${plexMono.variable} ${newsreader.variable}`}>
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link href="/" className="brand">Commitment Copilot</Link>
            {company && <span className="company">{company.companyName}</span>}
            <NavLinks awaiting={awaiting} />
            <div className="viewing">
              <div className="who">
                Viewing as<b>{session.name}</b>
              </div>
              <RoleSwitcher current={session.role} />
              <span className="sim">Orbyte data: simulated</span>
            </div>
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
