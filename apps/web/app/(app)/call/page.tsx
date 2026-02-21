"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type CallState = "idle" | "ringing" | "connected" | "ended";

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

function formatPhone(raw: string) {
  // keep digits only
  const digits = raw.replace(/[^\d]/g, "").slice(0, 11);
  // naive US formatting
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

  const canCall = phone.replace(/[^\d]/g, "").length >= 10 && state !== "ringing";

  const status = useMemo(() => {
    if (state === "idle") return { label: "Ready", tone: "text-white/80" };
    if (state === "ringing") return { label: "Ringing…", tone: "text-amber-200" };
    if (state === "connected") return { label: "Connected", tone: "text-emerald-200" };
    return { label: "Ended", tone: "text-white/60" };
  }, [state]);

  function addLog(line: string) {
    setLog((prev) => [`${new Date().toLocaleTimeString()} • ${line}`, ...prev].slice(0, 8));
  }

  async function startDemoCall() {
    if (!canCall) return;

    setState("ringing");
    addLog(`Calling ${phone} (demo) using voice "${voice}"`);

    // mock ring → connect
    window.setTimeout(() => {
      setState("connected");
      addLog("Agent connected. Reading your filing readiness summary…");
    }, 900);

    // mock agent summary lines
    window.setTimeout(() => addLog("Flag: Education credit may apply (needs 1098-T)."), 1600);
    window.setTimeout(() => addLog("Flag: Student loan interest detected (1098-E)."), 2200);
    window.setTimeout(() => addLog("You can ask: “What docs am I missing?”"), 2900);
  }

  function endCall() {
    setState("ended");
    addLog("Call ended.");
    window.setTimeout(() => setState("idle"), 1200);
  }

  function resetLog() {
    setLog([]);
    addLog("Log cleared.");
  }

  const demoScript = [
    "Hook: ‘Tax season is chaos — TaxPilot turns docs into clarity.’",
    "Show report highlights: snapshot + flags (Education credit, 1098-E).",
    "Click ‘Call me’ → show ringing → connected.",
    "Ask a question: ‘What am I missing for education credit?’",
    "Close: sponsor tech + ‘Not tax advice’ disclaimer.",
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
              TaxPilot Voice Agent
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Demo Mode
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Call the TaxPilot agent
            </h1>

            <p className="mt-3 max-w-2xl text-white/70">
              Get a spoken walkthrough of your filing readiness report and ask
              quick questions. (We’ll connect Twilio + ElevenLabs later.)
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>Phone demo</Pill>
              <Pill>ElevenLabs voice</Pill>
              <Pill>Twilio webhook</Pill>
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

      {/* Controls */}
      <section className="grid gap-4 md:grid-cols-3">
        <Section
          title="Call controls"
          subtitle="Enter a number to simulate a call flow (no backend yet)."
          right={<Pill>{status.label}</Pill>}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/70">Your phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(555) 123-4567"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
              <div className="mt-2 text-xs text-white/50">
                Demo-only right now. We won’t actually place calls until Twilio is wired.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setVoice("Nova")}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  voice === "Nova"
                    ? "border-emerald-400/40 bg-emerald-400/15 text-white"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                Nova
              </button>
              <button
                onClick={() => setVoice("Atlas")}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  voice === "Atlas"
                    ? "border-emerald-400/40 bg-emerald-400/15 text-white"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                Atlas
              </button>
              <button
                onClick={() => setVoice("Echo")}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  voice === "Echo"
                    ? "border-emerald-400/40 bg-emerald-400/15 text-white"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                Echo
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startDemoCall}
                disabled={!canCall}
                className="flex-1 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition disabled:opacity-50 disabled:hover:bg-emerald-400"
              >
                {state === "ringing" ? "Ringing…" : "Call me (demo)"}
              </button>

              <button
                onClick={endCall}
                disabled={state !== "connected" && state !== "ringing"}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
              >
                End
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
              <div className="font-semibold text-white">Suggested call prompt</div>
              <div className="mt-2">
                “Give me a quick summary of my report and tell me what documents I’m missing.”
              </div>
            </div>
          </div>
        </Section>

        <Section title="Demo script" subtitle="2-minute Devpost walkthrough (tight + punchy).">
          <ol className="space-y-2 text-sm text-white/70">
            {demoScript.map((s) => (
              <li key={s} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                {s}
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Call log" subtitle="Live events for the demo flow." right={
          <button
            onClick={resetLog}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
          >
            Clear log
          </button>
        }>
          {log.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
              No events yet. Enter a phone number and click <b>Call me (demo)</b>.
            </div>
          ) : (
            <div className="space-y-2">
              {log.map((l) => (
                <div key={l} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                  {l}
                </div>
              ))}
            </div>
          )}
        </Section>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Next step</div>
            <div className="mt-1 text-sm text-white/70">
              Once backend is ready, this button will trigger a real Twilio call + ElevenLabs voice.
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Upload docs
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}