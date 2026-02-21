"use client";

import Link from "next/link";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm text-white/70">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/60">{hint}</div> : null}
    </div>
  );
}

function FlagCard({
  title,
  impact,
  confidence,
  why,
  needed,
}: {
  title: string;
  impact: "High" | "Medium" | "Low";
  confidence: "High" | "Med" | "Low";
  why: string;
  needed: string[];
}) {
  const impactClass =
    impact === "High"
      ? "bg-emerald-400 text-slate-950"
      : impact === "Medium"
      ? "bg-amber-300 text-slate-950"
      : "bg-white/10 text-white";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-sm text-white/70">{why}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", impactClass)}>
            Impact: {impact}
          </span>
          <Pill>Confidence: {confidence}</Pill>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-white/70">Needed to confirm</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {needed.map((x) => (
            <Pill key={x}>{x}</Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Mock data for now — swap to backend later
  const snapshot = {
    filingStatus: "Single",
    state: "GA",
    estIncome: 74250,
    docsUploaded: 3,
    docsNeeded: 5,
    extraction: "Complete",
  };

  const flags = [
    {
      title: "Student loan interest (1098-E)",
      impact: "Medium" as const,
      confidence: "High" as const,
      why: "Detected a 1098-E. You may be able to deduct eligible student loan interest.",
      needed: ["1098-E", "MAGI threshold check"],
    },
    {
      title: "Education credit (AOTC/LLC)",
      impact: "High" as const,
      confidence: "Med" as const,
      why: "If you paid qualified tuition, you may qualify for an education credit.",
      needed: ["1098-T", "Qualified expenses receipts"],
    },
    {
      title: "Itemized vs standard deduction check",
      impact: "Low" as const,
      confidence: "Low" as const,
      why: "If you have mortgage interest/charity/medical expenses, itemizing may help.",
      needed: ["Charity receipts", "Mortgage interest (1098)", "Medical expense totals"],
    },
  ];

  const nextSteps = [
    { label: "Upload missing docs", desc: "Add any W-2/1099/1098/1040 you haven't uploaded yet.", href: "/upload" },
    { label: "Review report", desc: "See extracted fields + opportunity flags in one place.", href: "/report" },
    { label: "Ask TaxPilot", desc: "Get grounded answers based on your documents.", href: "/chat" },
    { label: "Try phone demo", desc: "Call the agent for a walkthrough (later).", href: "/call" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
              TaxPilot • Filing Readiness
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Demo Mode
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Your tax docs, organized — with smart next steps.
            </h1>

            <p className="mt-3 text-white/70">
              Upload your documents, extract key fields, and review opportunity flags. Then ask questions grounded in your docs.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/upload"
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
              >
                Upload documents
              </Link>

              <Link
                href="/report"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                View report
              </Link>

              <Link
                href="/chat"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 transition"
              >
                Ask TaxPilot
              </Link>
            </div>
          </div>

          <div className="w-full md:w-[380px]">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Readiness Score</div>
                <Pill>Auto</Pill>
              </div>

              <div className="mt-4">
                <div className="text-3xl font-semibold">78%</div>
                <div className="mt-1 text-sm text-white/70">
                  Good start — upload remaining docs to increase confidence.
                </div>

                <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 w-[78%] rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)]" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill>Docs: {snapshot.docsUploaded}/{snapshot.docsNeeded}</Pill>
                  <Pill>Extraction: {snapshot.extraction}</Pill>
                  <Pill>Flags: {flags.length}</Pill>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Snapshot + Quick Actions */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Snapshot" subtitle="High-level summary from extracted fields (mock).">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Filing Status" value={snapshot.filingStatus} />
            <Stat label="State" value={snapshot.state} />
            <Stat label="Est. Income" value={`$${snapshot.estIncome.toLocaleString()}`} hint="From uploaded docs" />
            <Stat label="Docs Uploaded" value={`${snapshot.docsUploaded}/${snapshot.docsNeeded}`} hint="W-2, 1099, 1098, 1040" />
          </div>
        </Card>

        <Card
          title="Top Next Steps"
          subtitle="Do these in order for the cleanest filing-ready package."
          right={<Pill>Checklist</Pill>}
        >
          <div className="space-y-3">
            {nextSteps.slice(0, 3).map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:bg-black/30 transition"
              >
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="mt-1 text-sm text-white/70">{s.desc}</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Quick Ask" subtitle="Common questions (grounded in your docs).">
          <div className="space-y-3">
            {[
              "Do I likely qualify for student loan interest deduction?",
              "What documents are missing for education credits?",
              "Should I consider itemizing this year?",
            ].map((q) => (
              <Link
                key={q}
                href={`/chat?q=${encodeURIComponent(q)}`}
                className="block rounded-2xl border border-white/10 bg-black/20 p-4 hover:bg-black/30 transition"
              >
                <div className="text-sm font-medium text-white">{q}</div>
                <div className="mt-1 text-xs text-white/60">Ask in chat →</div>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      {/* Flags */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Opportunity Flags</div>
            <div className="mt-1 text-sm text-white/70">
              These are potential opportunities to review (not tax advice).
            </div>
          </div>

          <Link
            href="/report"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Open full report
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {flags.map((f) => (
            <FlagCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Ready to continue?</div>
            <div className="mt-1 text-sm text-white/70">
              Upload remaining docs, then generate the report and ask questions.
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Upload now
            </Link>
            <Link
              href="/report"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Generate report
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}