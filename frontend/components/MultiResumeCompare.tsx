"use client";
import { useState } from "react";

interface CompareResult {
  winner?: string; // "A" | "B" | "Tie"
  verdict?: string;
  score_a?: number;
  score_b?: number;
  strengths_a?: string[];
  strengths_b?: string[];
  weaknesses_a?: string[];
  weaknesses_b?: string[];
  recommendation?: string;
}

function Spinner() {
  return (
    <span className="inline-flex items-center gap-1 text-white/50 text-sm">
      <span className="animate-bounce delay-0">.</span>
      <span className="animate-bounce delay-75">.</span>
      <span className="animate-bounce delay-150">.</span>
    </span>
  );
}

function ScoreBar({ label, score, colorClass }: { label: string; score: number; colorClass: string }) {
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="font-semibold text-white">{score}/100</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function MultiResumeCompare({ jdText }: { jdText: string }) {
  const [resumeA, setResumeA] = useState("");
  const [resumeB, setResumeB] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const compare = async () => {
    if (!resumeA.trim() || !resumeB.trim()) {
      setError("Please paste both resumes before comparing.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/multi-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_a: resumeA, resume_b: resumeB, jd_text: jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Comparison failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const winner = result?.winner?.toUpperCase();
  const winnerLabel =
    winner === "A" ? "Resume A Wins" : winner === "B" ? "Resume B Wins" : winner === "TIE" ? "It's a Tie" : "";

  const winnerBannerClass =
    winner === "A"
      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
      : winner === "B"
      ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
      : "bg-white/10 border-white/20 text-white/80";

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="text-lg font-semibold mb-3">Compare Two Resumes</div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Resume A</label>
          <textarea
            className="hairline rounded-lg p-2 bg-transparent text-sm w-full resize-none focus:outline-none focus:border-indigo-500/60 transition"
            rows={8}
            value={resumeA}
            onChange={(e) => setResumeA(e.target.value)}
            placeholder="Paste Resume A here…"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Resume B</label>
          <textarea
            className="hairline rounded-lg p-2 bg-transparent text-sm w-full resize-none focus:outline-none focus:border-indigo-500/60 transition"
            rows={8}
            value={resumeB}
            onChange={(e) => setResumeB(e.target.value)}
            placeholder="Paste Resume B here…"
          />
        </div>
      </div>

      <button
        onClick={compare}
        disabled={loading}
        className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50"
      >
        {loading ? <span className="flex items-center gap-2">Comparing <Spinner /></span> : "Compare"}
      </button>

      {error && <div className="text-red-400 text-sm mt-2">{error}</div>}

      {result && (
        <div className="mt-4 space-y-4">
          {/* Winner banner */}
          {winnerLabel && (
            <div className={`hairline rounded-xl p-4 border ${winnerBannerClass}`}>
              <div className="text-xl font-bold mb-1">{winnerLabel}</div>
              {result.verdict && <p className="text-sm opacity-80">{result.verdict}</p>}
            </div>
          )}

          {/* Score bars */}
          {(result.score_a !== undefined || result.score_b !== undefined) && (
            <div className="flex gap-4">
              <ScoreBar label="Resume A" score={result.score_a ?? 0} colorClass="bg-indigo-500" />
              <ScoreBar label="Resume B" score={result.score_b ?? 0} colorClass="bg-purple-500" />
            </div>
          )}

          {/* Strengths */}
          {((result.strengths_a && result.strengths_a.length > 0) ||
            (result.strengths_b && result.strengths_b.length > 0)) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1.5">
                  A Strengths
                </div>
                <ul className="space-y-1">
                  {(result.strengths_a ?? []).map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-sm text-white/70">
                      <span className="text-green-400 shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1.5">
                  B Strengths
                </div>
                <ul className="space-y-1">
                  {(result.strengths_b ?? []).map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-sm text-white/70">
                      <span className="text-green-400 shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Weaknesses */}
          {((result.weaknesses_a && result.weaknesses_a.length > 0) ||
            (result.weaknesses_b && result.weaknesses_b.length > 0)) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1.5">
                  A Weaknesses
                </div>
                <ul className="space-y-1">
                  {(result.weaknesses_a ?? []).map((w, i) => (
                    <li key={i} className="flex gap-1.5 text-sm text-white/70">
                      <span className="text-rose-400 shrink-0">−</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1.5">
                  B Weaknesses
                </div>
                <ul className="space-y-1">
                  {(result.weaknesses_b ?? []).map((w, i) => (
                    <li key={i} className="flex gap-1.5 text-sm text-white/70">
                      <span className="text-rose-400 shrink-0">−</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Recommendation */}
          {result.recommendation && (
            <div className="hairline rounded-lg p-3 bg-indigo-500/5">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                Recommendation
              </div>
              <p className="text-sm text-white/80">{result.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
