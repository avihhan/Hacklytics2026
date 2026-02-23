"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getReportRecommendations,
  type ReportRecommendation,
} from "@/lib/api";

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
      ? "border-emerald-300/60 bg-emerald-300/20 text-emerald-100"
      : impact === "Medium"
      ? "border-amber-300/60 bg-amber-300/20 text-amber-100"
      : "border-white/20 bg-white/5 text-white/85";
  const confidenceColor =
    confidence === "High"
      ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
      : confidence === "Med"
      ? "border-sky-300/40 bg-sky-300/10 text-sky-100"
      : "border-white/20 bg-white/5 text-white/85";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-2 text-sm text-white/70">{explanation}</div>
        </div>

        <div className="flex w-32 flex-col gap-2">
          <div className={`rounded-xl border px-3 py-2 ${impactColor}`}>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] opacity-75">
              Impact
            </div>
            <div className="mt-0.5 text-sm font-semibold leading-none">{impact}</div>
          </div>
          <div className={`rounded-xl border px-3 py-2 ${confidenceColor}`}>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] opacity-75">
              Confidence
            </div>
            <div className="mt-0.5 text-sm font-semibold leading-none">{confidence}</div>
          </div>
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
  const [recommendations, setRecommendations] = useState<ReportRecommendation[]>(
    [],
  );
  const [summary, setSummary] = useState("");
  const [docCount, setDocCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadRecommendations() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getReportRecommendations();
        if (!mounted) return;
        setRecommendations(data.recommendations ?? []);
        setSummary(data.summary ?? "");
        setDocCount(data.doc_count ?? 0);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load report data.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadRecommendations();
    return () => {
      mounted = false;
    };
  }, []);

  const snapshot = {
    filingStatus: "Single",
    income: 74250,
    state: "GA",
    docCount,
    extractionStatus: docCount > 0 ? "Analyzed" : "Pending",
  };

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
        subtitle="Gemini-analyzed opportunities based on extracted tax documents."
      >
        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            Analyzing extracted documents with Gemini...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            Could not load recommendations: {error}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            No recommendations yet. Upload documents, then run extraction to generate a report.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((flag) => (
              <FlagCard
                key={flag.title}
                title={flag.title}
                impact={flag.impact}
                confidence={flag.confidence}
                explanation={flag.explanation}
                requiredDocs={flag.required_docs}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Grounding */}
      <Section
        title="Grounding & Transparency"
        subtitle="How TaxPilot generated this report."
      >
        <div className="space-y-3 text-sm text-white/70">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            {summary || "No recommendation summary available yet."}
          </div>
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
