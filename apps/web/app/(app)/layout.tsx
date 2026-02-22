"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import Stepper from "@/components/Stepper";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isClient = useIsClient();
  const authed = isClient ? isAuthed() : false;

  useEffect(() => {
    if (!isClient) return;
    if (!authed) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [authed, isClient, pathname, router]);

  if (!isClient) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
        Checking session...
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
        Redirecting to sign in...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper />
      {children}
    </div>
  );
}
