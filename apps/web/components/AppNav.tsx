"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

const items: Item[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/report", label: "Report" },
  { href: "/chat", label: "Chat" },
  { href: "/call", label: "Call" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppNav() {
  const pathname = usePathname();

  const activeIndex = Math.max(
    0,
    items.findIndex((it) => isActive(pathname, it.href))
  );


  const itemW = 104; // px (w-[104px])
  const gap = 8;     // px (gap-2)

  const left = activeIndex * (itemW + gap);

  return (
    <div className="relative">
      {/* Track */}
      <div className="relative flex gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
        {/* Active indicator */}
        <div
          className="pointer-events-none absolute top-1 left-1 h-9 w-[104px] rounded-xl bg-emerald-400/90 shadow-[0_0_22px_rgba(52,211,153,0.45)] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${left}px)` }}
        />

        {items.map((it) => {
          const active = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "relative z-10 flex h-9 w-[104px] items-center justify-center rounded-xl text-sm font-semibold transition",
                active ? "text-slate-950" : "text-white/80 hover:text-white",
              ].join(" ")}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
