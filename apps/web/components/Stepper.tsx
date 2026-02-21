"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Step = {
  href: string;
  label: string;
};

const steps: Step[] = [
  { href: "/upload", label: "Upload" },
  { href: "/report", label: "Report" },
  { href: "/chat", label: "Chat" },
  { href: "/call", label: "Call" },
];

function isOnStep(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Stepper() {
  const pathname = usePathname();

  // Show stepper only on these flow pages (not on /dashboard)
  const activeIndex = steps.findIndex((s) => isOnStep(pathname, s.href));
  if (activeIndex === -1) return null;

  const pct = steps.length === 1 ? 0 : (activeIndex / (steps.length - 1)) * 100;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-white/70">
          Flow
        </div>
        <div className="text-xs text-white/50">
          Step {activeIndex + 1} of {steps.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)] transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {steps.map((s, i) => {
          const active = i === activeIndex;
          const done = i < activeIndex;

          return (
            <Link
              key={s.href}
              href={s.href}
              className={[
                "rounded-2xl border px-3 py-3 transition",
                active
                  ? "border-emerald-400/40 bg-emerald-400/10"
                  : "border-white/10 bg-black/20 hover:bg-black/30",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <div
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    active
                      ? "bg-emerald-400 text-slate-950"
                      : done
                      ? "bg-white/10 text-white"
                      : "bg-white/5 text-white/70",
                  ].join(" ")}
                >
                  {done ? "✓" : i + 1}
                </div>

                <div className="min-w-0">
                  <div
                    className={[
                      "text-sm font-semibold truncate",
                      active ? "text-white" : "text-white/80",
                    ].join(" ")}
                  >
                    {s.label}
                  </div>
                  <div className="text-xs text-white/50">
                    {done ? "Done" : active ? "Current" : "Next"}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}