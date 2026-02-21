import Link from "next/link";

export default function Login() {
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <p className="mt-1 text-sm text-white/70">Sign up to get started.</p>

        <form className="mt-6 space-y-4">
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
            className="w-full rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
          >
            Sign up
          </button>
        </form>

        <div className="mt-5 text-sm text-white/70">
          Already have an account{" "}
          <Link href="/signup" className="text-emerald-300 hover:text-emerald-200">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}