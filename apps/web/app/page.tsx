import Link from "next/link";

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/70">{desc}</div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
            Hacklytics 2026 • Golden Byte
            <span className="h-1 w-1 rounded-full bg-white/40" />
            Grounded answers (RAG)
          </div>

          <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
            Turn tax documents into a clear filing-ready report.
          </h1>

          <p className="mt-4 max-w-2xl text-white/70">
            Upload W-2/1099/1098/1040. We extract key fields, surface opportunity flags, and
            answer questions grounded in your documents.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 transition"
            >
              View sample dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Feature title="Upload & Extract" desc="Structured snapshot from messy PDFs/images." />
        <Feature title="Opportunity Flags" desc="Credits/deductions to review + what proofs you need." />
        <Feature title="Ask Anything" desc="Chat grounded in your docs to reduce hallucinations." />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-semibold">Disclaimer</div>
        <p className="mt-2 text-sm text-white/70">
          TaxPilot is an educational and organizational tool and does not provide tax advice.
        </p>
      </section>
    </div>
  );
}