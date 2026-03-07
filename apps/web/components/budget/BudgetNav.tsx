"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/budget", label: "Dashboard" },
  { href: "/budget/transactions", label: "Transactions" },
  { href: "/budget/budgets", label: "Budgets" },
  { href: "/budget/reports", label: "Reports" },
  { href: "/budget/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/budget") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BudgetNav() {
  const pathname = usePathname();
  return (
    <nav className="grid gap-2 sm:grid-cols-5">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "rounded-xl border px-3 py-2 text-sm font-medium transition",
              active
                ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-100"
                : "border-white/10 bg-black/20 text-white/75 hover:bg-black/30 hover:text-white",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

