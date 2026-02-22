"use client";

import Link from "next/link";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div>
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        {subtitle && (
          <div className="mt-1 text-sm text-white/70">{subtitle}</div>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function FlagCard({
  title,
  impact,
  confidence,
  explanation,
  requiredDocs,
}: {
  title: string;
  impact: "High" | "Medium" | "Low";
  confidence: "High" | "Med" | "Low";
  explanation: string;
  requiredDocs: string[];
}) {
  const impactColor =
    impact === "High"
      ? "bg-emerald-400 text-slate-950"
      : impact === "Medium"
      ? "bg-amber-300 text-slate-950"
      : "bg-white/10 text-white";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-2 text-sm text-white/70">{explanation}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${impactColor}`}>
            Impact: {impact}
          </span>
          <Pill>Confidence: {confidence}</Pill>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-white/70">Required to Confirm</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {requiredDocs.map((doc) => (
            <Pill key={doc}>{doc}</Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const snapshot = {
    filingStatus: "Single",
    income: 74250,
    state: "GA",
    docCount: 3,
    extractionStatus: "Complete",
  };

  const flags = [
    {
      title: "Education Credit (AOTC/LLC)",
      impact: "High" as const,
      confidence: "Med" as const,
      explanation:
        "Based on tuition-related documents detected, you may qualify for an education credit depending on eligibility criteria.",
      requiredDocs: ["1098-T", "Qualified expense receipts"],
    },
    {
      title: "Student Loan Interest Deduction",
      impact: "Medium" as const,
      confidence: "High" as const,
      explanation:
        "1098-E detected. Eligible interest payments may reduce taxable income.",
      requiredDocs: ["1098-E", "MAGI threshold confirmation"],
    },
    {
      title: "Itemized Deduction Review",
      impact: "Low" as const,
      confidence: "Low" as const,
      explanation:
        "If charitable contributions or mortgage interest exceed the standard deduction, itemizing could benefit you.",
      requiredDocs: ["Charity receipts", "Mortgage interest (1098)"],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
              TaxPilot Report
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Grounded Analysis
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Filing Readiness Report
            </h1>

            <p className="mt-3 text-white/70 max-w-2xl">
              Structured summary of extracted fields and potential opportunities.
              All insights are grounded in your uploaded documents.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition">
              Export PDF
            </button>
            <Link
              href="/chat"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Ask about this
            </Link>
          </div>
        </div>
      </section>

      {/* Snapshot */}
      <Section title="Snapshot Overview" subtitle="Extracted core fields (demo data).">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Filing Status</div>
            <div className="mt-1 text-lg font-semibold">{snapshot.filingStatus}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Income</div>
            <div className="mt-1 text-lg font-semibold">
              ${snapshot.income.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">State</div>
            <div className="mt-1 text-lg font-semibold">{snapshot.state}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Documents</div>
            <div className="mt-1 text-lg font-semibold">
              {snapshot.docCount} Uploaded
            </div>
            <div className="text-xs text-white/60">
              Extraction: {snapshot.extractionStatus}
            </div>
          </div>
        </div>
      </Section>

      {/* Opportunity Flags */}
      <Section
        title="Opportunity Flags"
        subtitle="Potential deductions or credits to review (not tax advice)."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {flags.map((flag) => (
            <FlagCard key={flag.title} {...flag} />
          ))}
        </div>
      </Section>

      {/* Grounding */}
      <Section
        title="Grounding & Transparency"
        subtitle="How TaxPilot generated this report."
      >
        <div className="space-y-3 text-sm text-white/70">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            Extracted structured fields from uploaded tax documents.
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            Matched extracted fields against deduction/credit eligibility heuristics.
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            Generated explanations grounded in document context (RAG pipeline).
          </div>
        </div>
      </Section>
    </div>
  );
}