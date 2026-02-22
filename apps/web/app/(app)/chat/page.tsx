"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getDashboardSummary, listDocs } from "@/lib/api";

type Source = {
  doc: string;
  snippet: string;
};

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  ts: number;
};

type BackendChatResponse = {
  answer: string;
  sources?: Array<{
    doc_id?: string;
    title?: string;
    doc?: string;
    section?: string;
    snippet?: string;
    score?: number;
  }>;
};

type UploadedDoc = {
  doc_id: string;
  original_name: string;
  uploaded_at: number;
};

type DashboardSummary = {
  snapshot?: {
    taxpayer_name?: string | null;
  };
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const LS_CHAT = "taxpilot_chat_v1";
const LAST_UPLOAD_EVENT_KEY = "taxpilot_last_upload_event_v1";
const LAST_GREETED_UPLOAD_DOC_KEY = "taxpilot_last_greeted_upload_doc_v1";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function genId() {
  return `m_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function loadMsgs(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_CHAT);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Msg[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMsgs(msgs: Msg[]) {
  localStorage.setItem(LS_CHAT, JSON.stringify(msgs));
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[860px] rounded-3xl border px-4 py-3 shadow-sm",
          isUser
            ? "border-emerald-400/30 bg-emerald-400/10"
            : "border-white/10 bg-white/5",
        ].join(" ")}
      >
        <div className="text-sm leading-relaxed text-white prose prose-invert prose-emerald max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => <strong className="font-bold text-emerald-400">{children}</strong>,
              a: ({ children, href }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline underline-offset-2">
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-xs text-emerald-300">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-black/40 p-3 rounded-xl font-mono text-xs my-2 overflow-auto text-emerald-100 border border-white/5">
                  {children}
                </pre>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>

        {!isUser && msg.sources && msg.sources.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white/70">Sources used</div>
              <Pill>{msg.sources.length}</Pill>
            </div>

            <div className="mt-2 space-y-2">
              {msg.sources.map((s, idx) => (
                <div
                  key={`${s.doc}_${idx}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="text-xs font-semibold text-white/80">{s.doc}</div>
                  <div className="mt-1 text-xs text-white/60">{s.snippet}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-2 text-[11px] text-white/40">
          {new Date(msg.ts).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function toSources(raw?: BackendChatResponse["sources"]): Source[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      doc: s.title ?? s.doc ?? s.section ?? s.doc_id ?? "Document",
      snippet: s.snippet ?? "",
    }))
    .filter((s) => Boolean(s.doc));
}

export default function ChatPage() {
  const sp = useSearchParams();
  const presetQ = sp.get("q");

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeDocId, setActiveDocId] = useState("auto");
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "down">("unknown");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loaded = loadMsgs();
    if (loaded.length > 0) setMsgs(loaded);
  }, []);

  useEffect(() => {
    saveMsgs(msgs);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (presetQ) setInput(presetQ);
  }, [presetQ]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/health`, { method: "GET" });
        setApiStatus(r.ok ? "ok" : "down");
      } catch {
        setApiStatus("down");
      }
    })();
  }, []);

  useEffect(() => {
    listDocs()
      .then((res) => {
        const loaded = (res as UploadedDoc[]).sort((a, b) => b.uploaded_at - a.uploaded_at);
        setDocs(loaded);
      })
      .catch(() => {
        setDocs([]);
      });
  }, []);

  useEffect(() => {
    if (docs.length === 0) return;

    const raw = localStorage.getItem(LAST_UPLOAD_EVENT_KEY);
    if (!raw) return;

    let eventDocId = "";
    try {
      const parsed = JSON.parse(raw) as { doc_id?: string };
      eventDocId = parsed.doc_id ?? "";
    } catch {
      return;
    }
    if (!eventDocId) return;
    if (!docs.some((doc) => doc.doc_id === eventDocId)) return;

    const greetedDocId = localStorage.getItem(LAST_GREETED_UPLOAD_DOC_KEY);
    if (greetedDocId === eventDocId) return;

    getDashboardSummary()
      .then((summary) => {
        const payload = summary as DashboardSummary;
        const name = payload.snapshot?.taxpayer_name?.trim() || "there";
        setMsgs((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            content: `Hi ${name}! I see your document was uploaded. Want me to summarize what changed?`,
            ts: Date.now(),
          },
        ]);
        localStorage.setItem(LAST_GREETED_UPLOAD_DOC_KEY, eventDocId);
      })
      .catch(() => {
        setMsgs((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            content: "Hi there! I see your document was uploaded. Want me to summarize what changed?",
            ts: Date.now(),
          },
        ]);
        localStorage.setItem(LAST_GREETED_UPLOAD_DOC_KEY, eventDocId);
      });
  }, [docs]);

  const suggestions = useMemo(
    () => [
      "Summarize what my uploaded docs say about my filing status.",
      "What documents are still missing for a stronger filing package?",
      "What opportunities should I verify next?",
      "Give me a concise checklist for next actions.",
    ],
    [],
  );

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const userMsg: Msg = {
      id: genId(),
      role: "user",
      content: trimmed,
      ts: Date.now(),
    };

    setMsgs((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    const placeholderId = genId();
    setMsgs((prev) => [
      ...prev,
      {
        id: placeholderId,
        role: "assistant",
        content: "Thinking...",
        ts: Date.now(),
      },
    ]);

    try {
      const active_doc_ids = activeDocId === "auto" ? [] : [activeDocId];

      const res = await fetch(`${API}/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          active_doc_ids,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as BackendChatResponse;

      setMsgs((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content: data.answer || "No response.",
                sources: toSources(data.sources),
                ts: Date.now(),
              }
            : m,
        ),
      );

      setApiStatus("ok");
    } catch {
      setApiStatus("down");
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content:
                  "Chat backend is unavailable right now. Start the API on http://localhost:8000, then retry.\n\nThis tool is educational and organizational only, not tax advice.",
                ts: Date.now(),
              }
            : m,
        ),
      );
    } finally {
      setThinking(false);
    }
  }

  function clearChat() {
    setMsgs([]);
    localStorage.removeItem(LS_CHAT);
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
              TaxPilot Chat
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Document-Grounded
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Ask TaxPilot</h1>

            <p className="mt-3 max-w-2xl text-white/70">
              Ask questions about uploaded documents, missing forms, and next filing steps.
              Responses are grounded in extracted data and retrieval context.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>Uploads detected: {docs.length}</Pill>
              <Pill>Educational only</Pill>
              <Pill>
                API: {apiStatus === "ok" ? "Online" : apiStatus === "down" ? "Offline" : "Checking..."}
              </Pill>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={clearChat}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Clear chat
            </button>
            <Link
              href="/upload"
              className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition"
            >
              Upload docs
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/60">Active context</div>
          <select
            value={activeDocId}
            onChange={(e) => setActiveDocId(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            <option value="auto">Auto (search across all docs)</option>
            {docs.map((doc) => (
              <option key={doc.doc_id} value={doc.doc_id}>
                {doc.original_name}
              </option>
            ))}
          </select>

          <div className="hidden md:block text-xs text-white/50">
            {activeDocId === "auto" ? "Global context" : "Scoped to selected file"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
              disabled={thinking}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Conversation</div>
          <div className="flex items-center gap-2">
            <Pill>{msgs.length} messages</Pill>
            {thinking ? <Pill>Thinking...</Pill> : <Pill>Ready</Pill>}
          </div>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[520px] overflow-auto">
          {msgs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
              No messages yet. Select context (optional) and ask a question.
            </div>
          ) : (
            msgs.map((m) => <Bubble key={m.id} msg={m} />)
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/10 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex flex-col gap-3 md:flex-row"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about deductions, missing docs, or report details..."
              className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/60"
            />

            <button
              type="submit"
              disabled={thinking || !input.trim()}
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 transition disabled:opacity-50 disabled:hover:bg-emerald-400"
            >
              Send
            </button>
          </form>

          <div className="mt-2 text-xs text-white/50">
            Endpoint: <span className="text-white/70 font-mono">{API}/v1/chat</span>
          </div>
        </div>
      </section>
    </div>
  );
}
