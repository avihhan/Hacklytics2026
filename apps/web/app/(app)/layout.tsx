"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthed } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authed = isAuthed();

  useEffect(() => {
    if (!authed) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authed, router, pathname]);

  if (!authed) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
