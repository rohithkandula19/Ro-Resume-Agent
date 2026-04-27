"use client";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Paperclip, Send, X, Sparkles, RefreshCw } from "lucide-react";
import { uploadResume } from "@/lib/api";

type Msg = { role: "user" | "assistant"; content: string };

// ── Strip markdown bold/italic/dashes that look bad in chat bubbles ────────────
function clean(text: string): string {
  if (!text) return "";
  // Detect garbage LLM outputs (model echoing its own prompt template)
  if (/\{user_message\}|\{message\}|\{prompt\}/i.test(text)) {
    return "⚠ Model returned unexpected output. Please try again.";
  }
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/—/g, ",")
    .replace(/–/g, "-")
    .replace(/\s+,/g, ",");
}

export default function ChatPanel({
  sessionId,
  resumeText = "",
  jdText = "",
  onResumeParsed,
  inline = false,
}: {
  sessionId: string;
  resumeText?: string;
  jdText?: string;
  onResumeParsed?: (text: string, filename: string) => void;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(inline);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi, I am RO Resume Agent. Upload your resume, paste a JD, or tell me what role you are aiming for. I will guide you step by step.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Send ─────────────────────────────────────────────────────────────────────
  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;
    setInput("");

    // Build history — always start from the first USER message so we never
    // send a leading assistant turn (confuses strict models like Gemma/DeepSeek).
    const allMsgs = [...messages];
    const firstUserIdx = allMsgs.findIndex((m) => m.role === "user");
    const history = (firstUserIdx >= 0 ? allMsgs.slice(firstUserIdx) : []).slice(-20);

    const next: Msg[] = [...messages, { role: "user", content: text }, { role: "assistant", content: "" }];
    setMessages(next);
    setStreaming(true);

    try {
      const r = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          history,
          // Pass current session context so the LLM is aware of loaded resume/JD
          resume_text: resumeText || "",
          jd_text: jdText || "",
        }),
      });
      if (!r.body) throw new Error("no stream");
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          try {
            const obj = JSON.parse(payload);
            if (obj.delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: (copy[copy.length - 1].content || "") + obj.delta,
                };
                return copy;
              });
            }
            if (obj.error) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: "⚠ " + obj.error };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: "Error: " + e.message }]);
    } finally {
      setStreaming(false);
    }
  };

  // ── File upload ──────────────────────────────────────────────────────────────
  const onFile = async (f: File | null) => {
    if (!f) return;
    setUploading(true);
    setMessages((m) => [...m, { role: "user", content: `[Uploading ${f.name}…]` }]);
    try {
      const r = await uploadResume(f);
      onResumeParsed?.(r.text, r.filename);
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: "user", content: `[Uploaded ${r.filename}]` },
        {
          role: "assistant",
          content: `Got it. I parsed ${r.filename} (${r.chars} chars). What role are you targeting?`,
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: "Upload failed: " + e.message }]);
    } finally {
      setUploading(false);
    }
  };

  // ── Context indicators ───────────────────────────────────────────────────────
  const ctxLabel = resumeText && jdText ? "Resume + JD" : resumeText ? "Resume loaded" : jdText ? "JD loaded" : null;

  // ── Floating button (closed, non-inline mode only) ──────────────────────────
  if (!open && !inline) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[200] w-14 h-14 rounded-full bg-indigo-500 hover:bg-indigo-400 flex items-center justify-center shadow-lg glow"
        aria-label="Open consultant"
      >
        <MessageSquare className="text-white" />
      </button>
    );
  }

  // ── Chat panel — either inline (full tab) or floating ───────────────────────
  const panelClass = inline
    ? "flex flex-col h-full rounded-2xl overflow-hidden glass"
    : "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[200] w-[calc(100vw-2rem)] max-w-[380px] h-[70vh] md:h-[560px] rounded-2xl flex flex-col overflow-hidden shadow-2xl";

  return (
    <div
      className={panelClass}
      style={inline ? {} : { background: "rgba(15,15,25,0.97)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="text-indigo-400 shrink-0" size={18} />
          <div className="text-sm font-semibold shrink-0">RO AI Consultant</div>
          {streaming && <span className="text-xs text-indigo-300 shrink-0">thinking…</span>}
          {!streaming && ctxLabel && (
            <span className="text-[10px] text-emerald-400/80 border border-emerald-400/30 px-1.5 py-0.5 rounded-full shrink-0 truncate">
              {ctxLabel}
            </span>
          )}
        </div>
        {!inline && (
          <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/80 shrink-0 ml-2">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => {
          const content = clean(m.content);
          const isError = content.startsWith("⚠");
          const isEmpty = !content && streaming && i === messages.length - 1;

          return (
            <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
              <div
                className={`inline-block max-w-[85%] rounded-xl px-3 py-2 whitespace-pre-wrap text-left ${
                  m.role === "user"
                    ? "bg-indigo-500/80 text-white"
                    : isError
                    ? "bg-red-500/10 text-red-300 border border-red-500/20"
                    : "bg-white/5 text-white/90 border border-white/5"
                }`}
              >
                {isEmpty ? (
                  <span className="inline-flex gap-1 items-center opacity-60">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                ) : (
                  content
                )}
                {/* Retry button on error responses */}
                {isError && !streaming && i === messages.length - 1 && (
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        // Remove the last assistant error + last user message, then resend
                        setMessages((prev) => {
                          const copy = [...prev];
                          // Remove last assistant (error) message
                          copy.pop();
                          // Get the last user message text before removing it
                          const lastUser = copy.filter((x) => x.role === "user").at(-1);
                          if (lastUser) {
                            copy.pop(); // remove last user msg too so we can resend
                            setTimeout(() => send(lastUser.content), 50);
                          }
                          return copy;
                        });
                      }}
                      className="flex items-center gap-1 text-[11px] text-red-300/80 hover:text-red-200 mt-0.5"
                    >
                      <RefreshCw size={11} /> Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div className="px-3 py-2 border-t border-white/5 flex items-center gap-2 shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`p-2 text-white/60 hover:text-white shrink-0 ${uploading ? "animate-pulse" : ""}`}
          aria-label="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          disabled={uploading}
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask the consultant…"
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none max-h-24"
        />
        <button
          onClick={() => send()}
          disabled={streaming || !input.trim()}
          className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 shrink-0"
          aria-label="Send"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}
