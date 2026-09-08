"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "", label: "Resumen" },
  { href: "/paquetes", label: "Paquetes" },
  { href: "/gastos", label: "Gastos" },
  { href: "/validaciones", label: "Puntos de atención" },
  { href: "/reportes", label: "Reporte semanal" },
];

export function ObraNav({ obraId }: { obraId: string }) {
  const pathname = usePathname();
  const base = `/obras/${obraId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 md:w-48 md:shrink-0 md:flex-col md:gap-0.5 md:border-b-0 md:border-r md:px-3 md:py-4">
      {ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const activo =
          item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.href}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activo
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-black/[.03] hover:text-foreground dark:hover:bg-white/[.06]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
