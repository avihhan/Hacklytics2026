"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import AppNav from "@/components/AppNav";

function isPublicRoute(pathname: string) {
  return pathname === "/" || pathname === "/login" || pathname === "/signup";
}

export default function NavAutoHide() {
  const pathname = usePathname();

  // Public header: show Login / Signup buttons
  if (isPublicRoute(pathname)) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
        >
          Create account
        </Link>
      </div>
    );
  }

  // App header: animated nav
  return <AppNav />;
}