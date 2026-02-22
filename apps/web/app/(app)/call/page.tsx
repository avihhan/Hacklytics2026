"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { getDashboardSummary, listDocs } from "@/lib/api";

type CallState = "idle" | "ringing" | "connected" | "ended";

type DashboardData = {
  snapshot: {
    docs_uploaded: number;
    docs_needed: number;
    filing_status: string;
    est_income: number | null;
  };
  flags: Array<{ title: string }>;
};

type UploadedDoc = {
  doc_id: string;
  original_name: string;
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
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-white/70">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function formatPhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "").slice(0, 11);
  const d = digits.startsWith("1") ? digits.slice(1) : digits;
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 10);
  if (d.length <= 3) return a;
  if (d.length <= 6) return `(${a}) ${b}`;
  return `(${a}) ${b}-${c}`;
}

export default function CallPage() {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<CallState>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [voice, setVoice] = useState<"Nova" | "Atlas" | "Echo">("Nova");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);

  const canCall = phone.replace(/[^\d]/g, "").length >= 10 && state !== "ringing";

  useEffect(() => {
    getDashboardSummary()
      .then((res) => setDashboard(res as DashboardData))
      .catch(() => {
        setDashboard(null);
      });

    listDocs()
      .then((res) => setDocs(res as UploadedDoc[]))
      .catch(() => setDocs([]));
  }, []);

  const status = useMemo(() => {
    if (state === "idle") return { label: "Ready", tone: "text-white/80" };
    if (state === "ringing") return { label: "Ringing...", tone: "text-amber-200" };
    if (state === "connected") return { label: "Connected", tone: "text-emerald-200" };
    return { label: "Ended", tone: "text-white/60" };
  }, [state]);

  const dynamicScript = useMemo(() => {
    const docsUploaded = dashboard?.snapshot.docs_uploaded ?? docs.length;
    const docsNeeded = dashboard?.snapshot.docs_needed ?? 5;
    const filingStatus = dashboard?.snapshot.filing_status ?? "Unknown";
    const topFlag = dashboard?.flags?.[0]?.title;

    return [
      `Open with current status: ${docsUploaded}/${docsNeeded} docs uploaded, filing status ${filingStatus}.`,
      topFlag ? `Highlight top opportunity: ${topFlag}.` : "Highlight missing docs and next best upload.",
      "Ask the agent to summarize what is known vs missing.",
      "Close with CTA: upload remaining forms, then run report + chat follow-ups.",
    ];
  }, [dashboard, docs.length]);

  function addLog(line: string) {
    setLog((prev) => [`${new Date().toLocaleTimeString()} | ${line}`, ...prev].slice(0, 10));
  }

  function startDemoCall() {
    if (!canCall) return;

    const docsUploaded = dashboard?.snapshot.docs_uploaded ?? docs.length;
    const docsNeeded = dashboard?.snapshot.docs_needed ?? 5;
    const topFlag = dashboard?.flags?.[0]?.title;

    setState("ringing");
    addLog(`Calling ${phone} using ${voice} voice profile.`);

    window.setTimeout(() => {
      setState("connected");
      addLog(`Connected. Readiness briefing: ${docsUploaded}/${docsNeeded} docs available.`);
    }, 900);

    window.setTimeout(() => {
      if (topFlag) addLog(`Opportunity detected: ${topFlag}`);
      else addLog("No specific opportunity found yet. Recommend uploading more support docs.");
    }, 1700);

    window.setTimeout(() => {
      addLog("Suggested user prompt: 'What should I upload next?' ");
    }, 2500);
  }

  function endCall() {
    setState("ended");
    addLog("Call ended.");
    window.setTimeout(() => setState("idle"), 1200);
  }

  function resetLog() {
    setLog([]);
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
              TaxPilot Voice Copilot
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Call Workflow
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Voice walk-through</h1>

            <p className="mt-3 max-w-2xl text-white/70">
              Trigger a guided call flow that narrates the current dashboard state and next actions.
              This is an MVP interaction layer for live demos.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>Uploads: {dashboard?.snapshot.docs_uploaded ?? docs.length}</Pill>
              <Pill>Flags: {dashboard?.flags.length ?? 0}</Pill>
              <Pill>Not tax advice</Pill>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/report"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              View report
            </Link>
            <Link
              href="/chat"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Ask in chat
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Section
          title="Call controls"
          subtitle="Enter a number and run a scripted call sequence."
          right={<Pill>{status.label}</Pill>}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/70">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(555) 123-4567"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["Nova", "Atlas", "Echo"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVoice(v)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    voice === v
                      ? "border-emerald-400/40 bg-emerald-400/15 text-white"
                      : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={startDemoCall}
                disabled={!canCall}
                className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition disabled:opacity-50 disabled:hover:bg-emerald-400"
              >
                {state === "ringing" ? "Ringing..." : "Start call"}
              </button>

              <button
                onClick={endCall}
                disabled={state !== "connected" && state !== "ringing"}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
              >
                End
              </button>
            </div>
          </div>
        </Section>

        <Section title="Pitch script" subtitle="Dynamic talking points based on current uploads.">
          <ol className="space-y-2 text-sm text-white/70">
            {dynamicScript.map((line) => (
              <li key={line} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                {line}
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title="Call log"
          subtitle="Event stream from the active call flow."
          right={
            <button
              onClick={resetLog}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
            >
              Clear
            </button>
          }
        >
          {log.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
              No events yet. Start a call to generate a live transcript.
            </div>
          ) : (
            <div className="space-y-2">
              {log.map((line) => (
                <div key={line} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                  {line}
                </div>
              ))}
            </div>
          )}
        </Section>
      </section>
    </div>
  );
}
