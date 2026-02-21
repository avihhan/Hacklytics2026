"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginDummy } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/dashboard";
  const signupHref = `/signup?next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-white/70">Sign in to continue.</p>

        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="text-xs text-white/70">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/60"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="text-xs text-white/70">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/60"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              loginDummy();
              router.push(next);
            }}
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
          >
            Sign in (demo)
          </button>
        </form>

        <div className="mt-5 text-sm text-white/70">
          New here?{" "}
          <Link href={signupHref} className="text-emerald-300 hover:text-emerald-200">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
