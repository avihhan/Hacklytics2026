"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadTaxDoc, listDocs, deleteDoc, clearRagVectors } from "@/lib/api";

type UploadedDoc = {
  doc_id: string;
  original_name: string;
  stored_name: string;
  size: number;
  type: string;
  uploaded_at: number;
  extraction_status?: string;
  rag_status?: string;
  status: "Ready" | "Uploading" | "Failed";
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

export default function UploadPage() {
  const router = useRouter();
  const LS_CHAT = "taxpilot_chat_v1";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const redirectTimerRef = useRef<number | null>(null);

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [clearingRag, setClearingRag] = useState(false);

  function normalizeDoc(d: Partial<UploadedDoc>): UploadedDoc {
    const extraction = (d.extraction_status || "").toLowerCase();
    const status: UploadedDoc["status"] = extraction.startsWith("failed")
      ? "Failed"
      : extraction === "completed" || extraction === "skipped" || !extraction
        ? "Ready"
        : "Uploading";

    return {
      doc_id: d.doc_id || "",
      original_name: d.original_name || "Untitled document",
      stored_name: d.stored_name || "",
      size: d.size || 0,
      type: d.type || "application/octet-stream",
      uploaded_at: d.uploaded_at || Date.now(),
      extraction_status: d.extraction_status,
      rag_status: d.rag_status,
      status,
    };
  }

  function isProcessed(d: Partial<UploadedDoc>) {
    const extraction = (d.extraction_status || "").toLowerCase();
    return extraction === "completed" || extraction === "skipped" || !extraction;
  }

  // Load docs from API on mount
  useEffect(() => {
    listDocs()
      .then((data) => {
        const mapped = (data as UploadedDoc[]).map((d) => normalizeDoc(d));
        setDocs(mapped);
      })
      .catch(() => {
        /* API offline — start empty */
      });

    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const stats = useMemo(() => {
    const total = docs.length;
    const ready = docs.filter((d) => d.status === "Ready").length;
    const newest = docs[0]?.uploaded_at;
    const failed = docs.filter((d) => d.status === "Failed").length;
    return { total, ready, failed, newest };
  }, [docs]);

  async function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    setUploading(true);
    setPendingCount(arr.length);
    let successCount = 0;
    let processedCount = 0;

    for (const file of arr) {
      try {
        const result = normalizeDoc((await uploadTaxDoc(file)) as UploadedDoc);
        setDocs((prev) => [result, ...prev]);
        successCount++;
        if (isProcessed(result)) processedCount++;
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setPendingCount((prev) => Math.max(0, prev - 1));
      }
    }

    setUploading(false);

    if (successCount > 0) {
      localStorage.removeItem(LS_CHAT);
      if (autoAdvance && processedCount === successCount) {
        setToast("Upload complete. Opening report…");
        redirectTimerRef.current = window.setTimeout(() => {
          router.push("/report");
        }, 900);
      } else {
        setToast(`${successCount} file${successCount > 1 ? "s" : ""} uploaded ✅`);
        window.setTimeout(() => setToast(""), 1800);
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }

  async function removeDoc(docId: string) {
    try {
      await deleteDoc(docId);
    } catch {
      /* still remove from UI even if API call fails */
    }
    setDocs((prev) => prev.filter((d) => d.doc_id !== docId));
  }

  async function clearAll() {
    for (const d of docs) {
      try {
        await deleteDoc(d.doc_id);
      } catch {
        /* ignore */
      }
    }
    setDocs([]);
    setToast("Cleared uploads");
    window.setTimeout(() => setToast(""), 1200);
  }

  async function clearActian() {
    setClearingRag(true);
    try {
      await clearRagVectors();
      setToast("Cleared Actian vectors");
    } catch {
      setToast("Failed to clear Actian vectors");
    } finally {
      setClearingRag(false);
      window.setTimeout(() => setToast(""), 1600);
      // refresh list so rag_status reflects backend update
      try {
        const data = await listDocs();
        const mapped = (data as UploadedDoc[]).map((d) => normalizeDoc(d));
        setDocs(mapped);
      } catch {
        /* ignore */
      }
    }
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
              API Connected
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
              disabled={uploading}
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Choose files"}
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
          subtitle="Drag and drop files here — stored on the server."
          right={
            <div className="flex gap-2">
              <button
                onClick={clearActian}
                disabled={clearingRag}
                className="rounded-xl border border-red-300/40 bg-red-300/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-300/20 transition disabled:opacity-50"
              >
                {clearingRag ? "Clearing Actian…" : "Clear Actian"}
              </button>
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
              {uploading
                ? `Uploading and processing ${pendingCount} file${pendingCount === 1 ? "" : "s"}…`
                : dragOver
                  ? "Drop to add files"
                  : "Drag & drop your documents"}
            </div>
            <div className="mt-1 text-sm text-white/70">
              or click to browse
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {examples.map((x) => (
                <Pill key={x}>{x}</Pill>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/75">
              <input
                id="auto-advance"
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/30 accent-emerald-400"
              />
              <label htmlFor="auto-advance" className="cursor-pointer">
                Auto-continue to report when processing completes
              </label>
            </div>

            {toast ? (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950 shadow-[0_0_22px_rgba(52,211,153,0.35)]">
                {toast}
              </div>
            ) : null}
          </div>
        </Section>

        <Section title="Readiness" subtitle="Progress based on uploaded docs.">
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
              <Pill>Processing: {uploading ? pendingCount : docs.filter((d) => d.status === "Uploading").length}</Pill>
              <Pill>Failed: {stats.failed}</Pill>
            </div>

            <Link
              href="/report"
              className="block text-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Generate report
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
              Chat history auto-clears after new uploads to avoid stale context.
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
        subtitle="Stored on the backend. Synced across sessions."
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
                key={d.doc_id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold">{d.original_name}</div>
                    <Pill>{d.status}</Pill>
                    <Pill>{formatBytes(d.size)}</Pill>
                    <Pill>{d.type.includes("pdf") ? "PDF" : "Image"}</Pill>
                    {d.extraction_status ? <Pill>Extraction: {d.extraction_status}</Pill> : null}
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    Added {new Date(d.uploaded_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeDoc(d.doc_id)}
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
