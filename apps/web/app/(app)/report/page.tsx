"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDashboardSummary } from "@/lib/api";

type Flag = {
  title: string;
  impact: "High" | "Medium" | "Low";
  confidence: "High" | "Med" | "Low";
  why: string;
  needed: string[];
};

type ReportData = {
  snapshot: {
    filing_status: string;
    state: string;
    est_income: number | null;
    docs_uploaded: number;
    docs_needed: number;
    docs_extracted: number;
    latest_tax_year: number | null;
  };
  readiness: {
    score: number;
    extraction_status: string;
    rag_completed: number;
    rag_failed: number;
  };
  flags: Flag[];
  meta: {
    forms_detected: string[];
    years_detected: number[];
  };
};

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
        {subtitle && <div className="mt-1 text-sm text-white/70">{subtitle}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function FlagCard({ flag }: { flag: Flag }) {
  const impactColor =
    flag.impact === "High"
      ? "bg-emerald-400 text-slate-950"
      : flag.impact === "Medium"
      ? "bg-amber-300 text-slate-950"
      : "bg-white/10 text-white";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{flag.title}</div>
          <div className="mt-2 text-sm text-white/70">{flag.why}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${impactColor}`}>
            Impact: {flag.impact}
          </span>
          <Pill>Confidence: {flag.confidence}</Pill>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold text-white/70">Needed to confirm</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {flag.needed.map((doc) => (
            <Pill key={doc}>{doc}</Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getDashboardSummary()
      .then((payload) => {
        if (!active) return;
        setData(payload as ReportData);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load report");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const snapshot = data?.snapshot ?? {
    filing_status: "Unknown",
    est_income: null,
    state: "Unknown",
    docs_uploaded: 0,
    docs_needed: 5,
    docs_extracted: 0,
    latest_tax_year: null,
  };

  const readiness = data?.readiness ?? {
    score: 0,
    extraction_status: "In progress",
    rag_completed: 0,
    rag_failed: 0,
  };

  const flags = data?.flags ?? [];
  const meta = data?.meta ?? { forms_detected: [], years_detected: [] };

  if (loading) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-white/60">Loading report...</div>;
  }

  if (error) {
    return <div className="rounded-3xl border border-amber-300/30 bg-amber-400/10 p-10 text-amber-200">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
              TaxPilot Report
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Live Extracted Data
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Filing Readiness Report</h1>

            <p className="mt-3 max-w-2xl text-white/70">
              This report is generated from uploaded files and extraction outputs. It highlights readiness,
              detected forms, and verification gaps.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/upload"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Add documents
            </Link>
            <Link
              href="/chat"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Ask about this report
            </Link>
          </div>
        </div>
      </section>

      <Section title="Snapshot" subtitle="Top-level status from extracted document data.">
        <div className="grid gap-4 md:grid-cols-6">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Readiness</div>
            <div className="mt-1 text-lg font-semibold">{readiness.score}%</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Filing status</div>
            <div className="mt-1 text-lg font-semibold">{snapshot.filing_status}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">State</div>
            <div className="mt-1 text-lg font-semibold">{snapshot.state}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Est. income</div>
            <div className="mt-1 text-lg font-semibold">
              {snapshot.est_income != null ? `$${snapshot.est_income.toLocaleString()}` : "Not detected"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Documents</div>
            <div className="mt-1 text-lg font-semibold">{snapshot.docs_uploaded}/{snapshot.docs_needed}</div>
            <div className="text-xs text-white/60">Extracted: {snapshot.docs_extracted}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Tax year focus</div>
            <div className="mt-1 text-lg font-semibold">{snapshot.latest_tax_year ?? "Unknown"}</div>
          </div>
        </div>
      </Section>

      <Section title="Opportunity flags" subtitle="Potential follow-ups based on detected content.">
        {flags.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/70">
            No opportunities detected yet. Upload more supporting forms to improve coverage.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {flags.map((flag) => (
              <FlagCard key={flag.title} flag={flag} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Data coverage" subtitle="What the system has actually seen so far.">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Extraction status</div>
            <div className="mt-1 text-sm text-white">{readiness.extraction_status}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill>RAG complete: {readiness.rag_completed}</Pill>
              <Pill>RAG failed: {readiness.rag_failed}</Pill>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Detected forms</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {meta.forms_detected.length === 0
                ? <Pill>None detected</Pill>
                : meta.forms_detected.map((name) => <Pill key={name}>{name}</Pill>)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/60">Detected tax years</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {meta.years_detected.length === 0
                ? <Pill>None detected</Pill>
                : meta.years_detected.map((year) => <Pill key={year}>{year}</Pill>)}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
