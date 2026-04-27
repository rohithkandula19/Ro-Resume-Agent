"use client";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, Play, RotateCw, Sparkles } from "lucide-react";
import { mockInterviewTurn, mockInterviewFeedback, type MockTurn, type MockFeedback } from "@/lib/api";

const STAGES = ["warmup", "behavioral", "technical", "resume_dig", "jd_match", "reverse", "done"] as const;
type Stage = typeof STAGES[number];

export default function MockInterview({
  resumeText,
  jdText,
  role,
}: {
  resumeText: string;
  jdText: string;
  role: string;
}) {
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<MockTurn[]>([]);
  const [stage, setStage] = useState<Stage>("warmup");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [feedbacks, setFeedbacks] = useState<Record<number, MockFeedback>>({});
  const [feedbackBusy, setFeedbackBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  const askNext = async (h: MockTurn[], st: Stage) => {
    setBusy(true); setErr("");
    try {
      const r = await mockInterviewTurn({
        resume_text: resumeText, jd_text: jdText, role, history: h, stage: st,
      });
      if (r.error) { setErr(r.error); return; }
      if (r.question) setHistory([...h, { role: "interviewer", content: r.question }]);
    } catch (e: any) {
      setErr(String(e.message || e).slice(0, 200));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!resumeText) { setErr("Upload a resume first."); return; }
    setStarted(true); setHistory([]); setFeedbacks({}); setStage("warmup");
    await askNext([], "warmup");
  };

  const sendAnswer = async () => {
    const ans = input.trim();
    if (!ans || busy) return;
    setInput("");
    const newHistory: MockTurn[] = [...history, { role: "candidate", content: ans }];
    setHistory(newHistory);
    // Auto-advance stage every ~2 candidate turns
    const candidateCount = newHistory.filter(t => t.role === "candidate").length;
    const stageIdx = Math.min(STAGES.length - 1, Math.floor(candidateCount / 2));
    const nextStage = STAGES[stageIdx];
    setStage(nextStage);
    await askNext(newHistory, nextStage);
  };

  const getFeedback = async (idx: number) => {
    const question = history[idx - 1]?.content;
    const answer = history[idx]?.content;
    if (!question || !answer) return;
    setFeedbackBusy(idx);
    try {
      const fb = await mockInterviewFeedback({
        question, answer, resume_text: resumeText, jd_text: jdText, role,
      });
      setFeedbacks({ ...feedbacks, [idx]: fb });
    } catch (e: any) {
      setFeedbacks({ ...feedbacks, [idx]: { ...({} as MockFeedback), error: String(e.message || e).slice(0, 160) } });
    } finally {
      setFeedbackBusy(null);
    }
  };

  const reset = () => { setStarted(false); setHistory([]); setFeedbacks({}); setStage("warmup"); setErr(""); };

  if (!started) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="text-indigo-400" size={18} />
          <div className="font-semibold">Mock Interview</div>
        </div>
        <div className="text-sm text-white/70 mb-4">
          A realistic, turn-by-turn interview grounded in your resume{jdText ? " and the JD" : ""}. Ask me
          for feedback on any answer to see a STAR breakdown and a stronger version.
        </div>
        <button onClick={start} disabled={!resumeText}
          className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold disabled:opacity-40 flex items-center gap-2">
          <Play size={14} /> Start interview
        </button>
        {!resumeText && <div className="mt-2 text-xs text-amber-300">Upload a resume first.</div>}
        {err && <div className="mt-3 text-xs text-rose-300">{err}</div>}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-indigo-400" size={18} />
          <div className="font-semibold">Mock Interview</div>
          <span className="text-[10px] uppercase tracking-widest text-white/50 ml-2">{stage}</span>
        </div>
        <button onClick={reset} className="text-xs text-white/60 hover:text-white flex items-center gap-1">
          <RotateCw size={12} /> Restart
        </button>
      </div>

      <div className="space-y-3 max-h-[60vh] md:max-h-[460px] overflow-y-auto pr-1">
        {history.map((t, i) => (
          <div key={i} className={t.role === "interviewer" ? "flex" : "flex justify-end"}>
            <div className={`max-w-[92%] md:max-w-[85%] rounded-2xl p-3 text-sm ${
              t.role === "interviewer"
                ? "bg-white/5 hairline"
                : "bg-indigo-500/20 hairline"
            }`}>
              <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">
                {t.role === "interviewer" ? "Interviewer" : "You"}
              </div>
              <div className="whitespace-pre-wrap">{t.content}</div>
              {t.role === "candidate" && (
                <div className="mt-2 flex items-center gap-2">
                  {!feedbacks[i] && (
                    <button onClick={() => getFeedback(i)} disabled={feedbackBusy === i}
                      className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
                      {feedbackBusy === i ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      Coach my answer
                    </button>
                  )}
                </div>
              )}
              {feedbacks[i] && <FeedbackCard fb={feedbacks[i]} />}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex">
            <div className="bg-white/5 hairline rounded-2xl p-3 text-xs text-white/50 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {err && <div className="mt-2 text-xs text-rose-300">{err}</div>}

      <div className="mt-3 flex gap-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendAnswer(); }}
          placeholder="Your answer… (Cmd+Enter to send)"
          className="flex-1 hairline rounded-xl p-2 bg-transparent text-sm min-h-[60px]" />
        <button onClick={sendAnswer} disabled={busy || !input.trim()}
          className="px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-40 self-end h-[60px] flex items-center gap-1">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function FeedbackCard({ fb }: { fb: MockFeedback }) {
  if (fb.error) {
    return <div className="mt-2 text-[11px] text-rose-300">Feedback error: {fb.error}</div>;
  }
  const star = fb.star_check || { situation: false, task: false, action: false, result: false };
  return (
    <div className="mt-3 border-t border-white/10 pt-3 text-[12px] space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-[10px] uppercase tracking-widest text-white/50">Score</div>
        <div className="font-bold text-indigo-300">{fb.score}/5</div>
        <div className="flex gap-1 ml-2">
          {(["situation", "task", "action", "result"] as const).map((k) => (
            <span key={k} className={`text-[9px] px-1.5 py-0.5 rounded ${
              (star as any)[k] ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/40"
            }`}>{k[0].toUpperCase()}</span>
          ))}
        </div>
      </div>
      {fb.strengths?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-300/70 mb-0.5">Strengths</div>
          <ul className="list-disc list-inside space-y-0.5 text-white/80">
            {fb.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {fb.weaknesses?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-amber-300/70 mb-0.5">Fix</div>
          <ul className="list-disc list-inside space-y-0.5 text-white/80">
            {fb.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {fb.stronger_version && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-indigo-300/70 mb-0.5">Stronger version</div>
          <div className="text-white/80 italic">{fb.stronger_version}</div>
        </div>
      )}
      {fb.followup_the_interviewer_will_ask && (
        <div className="text-white/60">
          <span className="text-[10px] uppercase tracking-widest text-white/40">Likely follow-up: </span>
          {fb.followup_the_interviewer_will_ask}
        </div>
      )}
    </div>
  );
}
