"use client";

import { useRouter } from "next/navigation";
import { logoutDummy } from "@/lib/auth";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        logoutDummy();
        router.push("/login");
      }}
      className="text-sm font-medium text-white/80 hover:text-white"
    >
      Logout
    </button>
  );
}