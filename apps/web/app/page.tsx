import Link from "next/link";

const Feature = ({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) => (
  <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="text-sm font-semibold">{title}</div>
    <div className="mt-1 text-sm text-zinc-600">{desc}</div>
  </div>
);

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-zinc-600">
              Hacklytics 2026 • Golden Byte
              <span className="h-1 w-1 rounded-full bg-zinc-400" />
              Educational tool — not tax advice
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Turn messy tax docs into a clear filing-ready report.
            </h1>

            <p className="mt-3 text-zinc-600">
              Upload W-2/1099/1098/1040. We extract key fields, generate
              opportunity flags, and answer questions grounded in your docs.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/upload"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Start with upload
              </Link>
              <Link
                href="/report"
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                View sample report
              </Link>
            </div>
          </div>

          <div className="w-full md:w-[360px]">
            <div className="rounded-2xl border bg-zinc-900 p-5 text-white">
              <div className="text-sm font-semibold">Demo Checklist</div>
              <ul className="mt-3 space-y-2 text-sm text-zinc-200">
                <li>• Upload 3 doc types</li>
                <li>• 5+ opportunity flags</li>
                <li>• RAG chat grounded in docs</li>
                <li>• Live phone agent demo</li>
              </ul>
              <div className="mt-4 rounded-xl bg-white/10 p-3 text-xs text-zinc-200">
                Tip: Keep the walkthrough under 2 minutes for Devpost.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Feature
          title="Upload & Extract"
          desc="Parse tax docs into structured fields for a clean snapshot."
        />
        <Feature
          title="Opportunity Flags"
          desc="Surface potential credits/deductions and what proof is needed."
        />
        <Feature
          title="Ask Anything"
          desc="Chat grounded in your documents to avoid hallucinations."
        />
      </section>

      <section className="rounded-3xl border bg-white p-8 shadow-sm">
        <div className="text-sm font-semibold">Disclaimer</div>
        <p className="mt-2 text-sm text-zinc-600">
          TaxPilot is for organization and education only. It does not
          provide tax advice. Always verify with official IRS guidance or a tax
          professional.
        </p>
      </section>
    </div>
  );
}