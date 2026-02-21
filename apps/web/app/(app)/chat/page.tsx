"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

function Bubble({
  msg,
}: {
  msg: Msg;
}) {
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
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-white">
          {msg.content}
        </div>

        {!isUser && msg.sources && msg.sources.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-white/70">
                Sources used (mock)
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

async function fakeRagAnswer(q: string): Promise<{ answer: string; sources: Source[] }> {
  // quick heuristic mock (replace with real API later)
  const lower = q.toLowerCase();

  if (lower.includes("student loan") || lower.includes("1098-e")) {
    return {
      answer:
        "Based on the detected 1098-E, you *may* be eligible to deduct student loan interest depending on your MAGI and filing status. To confirm, TaxPilot needs the 1098-E amount and your income thresholds.\n\nThis is educational, not tax advice.",
      sources: [
        { doc: "1098-E (Student Loan Interest)", snippet: "Interest paid may be deductible subject to income limits." },
        { doc: "W-2 (Wages)", snippet: "Income used to assess eligibility thresholds." },
      ],
    };
  }

  if (lower.includes("education") || lower.includes("1098-t") || lower.includes("aotc") || lower.includes("llc")) {
    return {
      answer:
        "You might qualify for an education credit (AOTC/LLC) if you have qualified tuition expenses. TaxPilot would confirm enrollment/tuition via 1098-T and related receipts.\n\nThis is educational, not tax advice.",
      sources: [
        { doc: "1098-T (Tuition Statement)", snippet: "Tuition/fees used to evaluate education credits." },
        { doc: "Receipts (Qualified expenses)", snippet: "Books/supplies may count depending on the credit and rules." },
      ],
    };
  }

  if (lower.includes("itemize") || lower.includes("standard deduction")) {
    return {
      answer:
        "A quick check: if your potential itemized deductions (mortgage interest, charitable donations, certain medical expenses, state/local taxes) exceed the standard deduction, itemizing *may* help. TaxPilot can help you organize those totals.\n\nThis is educational, not tax advice.",
      sources: [
        { doc: "Charity Receipts", snippet: "Sum of eligible charitable contributions." },
        { doc: "1098 (Mortgage Interest)", snippet: "Mortgage interest may be deductible if you itemize." },
      ],
    };
  }

  return {
    answer:
      "I can help organize what you have and what’s missing. If you upload your W-2/1099/1098/1040, I’ll generate a snapshot and explain flags grounded in your docs.\n\nTry asking: “What docs am I missing?” or “What opportunities should I review?”",
    sources: [
      { doc: "Uploaded documents (demo)", snippet: "TaxPilot grounds answers in your provided files." },
    ],
  };
}

export default function ChatPage() {
  const sp = useSearchParams();
  const presetQ = sp.get("q");

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

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
    // If user clicked a preset question (from dashboard quick ask)
    if (presetQ) {
      setInput(presetQ);
    }
  }, [presetQ]);

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

    // “typing” placeholder
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
      // Replace this call with real backend later:
      const res = await fakeRagAnswer(trimmed);

      setMsgs((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content: res.answer,
                sources: res.sources,
                ts: Date.now(),
              }
            : m
        )
      );
    } catch (e: any) {
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...m,
                content: "Something went wrong. Please try again.",
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
              Grounded answers (mock)
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Ask TaxPilot
            </h1>
            <p className="mt-3 text-white/70 max-w-2xl">
              Ask questions about deductions, missing documents, and next steps.
              Answers will be grounded in your uploaded docs once backend is connected.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>RAG-style answers</Pill>
              <Pill>No tax advice</Pill>
              <Pill>Demo Mode</Pill>
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

      {/* Suggestions */}
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
              No messages yet. Try one of the suggestions above — or ask your own question.
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
            Tip: Just Try
          </div>
        </div>
      </section>
    </div>
  );
}