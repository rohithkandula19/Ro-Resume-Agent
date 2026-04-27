"use client";
import { useState } from "react";
import { runPersona } from "@/lib/api";

const PERSONAS = [
  { key: "google", name: "Google" },
  { key: "amazon", name: "Amazon Bar Raiser" },
  { key: "startup", name: "Startup Founder" },
  { key: "finance", name: "Goldman / IB" },
  { key: "mckinsey", name: "McKinsey Partner" },
  { key: "faang_frontend", name: "Meta / Apple Frontend" },
  { key: "data_ml", name: "ML Hiring Manager" },
];

export default function PersonaReview({ resumeText, jdText }: { resumeText: string; jdText: string }) {
  const [picked, setPicked] = useState("google");
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<any>(null);
  const [error, setError] = useState("");

  const run = async () => {
    if (!resumeText) return alert("Upload/parse your resume first.");
    setLoading(true); setError("");
    try {
      const r = await runPersona(resumeText, picked, jdText);
      setReview(r);
    } catch (e: any) {
      setError(e.message || "Review failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <div className="text-lg font-semibold">Recruiter Persona Review</div>
          <div className="text-xs text-white/50">See your resume through different eyes</div>
        </div>
        <button onClick={run} disabled={loading}
          className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-medium disabled:opacity-50">
          {loading ? "Reviewing…" : "Review as " + (PERSONAS.find((p) => p.key === picked)?.name)}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {PERSONAS.map((p) => (
          <button key={p.key} onClick={() => setPicked(p.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              picked === p.key ? "bg-indigo-500 border-indigo-400 text-white" :
              "border-white/10 text-white/70 hover:border-white/30"
            }`}>
            {p.name}
          </button>
        ))}
      </div>

      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
      {review && (
        <div className="space-y-3">
          <div className="flex gap-4 items-center">
            <div className="text-4xl font-bold">{review.score ?? "–"}</div>
            <div>
              <div className="text-sm">{review.verdict}</div>
              <div className={`text-xs ${review.would_interview ? "text-emerald-300" : "text-red-300"}`}>
                {review.would_interview ? "Would interview" : "Would pass"}
              </div>
            </div>
          </div>
          {review.strengths?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-widest text-emerald-300/80 mb-1">Strengths</div>
              <ul className="text-sm space-y-0.5">
                {review.strengths.map((s: string, i: number) => <li key={i}>+ {s}</li>)}
              </ul>
            </div>
          )}
          {review.weaknesses?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-300/80 mb-1">Weaknesses</div>
              <ul className="text-sm space-y-0.5">
                {review.weaknesses.map((s: string, i: number) => <li key={i}>− {s}</li>)}
              </ul>
            </div>
          )}
          {review.rewrites?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-widest text-indigo-300/80 mb-1">Rewrites suggested</div>
              <div className="space-y-2">
                {review.rewrites.map((r: any, i: number) => (
                  <div key={i} className="hairline rounded-lg p-3 text-sm">
                    <div className="text-white/50 text-xs">Original</div>
                    <div className="text-white/80">{r.original}</div>
                    <div className="text-emerald-300/80 text-xs mt-2">Suggested</div>
                    <div>{r.suggested}</div>
                    <div className="text-white/40 text-xs mt-1 italic">Why: {r.why}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
