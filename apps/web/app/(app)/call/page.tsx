"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { listDocs } from "@/lib/api";
import { useConversation } from "@elevenlabs/react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type StoredDoc = { id: string; name: string; pages?: number | null };
type TranscriptLine = { role: "user" | "agent"; text: string; ts: number };

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function SoundWave({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {[60, 100, 70, 90, 50].map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-emerald-400 transition-all duration-300"
          style={{
            height: active ? `${h}%` : "15%",
            opacity: active ? 1 : 0.3,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceCallPage() {
  const [docs, setDocs] = useState<StoredDoc[]>([]);
  const [activeDocs, setActiveDocs] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [callActive, setCallActive] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [ragLoading, setRagLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const activeDocsRef = useRef<string[]>([]);

  async function runVoiceSearch(query: string) {
    setRagLoading(true);
    try {
      const res = await fetch(`${API}/v1/voice/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          active_doc_ids: activeDocsRef.current,
          top_k: 3,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { response?: string };
      return data.response || "No response found in uploaded documents.";
    } finally {
      setRagLoading(false);
    }
  }

  const conversation = useConversation({
    onConnect: () => {
      setCallActive(true);
      setCallStartedAt(Date.now());
      setCallSeconds(0);
      addLine("agent", "Call started. I am listening now.");
    },
    onDisconnect: () => {
      setCallActive(false);
      addLine("agent", "Call ended.");
    },
    onMessage: (message: { source: "ai" | "user"; message: string }) => {
      let text = message.message;
      if (message.source === "ai") {
        try {
          const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
          const parsed = JSON.parse(cleanText);
          if (parsed && typeof parsed === "object") {
            if (parsed.query) {
              text = `[Searching tax base for: "${parsed.query}"]`;
            } else {
              // Ignore arbitrary JSON that has no queries
              return;
            }
          }
        } catch {
          // Not JSON, continue normally
        }
      }
      addLine(message.source === "ai" ? "agent" : "user", text);
    },
    onError: (err: string | Error) => {
      const msg = typeof err === "string" ? err : err.message;
      setError(msg);
      setCallActive(false);
      addLine("agent", msg);
    },
    clientTools: {
      search_tax_knowledge: async (parameters: unknown) => {
        const payload = parameters as { query?: unknown };
        const query = typeof payload?.query === "string" ? payload.query.trim() : "";
        if (!query) {
          return "Missing query input for tax document search.";
        }
        try {
          return await runVoiceSearch(query);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "RAG lookup failed";
          setError(msg);
          return "I encountered an error while searching your uploaded tax documents.";
        }
      },
    },
  });

  useEffect(() => {
    let mounted = true;
    listDocs()
      .then((raw) => {
        if (!mounted) return;
        const mapped = (raw as Array<{ doc_id: string; original_name: string }>).map((d) => ({
          id: d.doc_id,
          name: d.original_name,
          pages: null,
        }));
        setDocs(mapped);
        setActiveDocs(mapped.map((d) => d.id));
      })
      .catch(() => {
        if (!mounted) return;
        setDocs([]);
        setActiveDocs([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    activeDocsRef.current = activeDocs;
  }, [activeDocs]);

  useEffect(() => {
    if (!callActive) return;
    conversation.sendContextualUpdate(
      `Scope tax-document searches to these document IDs when relevant: ${activeDocs.join(", ") || "all uploaded documents"}.`
    );
  }, [activeDocs, callActive, conversation]);

  useEffect(() => {
    if (!callActive || !callStartedAt) return;
    const timer = window.setInterval(() => {
      setCallSeconds(Math.floor((Date.now() - callStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callActive, callStartedAt]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    // No need to cleanup recognitionRef
  }, []);

  function formatDuration(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function addLine(role: "user" | "agent", text: string) {
    setTranscript((prev) => [...prev, { role, text, ts: Date.now() }]);
  }

  function toggleDoc(id: string) {
    setActiveDocs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function startCall() {
    setError(null);
    
    const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
    if (!agentId) {
      setError("Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID environment variable.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId,
        connectionType: "webrtc",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to start call";
      setError(msg);
      setCallActive(false);
      addLine("agent", msg);
    }
  }

  async function endCall() {
    await conversation.endSession();
  }

  function sendPrompt(prompt: string) {
    if (!callActive) {
      setError("Start the call first, then send a prompt.");
      return;
    }
    conversation.sendUserMessage(prompt);
  }

  const prompts = [
    "What forms have I uploaded?",
    "What does my W-2 show for Box 1 in 2023?",
    "What documents am I still missing for education credits?",
  ];

  const statusLabel = callActive ? "Call active" : "Ready";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
              TaxPilot Voice
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Native call screen
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Call TaxPilot</h1>
            <p className="mt-3 text-white/70 max-w-2xl">
              ElevenLabs handles the live call, and the agent can query your uploaded documents through the TaxPilot search tool.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>{statusLabel}</Pill>
              <Pill>{activeDocs.length} doc{activeDocs.length !== 1 ? "s" : ""} in context</Pill>
              {callActive && <Pill>{conversation.isSpeaking ? "Agent speaking..." : "Listening..."}</Pill>}
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col items-center gap-3 pb-4">
            <div className="relative">
              {callActive && <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />}
              <button
                onClick={callActive ? endCall : startCall}
                className={[
                  "relative flex h-20 w-20 items-center justify-center rounded-full text-2xl transition-all shadow-lg",
                  callActive
                    ? "bg-red-500 hover:bg-red-400 text-white"
                    : "bg-emerald-400 hover:bg-emerald-300 text-slate-950",
                ].join(" ")}
              >
                {callActive ? "✕" : "📞"}
              </button>
            </div>
            <div className="text-xs text-white/50">{callActive ? `On call ${formatDuration(callSeconds)}` : "Tap to call"}</div>
            <SoundWave active={conversation.status === "connected" && conversation.isSpeaking} />
          </div>

          <div className="mt-4 text-sm font-semibold">Documents in context</div>
          <div className="mt-1 text-xs text-white/60 mb-3">RAG answers are scoped to these docs when selected.</div>
          {docs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              No documents uploaded.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {docs.map((d) => (
                <label
                  key={d.id}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 cursor-pointer hover:bg-black/30 transition"
                >
                  <input
                    type="checkbox"
                    checked={activeDocs.includes(d.id)}
                    onChange={() => toggleDoc(d.id)}
                    className="mt-1 h-4 w-4 accent-emerald-400"
                    disabled={callActive}
                  />
                  <div className="text-sm font-medium truncate">{d.name}</div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/5 flex flex-col">
          <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Transcript</div>
            <div className="flex gap-2">
              <Pill>{transcript.length} turns</Pill>
              {callActive && <Pill>Live</Pill>}
              {ragLoading && <Pill>RAG…</Pill>}
            </div>
          </div>

          <div className="px-5 py-4 border-b border-white/10 flex flex-wrap gap-2">
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => sendPrompt(p)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto px-5 py-4 space-y-3 min-h-[300px] max-h-[560px]">
            {transcript.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-white/40 pt-16">
                Start a call. Speak naturally; each utterance is transcribed and sent to RAG.
              </div>
            ) : (
              transcript.map((t, i) => (
                <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={[
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      t.role === "user"
                        ? "bg-emerald-400/15 border border-emerald-400/20 text-white"
                        : "bg-white/5 border border-white/10 text-white/90",
                    ].join(" ")}
                  >
                    <div className="text-[10px] mb-1 text-white/40 uppercase tracking-wide">
                      {t.role === "user" ? "You" : "TaxPilot"}
                    </div>
                    {t.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-300/10 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}
    </div>
  );
}
