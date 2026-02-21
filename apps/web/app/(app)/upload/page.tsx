"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type UploadedDoc = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
  status: "Ready" | "Queued" | "Failed";
};

const LS_KEY = "taxpilot_docs_v1";

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function genId() {
  return `doc_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function loadDocs(): UploadedDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UploadedDoc[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDocs(docs: UploadedDoc[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(docs));
}

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    setDocs(loadDocs());
  }, []);

  const stats = useMemo(() => {
    const total = docs.length;
    const ready = docs.filter((d) => d.status === "Ready").length;
    const newest = docs[0]?.uploadedAt;
    return { total, ready, newest };
  }, [docs]);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    const next: UploadedDoc[] = arr.map((f) => ({
      id: genId(),
      name: f.name,
      size: f.size,
      type: f.type || "application/octet-stream",
      uploadedAt: Date.now(),
      status: "Ready",
    }));

    // newest first
    const merged = [...next, ...docs];
    setDocs(merged);
    saveDocs(merged);

    setToast(`${next.length} file${next.length > 1 ? "s" : ""} added ✅`);
    window.setTimeout(() => setToast(""), 1800);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }

  function removeDoc(id: string) {
    const filtered = docs.filter((d) => d.id !== id);
    setDocs(filtered);
    saveDocs(filtered);
  }

  function clearAll() {
    setDocs([]);
    saveDocs([]);
    setToast("Cleared uploads");
    window.setTimeout(() => setToast(""), 1200);
  }

  const supported = ["PDF", "PNG", "JPG"];
  const examples = ["W-2", "1099", "1098-E", "1098-T", "1040"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
              TaxPilot • Upload Center
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Demo Mode
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Upload your tax documents
            </h1>
            <p className="mt-3 text-white/70 max-w-2xl">
              Add PDFs or images. TaxPilot will extract key fields and generate a filing-readiness report.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>Supported: {supported.join(" • ")}</Pill>
              <Pill>Examples: {examples.join(" • ")}</Pill>
              <Pill>Never tax advice</Pill>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Choose files
            </button>
            <Link
              href="/report"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Go to report
            </Link>
          </div>
        </div>
      </section>

      {/* Dropzone + Stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <Section
          title="Dropzone"
          subtitle="Drag and drop files here (stored locally for demo)."
          right={
            <div className="flex gap-2">
              <button
                onClick={clearAll}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
              >
                Clear all
              </button>
            </div>
          }
        >
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              "relative cursor-pointer rounded-3xl border border-dashed p-6 text-center transition",
              dragOver
                ? "border-emerald-300 bg-emerald-400/10 shadow-[0_0_40px_rgba(52,211,153,0.25)]"
                : "border-white/15 bg-black/20 hover:bg-black/30",
            ].join(" ")}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.currentTarget.value = ""; // allow re-select same file
              }}
            />

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
              <span className="text-2xl">⬆️</span>
            </div>

            <div className="mt-4 text-sm font-semibold">
              {dragOver ? "Drop to add files" : "Drag & drop your documents"}
            </div>
            <div className="mt-1 text-sm text-white/70">
              or click to browse
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {examples.map((x) => (
                <Pill key={x}>{x}</Pill>
              ))}
            </div>

            {toast ? (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950 shadow-[0_0_22px_rgba(52,211,153,0.35)]">
                {toast}
              </div>
            ) : null}
          </div>
        </Section>

        <Section title="Readiness" subtitle="Progress based on uploaded docs (mock).">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/60">Documents uploaded</div>
                <Pill>{stats.total}/5</Pill>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)] transition-all"
                  style={{ width: `${Math.min(100, (stats.total / 5) * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-white/60">
                Tip: add W-2 + 1099 + 1098 + 1040 for best results.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill>Ready: {stats.ready}</Pill>
              <Pill>Queued: {docs.filter((d) => d.status === "Queued").length}</Pill>
              <Pill>Failed: {docs.filter((d) => d.status === "Failed").length}</Pill>
            </div>

            <Link
              href="/report"
              className="block text-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Generate report (demo)
            </Link>
          </div>
        </Section>

        <Section title="Privacy" subtitle="Hackathon-safe handling guidance.">
          <div className="space-y-3 text-sm text-white/70">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              Use synthetic/sample tax docs for demo.
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              Never commit API keys or .env files to GitHub.
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              TaxPilot is organizational and educational — not tax advice.
            </div>
          </div>
        </Section>
      </section>

      {/* Recent uploads */}
      <Section
        title="Recent uploads"
        subtitle="These are stored locally for now. Backend will replace this list."
        right={
          <div className="flex items-center gap-2">
            <Pill>{docs.length} total</Pill>
          </div>
        }
      >
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
            No documents yet. Upload a W-2 or 1099 to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {docs.slice(0, 8).map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold">{d.name}</div>
                    <Pill>{d.status}</Pill>
                    <Pill>{formatBytes(d.size)}</Pill>
                    <Pill>{d.type.includes("pdf") ? "PDF" : "Image"}</Pill>
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    Added {new Date(d.uploadedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeDoc(d.id)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
                  >
                    Remove
                  </button>
                  <Link
                    href="/report"
                    className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300 transition"
                  >
                    Use in report
                  </Link>
                </div>
              </div>
            ))}

            {docs.length > 8 ? (
              <div className="text-xs text-white/60">
                Showing 8 of {docs.length}.
              </div>
            ) : null}
          </div>
        )}
      </Section>
    </div>
  );
}