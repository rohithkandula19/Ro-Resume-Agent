"use client";
import { useState } from "react";

interface JDAnalysisResult {
  urgency?: string;
  culture_signals?: string[];
  green_flags?: Array<{ flag: string; reason: string }>;
  red_flags?: Array<{ flag: string; reason: string }>;
  negotiation_tips?: string[];
  ideal_traits?: string[];
  interview_style?: string;
  questions_to_ask?: string[];
  comp_hints?: string;
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

function ExpandableList({
  title,
  items,
  colorClass,
  badgeClass,
}: {
  title: string;
  items: Array<{ flag: string; reason: string }>;
  colorClass: string;
  badgeClass: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium w-full text-left"
      >
        <span className={`${colorClass}`}>{title}</span>
        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${badgeClass}`}>
          {items.length}
        </span>
        <span className="text-white/40 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 pl-2">
          {items.map((item, i) => (
            <li key={i} className="hairline rounded-lg p-2 text-sm">
              <span className={`font-medium ${colorClass}`}>{item.flag}</span>
              {item.reason && (
                <span className="text-white/60 ml-2 text-xs">— {item.reason}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JDAnalyzer({ jdText }: { jdText: string }) {
  const [result, setResult] = useState<JDAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const urgencyConfig: Record<string, { label: string; cls: string }> = {
    high: { label: "High Urgency", cls: "bg-red-500/20 text-red-300 border border-red-500/30" },
    medium: { label: "Medium Urgency", cls: "bg-amber-500/20 text-amber-300 border border-amber-500/30" },
    low: { label: "Low Urgency", cls: "bg-green-500/20 text-green-300 border border-green-500/30" },
  };

  const analyze = async () => {
    if (!jdText) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/jd-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_text: jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analysis failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const urgency = result?.urgency?.toLowerCase() ?? "";
  const urgencyStyle = urgencyConfig[urgency] ?? urgencyConfig["medium"];

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="text-lg font-semibold mb-3">JD Analyzer</div>

      {!jdText && !result && (
        <div className="text-white/40 text-sm italic py-6 text-center">
          Paste a job description above to unlock analysis.
        </div>
      )}

      {jdText && !result && !loading && (
        <button
          onClick={analyze}
          className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium"
        >
          Analyze JD
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-white/50 text-sm py-4">
          Analyzing <Spinner />
        </div>
      )}

      {error && <div className="text-red-400 text-sm mt-2">{error}</div>}

      {result && (
        <div className="mt-2 space-y-4">
          {/* Urgency badge */}
          {result.urgency && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${urgencyStyle.cls}`}>
                {urgencyStyle.label}
              </span>
              <button
                onClick={analyze}
                className="ml-auto text-xs text-white/30 hover:text-white/60 hairline rounded px-2 py-0.5"
              >
                Re-analyze
              </button>
            </div>
          )}

          {/* Culture Signals */}
          {result.culture_signals && result.culture_signals.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Culture Signals
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.culture_signals.map((sig, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-300 border border-green-500/20"
                  >
                    {sig}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Green Flags */}
          {result.green_flags && result.green_flags.length > 0 && (
            <ExpandableList
              title="Green Flags"
              items={result.green_flags}
              colorClass="text-green-400"
              badgeClass="bg-green-500/20 text-green-300"
            />
          )}

          {/* Red Flags */}
          {result.red_flags && result.red_flags.length > 0 && (
            <ExpandableList
              title="Red Flags"
              items={result.red_flags}
              colorClass="text-rose-400"
              badgeClass="bg-rose-500/20 text-rose-300"
            />
          )}

          {/* Negotiation Tips */}
          {result.negotiation_tips && result.negotiation_tips.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Negotiation Tips
              </div>
              <ol className="space-y-1">
                {result.negotiation_tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-indigo-400 font-medium shrink-0">{i + 1}.</span>
                    <span className="text-white/80">{tip}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Ideal Traits */}
          {result.ideal_traits && result.ideal_traits.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Ideal Traits
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.ideal_traits.map((trait, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interview Style */}
          {result.interview_style && (
            <div className="hairline rounded-lg p-3 bg-white/5">
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">
                Interview Style
              </div>
              <p className="text-sm text-white/80 italic">{result.interview_style}</p>
            </div>
          )}

          {/* Questions to Ask */}
          {result.questions_to_ask && result.questions_to_ask.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Questions to Ask
              </div>
              <ul className="space-y-1">
                {result.questions_to_ask.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-white/80">
                    <span className="text-white/30 shrink-0">•</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comp Hints */}
          {result.comp_hints && (
            <div className="hairline rounded-lg p-3 bg-indigo-500/5 border-indigo-500/20">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                Comp Hints
              </div>
              <p className="text-sm text-white/70">{result.comp_hints}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
