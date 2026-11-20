"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/agenda", label: "Agenda" },
  { href: "/servicios", label: "Servicios" },
  { href: "/disponibilidad", label: "Disponibilidad" },
  { href: "/configuracion", label: "Configuración" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors " +
              (active ? "bg-violet text-paper" : "text-ink-soft hover:bg-mist hover:text-ink")
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
