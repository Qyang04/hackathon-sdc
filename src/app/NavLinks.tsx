"use client";
// Sidebar links; highlights the current section. The count shows checks waiting for the owner.
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ awaiting }: { awaiting: number }) {
  const path = usePathname();
  const links = [
    { href: "/", text: "Overview", active: path === "/" || (path.startsWith("/requests/") && path !== "/requests/new") },
    { href: "/requests/new", text: "New check", active: path === "/requests/new" },
    { href: "/how", text: "How it works", active: path.startsWith("/how") },
    { href: "/activity", text: "Activity", active: path === "/activity" },
  ];
  return (
    <nav>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={l.active ? "active" : undefined} aria-current={l.active ? "page" : undefined}>
          {l.text}
          {l.href === "/" && awaiting > 0 && <span className="count" title="Checks waiting for the owner">{awaiting}</span>}
        </Link>
      ))}
    </nav>
  );
}
