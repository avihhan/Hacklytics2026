"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    snippet?: string;
  }>;
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const LS_CHAT = "taxpilot_chat_v1";

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
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-emerald-400/50 pl-4 py-1 my-2 text-white/70 italic">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full border-collapse divide-y divide-white/10 text-xs">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
              th: ({ children }) => (
                <th className="px-3 py-2 text-left font-semibold text-white/90">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-white/70 border-t border-white/5">
                  {children}
                </td>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>

        {!isUser && msg.sources && msg.sources.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white/70">
                Sources used
              </div>
              <Pill>{msg.sources.length}</Pill>
            </div>

            <div className="mt-2 space-y-2">
              {msg.sources.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="text-xs font-semibold text-white/80">
                    {s.doc}
                  </div>
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
      doc: s.title ?? s.doc ?? s.doc_id ?? "Document",
      snippet: s.snippet ?? "",
    }))
    .filter((s) => s.doc && s.snippet);
}

export default function ChatPage() {
  const sp = useSearchParams();
  const presetQ = sp.get("q");

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeReturn, setActiveReturn] = useState<
    "auto" | "1040_2025" | "w2_2025" | "1098e_2025"
  >("auto");
  const [apiStatus, setApiStatus] = useState<"unknown" | "ok" | "down">(
    "unknown"
  );

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
    // lightweight health check
    (async () => {
      try {
        const r = await fetch(`${API}/health`, { method: "GET" });
        setApiStatus(r.ok ? "ok" : "down");
      } catch {
        setApiStatus("down");
      }
    })();
  }, []);

  const suggestions = useMemo(
    () => [
      "Do I likely qualify for student loan interest deduction?",
      "What documents am I missing for education credits?",
      "Should I consider itemizing this year?",
      "Summarize what you know about my filing so far.",
    ],
    []
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
        content: "Thinking…",
        ts: Date.now(),
      },
    ]);

    try {
      const active_doc_ids =
        activeReturn === "auto" ? [] : [activeReturn as string];

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
            : m
        )
      );

      setApiStatus("ok");
    } catch (e: any) {
      setApiStatus("down");
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content:
                  "Backend chat is not reachable right now.\n\nMake sure Flask is running on http://localhost:8000 and your GEMINI_API_KEY is set.\n\nEducational only, not tax advice.",
                ts: Date.now(),
              }
            : m
        )
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
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
              TaxPilot Chat
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Gemini via Flask
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Ask TaxPilot
            </h1>

            <p className="mt-3 text-white/70 max-w-2xl">
              Ask questions about deductions, missing documents, and next steps.
              TaxPilot will ground answers in the selected return/documents.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>Grounded responses</Pill>
              <Pill>Educational only</Pill>
              <Pill>Demo Mode</Pill>
              <Pill>
                API:{" "}
                {apiStatus === "ok"
                  ? "Online"
                  : apiStatus === "down"
                  ? "Offline"
                  : "Checking…"}
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

      {/* Context selector + Suggestions */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/60">Active context</div>
          <select
            value={activeReturn}
            onChange={(e) =>
              setActiveReturn(e.target.value as typeof activeReturn)
            }
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            <option value="auto">Auto (no doc selected)</option>
            <option value="1040_2025">1040 • 2025 Return</option>
            <option value="w2_2025">W-2 • 2025</option>
            <option value="1098e_2025">1098-E • 2025</option>
          </select>

          <div className="hidden md:block text-xs text-white/50">
            (Backend uses this to ground Gemini.)
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

      {/* Chat window */}
      <section className="rounded-3xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Conversation</div>
          <div className="flex items-center gap-2">
            <Pill>{msgs.length} messages</Pill>
            {thinking ? <Pill>Thinking…</Pill> : <Pill>Ready</Pill>}
          </div>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[520px] overflow-auto">
          {msgs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
              No messages yet. Pick a context (optional) and ask a question — or
              click a suggestion.
            </div>
          ) : (
            msgs.map((m) => <Bubble key={m.id} msg={m} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
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
              placeholder="Ask about deductions, missing docs, or your report…"
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
            Backend endpoint:{" "}
            <span className="text-white/70 font-mono">{API}/v1/chat</span>
          </div>
        </div>
      </section>
    </div>
  );
}