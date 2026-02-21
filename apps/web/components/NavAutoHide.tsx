"use client";

import { usePathname } from "next/navigation";
import AppNav from "@/components/AppNav";

function shouldHide(pathname: string) {
  // hide on auth routes
  return pathname === "/login" || pathname === "/signup" || pathname.startsWith("/(auth)");
}

export default function NavAutoHide() {
  const pathname = usePathname();

  if (shouldHide(pathname)) return null;

  return <AppNav />;
}