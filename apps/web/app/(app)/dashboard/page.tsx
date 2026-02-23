"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getReportRecommendations,
  listDocs,
  type ReportRecommendation,
} from "@/lib/api";

type UploadDoc = {
  doc_id: string;
  original_name: string;
  extraction_status?: string;
};

type ExtractedTaxData = {
  taxpayer_profile?: Record<string, unknown>;
  tax_records?: Array<Record<string, unknown>>;
};

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
      ? "border-emerald-300/60 bg-emerald-300/20 text-emerald-100"
      : impact === "Medium"
      ? "border-amber-300/60 bg-amber-300/20 text-amber-100"
      : "border-white/20 bg-white/5 text-white/85";
  const confidenceClass =
    confidence === "High"
      ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
      : confidence === "Med"
      ? "border-sky-300/40 bg-sky-300/10 text-sky-100"
      : "border-white/20 bg-white/5 text-white/85";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-sm text-white/70">{why}</div>
        </div>

        <div className="flex w-32 flex-col gap-2">
          <div className={cn("rounded-xl border px-3 py-2", impactClass)}>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] opacity-75">
              Impact
            </div>
            <div className="mt-0.5 text-sm font-semibold leading-none">{impact}</div>
          </div>
          <div className={cn("rounded-xl border px-3 py-2", confidenceClass)}>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] opacity-75">
              Confidence
            </div>
            <div className="mt-0.5 text-sm font-semibold leading-none">{confidence}</div>
          </div>
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

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function findFirstNumericByKey(obj: unknown, keyTerms: string[]): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = k.toLowerCase();
    if (keyTerms.some((t) => key.includes(t))) {
      const n = parseNumber(v);
      if (typeof n === "number") return n;
    }
    if (v && typeof v === "object") {
      const nested = findFirstNumericByKey(v, keyTerms);
      if (typeof nested === "number") return nested;
    }
  }
  return undefined;
}

function getCategoryCoverage(docs: UploadDoc[]) {
  const joined = docs.map((d) => d.original_name.toLowerCase()).join(" ");
  return {
    w2: joined.includes("w-2") || joined.includes("w2"),
    tax1099: joined.includes("1099"),
    tax1098: joined.includes("1098"),
    form1040: joined.includes("1040"),
  };
}

async function fetchExtractedForDoc(docId: string): Promise<ExtractedTaxData | null> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
  try {
    const res = await fetch(`${base}/v1/extracted/${docId}`);
    if (!res.ok) return null;
    return (await res.json()) as ExtractedTaxData;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const [docs, setDocs] = useState<UploadDoc[]>([]);
  const [flags, setFlags] = useState<ReportRecommendation[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [filingStatus, setFilingStatus] = useState("Unknown");
  const [state, setState] = useState("Unknown");
  const [estIncome, setEstIncome] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setSnapshotLoading(true);
        const allDocs = (await listDocs()) as UploadDoc[];
        if (!mounted) return;
        setDocs(allDocs);

        const extractedIds = allDocs
          .filter((d) => (d.extraction_status || "").toLowerCase() === "completed")
          .map((d) => d.doc_id)
          .slice(0, 8);

        if (extractedIds.length > 0) {
          const extractedDocs = await Promise.all(
            extractedIds.map((docId) => fetchExtractedForDoc(docId)),
          );
          if (!mounted) return;

          const primary = extractedDocs.find((d) => d?.taxpayer_profile) || extractedDocs[0];
          const profile = (primary?.taxpayer_profile || {}) as Record<string, unknown>;

          const profileStatus =
            typeof profile.filing_status === "string"
              ? profile.filing_status
              : typeof profile.filingStatus === "string"
              ? profile.filingStatus
              : undefined;
          const profileState =
            typeof profile.state_of_residence === "string"
              ? profile.state_of_residence
              : typeof profile.state === "string"
              ? profile.state
              : undefined;

          if (profileStatus) setFilingStatus(profileStatus);
          if (profileState) setState(profileState);

          const incomeFromExtracted = extractedDocs
            .map((doc) => findFirstNumericByKey(doc, ["wages", "income", "agi", "adjusted_gross"]))
            .find((x): x is number => typeof x === "number");

          if (typeof incomeFromExtracted === "number") {
            setEstIncome(incomeFromExtracted);
          }
        }
      } catch {
        if (!mounted) return;
      } finally {
        if (mounted) setSnapshotLoading(false);
      }

      try {
        setFlagsLoading(true);
        const rec = await getReportRecommendations();
        if (!mounted) return;
        setFlags(rec.recommendations.slice(0, 3));
      } catch {
        if (!mounted) return;
        setFlags([]);
      } finally {
        if (mounted) setFlagsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const coverage = useMemo(() => getCategoryCoverage(docs), [docs]);
  const coveredCount = useMemo(
    () => Object.values(coverage).filter(Boolean).length,
    [coverage],
  );

  const docsUploaded = docs.length;
  const docsNeeded = 4;
  const processedCount = docs.filter(
    (d) => (d.extraction_status || "").toLowerCase() === "completed",
  ).length;
  const extractionLabel =
    docsUploaded === 0
      ? "Not started"
      : processedCount === docsUploaded
      ? "Complete"
      : "In progress";

  const readinessScore =
    docsUploaded === 0
      ? 0
      : Math.min(
          100,
          Math.round((coveredCount / docsNeeded) * 70 + (processedCount / docsUploaded) * 30),
        );

  const readinessCopy =
    docsUploaded === 0
      ? "Upload documents to start your readiness score."
      : readinessScore >= 80
      ? "Strong coverage. Open report for full analysis."
      : "Good progress. Add missing forms to improve confidence.";

  const missingLabels = [
    !coverage.w2 && "W-2",
    !coverage.tax1099 && "1099",
    !coverage.tax1098 && "1098",
    !coverage.form1040 && "1040",
  ].filter(Boolean) as string[];

  const nextSteps = [
    {
      label: missingLabels.length ? "Upload missing docs" : "Review report",
      desc: missingLabels.length
        ? `Still missing: ${missingLabels.join(", ")}. Add them for better recommendation coverage.`
        : "Core forms are uploaded. Review extracted fields and opportunity flags.",
      href: missingLabels.length ? "/upload" : "/report",
    },
    { label: "Review report", desc: "See extracted fields + opportunity flags in one place.", href: "/report" },
    { label: "Ask TaxPilot", desc: "Get grounded answers based on your documents.", href: "/chat" },
    { label: "Try phone demo", desc: "Call the agent for a walkthrough (later).", href: "/call" },
  ];

  const quickAsk = [
    "Do I likely qualify for student loan interest deduction?",
    "What documents are still missing in my uploads?",
    "What are my top 2 filing opportunities from current docs?",
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
              TaxPilot • Filing Readiness
              <span className="h-1 w-1 rounded-full bg-white/40" />
              {snapshotLoading ? "Syncing" : "Live data"}
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
                <div className="text-3xl font-semibold">{readinessScore}%</div>
                <div className="mt-1 text-sm text-white/70">{readinessCopy}</div>

                <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)]"
                    style={{ width: `${readinessScore}%` }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill>Docs: {docsUploaded}/{docsNeeded}</Pill>
                  <Pill>Extraction: {extractionLabel}</Pill>
                  <Pill>Flags: {flags.length}</Pill>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Snapshot" subtitle="High-level summary from extracted fields.">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Filing Status" value={snapshotLoading ? "Loading..." : filingStatus} />
            <Stat label="State" value={snapshotLoading ? "Loading..." : state} />
            <Stat
              label="Est. Income"
              value={snapshotLoading ? "Loading..." : estIncome !== null ? `$${estIncome.toLocaleString()}` : "Unknown"}
              hint="From uploaded docs"
            />
            <Stat
              label="Docs Uploaded"
              value={`${docsUploaded}/${docsNeeded}`}
              hint={missingLabels.length ? `Missing: ${missingLabels.join(", ")}` : "Core forms detected"}
            />
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
            {quickAsk.map((q) => (
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

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">Opportunity Flags</div>
            <div className="mt-1 text-sm text-white/70">
              Generated from your extracted document data (not tax advice).
            </div>
          </div>

          <Link
            href="/report"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Open full report
          </Link>
        </div>

        {flagsLoading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            Loading recommendations...
          </div>
        ) : flags.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
            No recommendation flags yet. Upload and process docs to generate them.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {flags.map((f) => (
              <FlagCard
                key={f.title}
                title={f.title}
                impact={f.impact}
                confidence={f.confidence}
                why={f.explanation}
                needed={f.required_docs}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Ready to continue?</div>
            <div className="mt-1 text-sm text-white/70">
              Keep documents updated, then review report details and ask questions.
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
