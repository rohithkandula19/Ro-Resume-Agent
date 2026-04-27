"use client";
import { useState } from "react";
import { MessageSquareQuote, Loader2, AlertTriangle, Target, Lightbulb, HelpCircle } from "lucide-react";
import { runInterviewPrep, type InterviewPrep, type InterviewQ } from "@/lib/api";

export default function InterviewPrep({
  resumeText,
  jdText,
  role,
}: {
  resumeText: string;
  jdText: string;
  role: string;
}) {
  const [data, setData] = useState<InterviewPrep | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!resumeText || resumeText.length < 100) {
      setError("Upload a resume first."); return;
    }
    setLoading(true); setError("");
    try {
      const r = await runInterviewPrep(resumeText, jdText, role);
      setData(r);
      if (r.error) setError(r.error);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquareQuote size={18} className="text-indigo-400" />
          <div className="font-semibold">Interview prep</div>
        </div>
        <button onClick={run} disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1.5">
          {loading && <Loader2 size={12} className="animate-spin" />}
          {data ? "Regenerate" : "Generate prep"}
        </button>
      </div>

      <div className="text-xs text-white/50 mb-3">
        Likely questions, STAR stories, and weak spots an interviewer will probe — grounded in your resume + JD.
      </div>

      {error && (
        <div className="mb-3 text-xs text-rose-300 bg-rose-500/10 hairline rounded-lg p-2 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center text-xs text-white/40 py-8">
          Click "Generate prep" to get likely questions for your target role.
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <QSection title="Behavioral questions" icon={<MessageSquareQuote size={14} />}
            items={data.behavioral} tone="indigo" />
          <QSection title="Role-specific / technical" icon={<Target size={14} />}
            items={data.technical} tone="emerald" />
          <QSection title="Resume probe" icon={<HelpCircle size={14} />}
            items={data.resume_digs} tone="amber" subtitle="Spots the interviewer will dig into" />

          {data.star_stories?.length > 0 && (
            <details className="hairline rounded-lg p-3 group" open>
              <summary className="cursor-pointer text-sm font-semibold flex items-center gap-2 text-white/90">
                <Lightbulb size={14} className="text-amber-300" />
                STAR stories ({data.star_stories.length})
              </summary>
              <div className="mt-3 space-y-3">
                {data.star_stories.map((s, i) => (
                  <div key={i} className="hairline rounded-lg p-3 bg-white/[0.02]">
                    <div className="text-xs text-indigo-300 font-medium mb-2">"{s.prompt}"</div>
                    <div className="space-y-1.5 text-xs">
                      <StarLine label="Situation" text={s.situation} />
                      <StarLine label="Task" text={s.task} />
                      <StarLine label="Action" text={s.action} />
                      <StarLine label="Result" text={s.result} />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {data.weak_spots?.length > 0 && (
            <details className="hairline rounded-lg p-3 border-amber-400/30 bg-amber-500/[0.03]" open>
              <summary className="cursor-pointer text-sm font-semibold flex items-center gap-2 text-amber-200">
                <AlertTriangle size={14} />
                Weak spots they will poke ({data.weak_spots.length})
              </summary>
              <div className="mt-3 space-y-2">
                {data.weak_spots.map((w, i) => (
                  <div key={i} className="text-xs">
                    <div className="text-amber-200 font-medium">· {w.issue}</div>
                    <div className="text-white/70 pl-3 mt-0.5">→ {w.how_to_address}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {data.questions_to_ask?.length > 0 && (
            <details className="hairline rounded-lg p-3">
              <summary className="cursor-pointer text-sm font-semibold text-white/90">
                Questions to ask back ({data.questions_to_ask.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-white/70 list-disc list-inside">
                {data.questions_to_ask.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function QSection({
  title, icon, items, tone, subtitle,
}: {
  title: string; icon: React.ReactNode; items: InterviewQ[];
  tone: "indigo" | "emerald" | "amber"; subtitle?: string;
}) {
  if (!items?.length) return null;
  const toneColor = tone === "indigo" ? "text-indigo-300"
    : tone === "emerald" ? "text-emerald-300" : "text-amber-300";
  return (
    <details className="hairline rounded-lg p-3" open>
      <summary className={`cursor-pointer text-sm font-semibold flex items-center gap-2 ${toneColor}`}>
        {icon} {title} ({items.length})
      </summary>
      {subtitle && <div className="text-[10px] text-white/40 mt-1 mb-2">{subtitle}</div>}
      <div className="mt-2 space-y-2">
        {items.map((q, i) => (
          <div key={i} className="text-xs">
            <div className="text-white/90">{i + 1}. {q.q}</div>
            {q.why_asked && <div className="text-white/50 italic pl-3 mt-0.5">Why: {q.why_asked}</div>}
            {q.angle && <div className={`${toneColor} pl-3 mt-0.5`}>→ {q.angle}</div>}
          </div>
        ))}
      </div>
    </details>
  );
}

function StarLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-white/40 font-mono w-16 shrink-0">{label}:</span>
      <span className="text-white/80 flex-1">{text}</span>
    </div>
  );
}
